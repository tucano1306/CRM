// app/api/returns/[id]/complete/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { notifyCreditNoteIssued } from '@/lib/notifications'
import logger, { LogCategory } from '@/lib/logger'
import { z } from 'zod'

const prisma = new PrismaClient()

// ✅ SCHEMA SIMPLE INLINE
const completeReturnSchema = z.object({
  restockInventory: z.boolean().default(false)
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // ✅ VALIDACIÓN
    const validation = completeReturnSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: validation.error.issues.map(i => i.message)
      }, { status: 400 })
    }

    const { restockInventory } = validation.data

    // Verificar que existe
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

    if (!returnRecord) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 })
    }

    if (returnRecord.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Solo se pueden completar devoluciones aprobadas' }, { status: 400 })
    }

    // Si se debe restaurar inventario
    if (restockInventory) {
      for (const item of returnRecord.items) {
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
    }

    // Si el tipo es CREDIT, crear nota de crédito
    let creditNote = null
    if (returnRecord.refundType === 'CREDIT') {
      const creditNoteNumber = `CN-${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      
      // Expira en 1 año
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)

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

      // 🔔 ENVIAR NOTIFICACIÓN AL COMPRADOR sobre emisión de nota de crédito
      try {
        await notifyCreditNoteIssued(
          returnRecord.clientId,
          creditNote.id,
          creditNoteNumber,
          Number(returnRecord.finalRefundAmount)
        )
        
        logger.info(
          LogCategory.API,
          'Credit note notification sent to client',
          {
            clientId: returnRecord.clientId,
            creditNoteId: creditNote.id,
            creditNoteNumber
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
    const updatedReturn = await prisma.return.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      },
      include: {
        items: true,
        creditNote: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        return: updatedReturn,
        creditNote,
        inventoryRestored: body.restockInventory
      },
      message: 'Devolución completada exitosamente'
    })
  } catch (error) {
    console.error('Error completing return:', error)
    return NextResponse.json({ error: 'Error al completar devolución' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
