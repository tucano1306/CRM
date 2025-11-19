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

    // ✅ VALIDACIÓN
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

    // Verificar que existe
    console.log('🔍 [RETURNS COMPLETE] Fetching return record...')
    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: { 
        items: {
          include: {
            product: true
          }
        }
      }
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

    // Si se debe restaurar inventario
    if (restockInventory) {
      console.log('📦 [RETURNS] Restaurando inventario para', returnRecord.items.length, 'items')
      for (const item of returnRecord.items) {
        console.log(`  Incrementando stock de producto ${item.productId} en ${item.quantityReturned}`)
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantityReturned
            }
          }
        })

        await prisma.returnItem.update({
          where: { id: item.id },
          data: {
            restocked: true,
            restockedAt: new Date()
          }
        })
      }
      console.log('✅ [RETURNS] Inventario restaurado')
    }

    // Si el tipo es CREDIT, crear nota de crédito
    let creditNote = null
    if (returnRecord.refundType === 'CREDIT') {
      console.log('💳 [RETURNS COMPLETE] Checking for existing credit note...')
      
      // Verificar si ya existe una nota de crédito
      const existingCreditNote = await prisma.creditNote.findUnique({
        where: { returnId: returnRecord.id }
      })

      if (existingCreditNote) {
        console.log('ℹ️ [RETURNS COMPLETE] Credit note already exists:', existingCreditNote.id)
        creditNote = existingCreditNote
      } else {
        console.log('💳 [RETURNS COMPLETE] Creating new credit note for return:', id)
        const creditNoteNumber = `CN-${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        
        // Expira en 1 año
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

        try {
          console.log('💾 [RETURNS COMPLETE] Executing creditNote.create...')
          creditNote = await prisma.creditNote.create({
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
        } catch (creditError) {
          console.error('❌ [RETURNS COMPLETE] Error creating credit note:', creditError)
          throw creditError
        }
      }

      // 🔔 ENVIAR NOTIFICACIÓN AL COMPRADOR sobre emisión de nota de crédito
      try {
        await notifyCreditNoteIssued(
          returnRecord.clientId,
          creditNote.id,
          creditNote.creditNoteNumber,
          Number(returnRecord.finalRefundAmount)
        )
        
        logger.info(
          LogCategory.API,
          'Credit note notification sent to client',
          {
            clientId: returnRecord.clientId,
            creditNoteId: creditNote.id,
            creditNoteNumber: creditNote.creditNoteNumber
          }
        )
      } catch (notifError) {
        // No bloquear la respuesta si falla la notificación
        logger.error(
          LogCategory.API,
          'Error sending credit note notification',
          notifError
        )
      }
    }

    // Actualizar estado
    console.log('🔄 [RETURNS COMPLETE] Updating return status to COMPLETED')
    try {
      const updatedReturn = await prisma.return.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
        },
        include: {
          items: {
            include: {
              product: true
            }
          },
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
    } catch (updateError) {
      console.error('❌ [RETURNS COMPLETE] Error updating return status:', updateError)
      throw updateError
    }
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
  } finally {
    // prisma singleton
  }
}
