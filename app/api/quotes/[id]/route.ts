// app/api/quotes/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyQuoteUpdated } from '@/lib/notifications'
import logger, { LogCategory } from '@/lib/logger'
import { updateQuoteSchema, acceptQuoteSchema, rejectQuoteSchema, validateSchema } from '@/lib/validations'
import DOMPurify from 'isomorphic-dompurify'

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

    // Verificar que existe
    const existingQuote = await prisma.quote.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existingQuote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // ✅ DETERMINAR TIPO DE OPERACIÓN Y VALIDAR
    const isAccept = body.status === 'ACCEPTED'
    const isReject = body.status === 'REJECTED'
    const isStatusChange = isAccept || isReject
    
    let validation
    
    if (isAccept) {
      validation = validateSchema(acceptQuoteSchema, body)
    } else if (isReject) {
      validation = validateSchema(rejectQuoteSchema, body)
    } else {
      validation = validateSchema(updateQuoteSchema, body)
    }
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: validation.errors
      }, { status: 400 })
    }

    const validatedData = validation.data

    // No permitir editar si ya fue enviada o convertida (excepto cambio de estado por comprador)
    if (['SENT', 'ACCEPTED', 'CONVERTED'].includes(existingQuote.status) && !isStatusChange) {
      return NextResponse.json(
        { error: 'No se puede editar una cotización enviada o convertida' },
        { status: 400 }
      )
    }

    // ✅ PREPARAR DATOS DE ACTUALIZACIÓN CON SANITIZACIÓN
    const updateData: any = {}

    // Solo para updates normales (no accept/reject)
    if (!isStatusChange) {
      if ('title' in validatedData && validatedData.title !== undefined) {
        updateData.title = DOMPurify.sanitize(validatedData.title.trim())
      }
      if ('description' in validatedData && validatedData.description !== undefined) {
        updateData.description = DOMPurify.sanitize(validatedData.description.trim())
      }
      if ('validUntil' in validatedData && validatedData.validUntil !== undefined) {
        updateData.validUntil = new Date(validatedData.validUntil)
      }
      if ('notes' in validatedData && validatedData.notes !== undefined) {
        updateData.notes = DOMPurify.sanitize(validatedData.notes.trim())
      }
      if ('termsAndConditions' in validatedData && validatedData.termsAndConditions !== undefined) {
        updateData.termsAndConditions = DOMPurify.sanitize(validatedData.termsAndConditions.trim())
      }
      if ('discount' in validatedData && validatedData.discount !== undefined) {
        updateData.discount = validatedData.discount
      }
    }
    
    // Manejar cambio de estado (aceptar/rechazar por comprador)
    if (isStatusChange) {
      if ('status' in validatedData) {
        updateData.status = validatedData.status
      }
      
      // ✅ SANITIZAR REASON SI EXISTE (para reject)
      if (isReject && 'reason' in validatedData && validatedData.reason) {
        updateData.rejectionReason = DOMPurify.sanitize(validatedData.reason.trim())
      }
      
      // Crear notificación para el vendedor
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
    }

    // Si se actualizan items (solo en updates normales, no en accept/reject)
    if (!isStatusChange && 'items' in validatedData && validatedData.items && Array.isArray(validatedData.items)) {
      // Eliminar items antiguos
      await prisma.quoteItem.deleteMany({
        where: { quoteId: id }
      })

      // ✅ SANITIZAR ITEMS
      const sanitizedItems = validatedData.items.map((item: any) => ({
        ...item,
        productName: DOMPurify.sanitize(item.productName.trim()),
        description: item.description ? DOMPurify.sanitize(item.description.trim()) : undefined,
        notes: item.notes ? DOMPurify.sanitize(item.notes.trim()) : undefined
      }))

      // Calcular nuevos totales
      const subtotal = sanitizedItems.reduce((sum: number, item: any) => {
        return sum + (item.quantity * item.pricePerUnit)
      }, 0)
      
      const discount = ('discount' in validatedData && validatedData.discount) || existingQuote.discount
      const tax = (subtotal - discount) * 0.10
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
    }

    // Actualizar cotización
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true
          }
        },
        client: true
      }
    })

    // 🔔 ENVIAR NOTIFICACIÓN AL COMPRADOR sobre cambios en la cotización
    try {
      // Detectar qué cambió
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
        {
          clientId: updatedQuote.clientId,
          quoteId: id,
          changes
        }
      )
    } catch (notifError) {
      // No bloquear la respuesta si falla la notificación
      logger.error(
        LogCategory.API,
        'Error sending quote update notification',
        notifError
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedQuote,
      message: 'Cotización actualizada exitosamente'
    })
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
