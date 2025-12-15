// app/api/returns/[id]/complete/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { notifyCreditNoteIssued } from '@/lib/notifications'
import logger, { LogCategory } from '@/lib/logger'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'

// ✅ SCHEMA SIMPLE INLINE
const completeReturnSchema = z.object({
  restockInventory: z.boolean().default(false)
})

// Helper: Restore inventory for return items
async function restoreInventory(items: Array<{ id: string; productId: string; quantityReturned: number }>) {
  console.log('📦 [RETURNS] Restaurando inventario para', items.length, 'items')
  for (const item of items) {
    console.log(`  Incrementando stock de producto ${item.productId} en ${item.quantityReturned}`)
    await prisma.product.update({
      where: { id: item.productId },
      data: { stock: { increment: item.quantityReturned } }
    })
    await prisma.returnItem.update({
      where: { id: item.id },
      data: { restocked: true, restockedAt: new Date() }
    })
  }
  console.log('✅ [RETURNS] Inventario restaurado')
}

// Helper: Create credit note for return
async function createCreditNote(returnRecord: {
  id: string
  returnNumber: string
  clientId: string
  sellerId: string
  finalRefundAmount: any
}) {
  console.log('💳 [RETURNS COMPLETE] Creating new credit note for return:', returnRecord.id)
  const creditNoteNumber = `CN-${Date.now()}${Math.random().toString(36).substring(2, 11).toUpperCase()}`
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  console.log('💳 [RETURNS COMPLETE] Credit note data:', {
    creditNoteNumber,
    returnId: returnRecord.id,
    clientId: returnRecord.clientId,
    sellerId: returnRecord.sellerId,
    amount: returnRecord.finalRefundAmount,
    expiresAt
  })

  console.log('💾 [RETURNS COMPLETE] Executing creditNote.create...')
  const creditNote = await prisma.creditNote.create({
    data: {
      creditNoteNumber,
      returnId: returnRecord.id,
      clientId: returnRecord.clientId,
      sellerId: returnRecord.sellerId,
      amount: returnRecord.finalRefundAmount,
      balance: returnRecord.finalRefundAmount,
      expiresAt,
      notes: `Crédito generado por devolución ${returnRecord.returnNumber}`
    }
  })
  console.log('✅ [RETURNS COMPLETE] Credit note created:', creditNote.id)
  return creditNote
}

// Helper: Get or create credit note for return
async function getOrCreateCreditNote(returnRecord: {
  id: string
  returnNumber: string
  clientId: string
  sellerId: string
  finalRefundAmount: any
}) {
  console.log('💳 [RETURNS COMPLETE] Checking for existing credit note...')
  const existingCreditNote = await prisma.creditNote.findUnique({
    where: { returnId: returnRecord.id }
  })

  if (existingCreditNote) {
    console.log('ℹ️ [RETURNS COMPLETE] Credit note already exists:', existingCreditNote.id)
    return existingCreditNote
  }

  return createCreditNote(returnRecord)
}

// Helper: Send credit note notification
async function sendCreditNoteNotification(clientId: string, creditNote: { id: string; creditNoteNumber: string }, amount: number) {
  try {
    await notifyCreditNoteIssued(clientId, creditNote.id, creditNote.creditNoteNumber, amount)
    logger.info(LogCategory.API, 'Credit note notification sent to client', {
      clientId,
      creditNoteId: creditNote.id,
      creditNoteNumber: creditNote.creditNoteNumber
    })
  } catch (notifError) {
    logger.error(LogCategory.API, 'Error sending credit note notification', notifError)
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🚀 [RETURNS COMPLETE] Starting complete return process')
    const { userId } = await auth()
    if (!userId) {
      console.log('❌ [RETURNS COMPLETE] No userId')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    console.log('📋 [RETURNS COMPLETE] Return ID:', id)
    
    const body = await request.json()
    console.log('📦 [RETURNS COMPLETE] Request body:', body)

    const validation = completeReturnSchema.safeParse(body)
    if (!validation.success) {
      console.log('❌ [RETURNS COMPLETE] Validation failed:', validation.error)
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: validation.error.issues.map(i => i.message)
      }, { status: 400 })
    }

    const { restockInventory } = validation.data
    console.log('✅ [RETURNS COMPLETE] Validation passed, restockInventory:', restockInventory)

    console.log('🔍 [RETURNS COMPLETE] Fetching return record...')
    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: { items: { include: { product: true } } }
    })

    console.log('📄 [RETURNS COMPLETE] Return record:', {
      found: !!returnRecord,
      status: returnRecord?.status,
      refundType: returnRecord?.refundType,
      clientId: returnRecord?.clientId,
      sellerId: returnRecord?.sellerId,
      itemsCount: returnRecord?.items.length
    })

    if (!returnRecord) {
      console.log('❌ [RETURNS COMPLETE] Return not found')
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 })
    }

    if (returnRecord.status !== 'APPROVED') {
      console.log('❌ [RETURNS COMPLETE] Invalid status:', returnRecord.status)
      return NextResponse.json({ error: 'Solo se pueden completar devoluciones aprobadas' }, { status: 400 })
    }

    if (restockInventory) {
      await restoreInventory(returnRecord.items)
    }

    let creditNote = null
    if (returnRecord.refundType === 'CREDIT') {
      creditNote = await getOrCreateCreditNote(returnRecord)
      await sendCreditNoteNotification(returnRecord.clientId, creditNote, Number(returnRecord.finalRefundAmount))
    }

    console.log('🔄 [RETURNS COMPLETE] Updating return status to COMPLETED')
    const updatedReturn = await prisma.return.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
      include: {
        items: { include: { product: true } },
        creditNote: true,
        order: true,
        client: true
      }
    })
    
    console.log('✅ [RETURNS COMPLETE] Return completed successfully:', updatedReturn.id)

    return NextResponse.json({
      success: true,
      data: {
        return: updatedReturn,
        creditNote,
        inventoryRestored: restockInventory
      },
      message: 'Devolución completada exitosamente'
    })
  } catch (error) {
    console.error('❌ [RETURNS COMPLETE] Error completing return:', error)
    console.error('❌ [RETURNS COMPLETE] Error type:', typeof error)
    console.error('❌ [RETURNS COMPLETE] Error message:', error instanceof Error ? error.message : JSON.stringify(error))
    console.error('❌ [RETURNS COMPLETE] Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    logger.error(LogCategory.API, 'Error completing return', error)
    
    return NextResponse.json({ 
      error: 'Error al completar devolución',
      message: error instanceof Error ? error.message : 'Error desconocido',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
