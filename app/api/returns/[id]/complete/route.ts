// app/api/returns/[id]/complete/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    if (body.restockInventory) {
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
