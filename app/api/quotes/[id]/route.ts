// app/api/quotes/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyQuoteUpdated } from '@/lib/notifications'
import logger, { LogCategory } from '@/lib/logger'
import { updateQuoteSchema, acceptQuoteSchema, rejectQuoteSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'

// ============================================================================
// Types
// ============================================================================

interface ValidationResult {
  success: boolean
  data?: any
  errors?: any
}

interface QuoteUpdateData {
  [key: string]: any
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine operation type and validate request body
 */
function validateQuoteRequest(body: any): ValidationResult {
  const isAccept = body.status === 'ACCEPTED'
  const isReject = body.status === 'REJECTED'
  
  let validation
  if (isAccept) {
    validation = validateSchema(acceptQuoteSchema, body)
  } else if (isReject) {
    validation = validateSchema(rejectQuoteSchema, body)
  } else {
    validation = validateSchema(updateQuoteSchema, body)
  }
  
  return validation
}

/**
 * Check if the operation is a status change (accept/reject)
 */
function isStatusChangeOperation(body: any): boolean {
  return body.status === 'ACCEPTED' || body.status === 'REJECTED'
}

/**
 * Build update data for regular quote updates (non-status changes)
 */
function buildRegularUpdateData(validatedData: any): QuoteUpdateData {
  const updateData: QuoteUpdateData = {}
  
  if ('title' in validatedData && validatedData.title !== undefined) {
    updateData.title = sanitizeText(validatedData.title)
  }
  if ('description' in validatedData && validatedData.description !== undefined) {
    updateData.description = sanitizeText(validatedData.description)
  }
  if ('validUntil' in validatedData && validatedData.validUntil !== undefined) {
    updateData.validUntil = new Date(validatedData.validUntil)
  }
  if ('notes' in validatedData && validatedData.notes !== undefined) {
    updateData.notes = sanitizeText(validatedData.notes)
  }
  if ('termsAndConditions' in validatedData && validatedData.termsAndConditions !== undefined) {
    updateData.termsAndConditions = sanitizeText(validatedData.termsAndConditions)
  }
  if ('discount' in validatedData && validatedData.discount !== undefined) {
    updateData.discount = validatedData.discount
  }
  
  return updateData
}

/**
 * Build update data for status changes (accept/reject)
 */
async function buildStatusChangeUpdateData(
  validatedData: any,
  existingQuote: any,
  isAccept: boolean,
  isReject: boolean
): Promise<QuoteUpdateData> {
  const updateData: QuoteUpdateData = {}
  
  if ('status' in validatedData) {
    updateData.status = validatedData.status
  }
  
  if (isReject && 'reason' in validatedData && validatedData.reason) {
    updateData.rejectionReason = sanitizeText(validatedData.reason)
  }
  
  // Create notification for seller
  if (existingQuote.sellerId) {
    const statusMessage = isAccept 
      ? `✅ ha aceptado la cotización #${existingQuote.quoteNumber} por $${existingQuote.totalAmount.toFixed(2)}`
      : `❌ ha rechazado la cotización #${existingQuote.quoteNumber}`
    
    await prisma.notification.create({
      data: {
        type: isAccept ? 'QUOTE_ACCEPTED' : 'QUOTE_REJECTED',
        title: isAccept ? '✅ Cotización Aceptada' : '❌ Cotización Rechazada',
        message: `El cliente ${statusMessage}`,
        sellerId: existingQuote.sellerId,
        relatedId: existingQuote.id,
        isRead: false
      }
    })
  }
  
  return updateData
}

/**
 * Sanitize quote items
 */
function sanitizeQuoteItems(items: any[]): any[] {
  return items.map((item: any) => ({
    ...item,
    productName: sanitizeText(item.productName),
    description: item.description ? sanitizeText(item.description) : undefined,
    notes: item.notes ? sanitizeText(item.notes) : undefined
  }))
}

/**
 * Process items update and calculate totals
 */
async function processItemsUpdate(
  quoteId: string,
  validatedData: any,
  existingQuote: any,
  updateData: QuoteUpdateData
): Promise<QuoteUpdateData> {
  // Delete old items
  await prisma.quoteItem.deleteMany({ where: { quoteId } })

  const sanitizedItems = sanitizeQuoteItems(validatedData.items)

  // Calculate new totals
  const subtotal = sanitizedItems.reduce((sum: number, item: any) => {
    return sum + (item.quantity * item.pricePerUnit)
  }, 0)
  
  const discount = ('discount' in validatedData && validatedData.discount) || existingQuote.discount
  const tax = (subtotal - discount) * 0.1
  const totalAmount = subtotal - discount + tax

  updateData.subtotal = subtotal
  updateData.tax = tax
  updateData.totalAmount = totalAmount

  updateData.items = {
    create: sanitizedItems.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      description: item.description,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      discount: item.discount || 0,
      subtotal: item.quantity * item.pricePerUnit,
      notes: item.notes
    }))
  }

  return updateData
}

/**
 * Detect changes and send notification
 */
async function sendQuoteUpdateNotification(
  body: any,
  updatedQuote: any,
  quoteId: string
): Promise<void> {
  const changes: string[] = []
  if (body.title !== undefined) changes.push('Título modificado')
  if (body.validUntil !== undefined) changes.push('Fecha de validez actualizada')
  if (body.items) changes.push('Items actualizados')
  if (body.discount !== undefined) changes.push('Descuento modificado')
  
  await notifyQuoteUpdated(
    updatedQuote.clientId,
    updatedQuote.id,
    updatedQuote.quoteNumber,
    changes.length > 0 ? changes : ['Cotización actualizada']
  )
  
  logger.info(
    LogCategory.API,
    'Quote update notification sent to client',
    { clientId: updatedQuote.clientId, quoteId, changes }
  )
}

// ============================================================================
// Main Route Handlers
// ============================================================================

// GET - Obtener cotización específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        client: true,
        seller: true,
        convertedOrder: true
      }
    })

    if (!quote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: quote })
  } catch (error) {
    console.error('Error fetching quote:', error)
    return NextResponse.json({ error: 'Error al obtener cotización' }, { status: 500 })
  }
}

/**
 * Check if quote can be edited based on status
 */
function canEditQuote(status: string, isStatusChange: boolean): boolean {
  const nonEditableStatuses = ['SENT', 'ACCEPTED', 'CONVERTED']
  return isStatusChange || !nonEditableStatuses.includes(status)
}

/**
 * Build full update data based on operation type
 */
async function buildQuoteUpdateData(
  quoteId: string,
  body: any,
  validatedData: any,
  existingQuote: any
): Promise<QuoteUpdateData> {
  const isStatusChange = isStatusChangeOperation(body)
  const isAccept = body.status === 'ACCEPTED'
  const isReject = body.status === 'REJECTED'

  if (isStatusChange) {
    return buildStatusChangeUpdateData(validatedData, existingQuote, isAccept, isReject)
  }

  let updateData = buildRegularUpdateData(validatedData)

  const hasItems = 'items' in validatedData && validatedData.items && Array.isArray(validatedData.items)
  if (hasItems) {
    updateData = await processItemsUpdate(quoteId, validatedData, existingQuote, updateData)
  }

  return updateData
}

// PATCH - Actualizar cotización
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existingQuote = await prisma.quote.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existingQuote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const validation = validateQuoteRequest(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: validation.errors }, { status: 400 })
    }

    const isStatusChange = isStatusChangeOperation(body)
    if (!canEditQuote(existingQuote.status, isStatusChange)) {
      return NextResponse.json(
        { error: 'No se puede editar una cotización enviada o convertida' },
        { status: 400 }
      )
    }

    const updateData = await buildQuoteUpdateData(id, body, validation.data, existingQuote)

    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: { items: { include: { product: true } }, client: true }
    })

    try {
      await sendQuoteUpdateNotification(body, updatedQuote, id)
    } catch (notifError) {
      logger.error(LogCategory.API, 'Error sending quote update notification', notifError)
    }

    return NextResponse.json({ success: true, data: updatedQuote, message: 'Cotización actualizada exitosamente' })
  } catch (error) {
    console.error('Error updating quote:', error)
    return NextResponse.json({ error: 'Error al actualizar cotización' }, { status: 500 })
  }
}

// DELETE - Eliminar cotización
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que existe
    const existingQuote = await prisma.quote.findUnique({
      where: { id }
    })

    if (!existingQuote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // No permitir eliminar si ya fue convertida
    if (existingQuote.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'No se puede eliminar una cotización convertida en orden' },
        { status: 400 }
      )
    }

    // Eliminar cotización (los items se eliminan en cascada)
    await prisma.quote.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Cotización eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return NextResponse.json({ error: 'Error al eliminar cotización' }, { status: 500 })
  }
}
