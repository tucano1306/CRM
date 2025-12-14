import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// POST /api/orders/[id]/items/bulk/confirm - Confirmar múltiples items a la vez
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = await request.json()
    const { itemIds, confirmed = true } = body

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'Se requiere un array de itemIds' }, { status: 400 })
    }

    // Verificar que el vendedor sea dueño de la orden
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: { sellers: true }
    })

    if (!authUser || authUser.sellers.length === 0) {
      return NextResponse.json({ error: 'Usuario no es un vendedor' }, { status: 403 })
    }

    const sellerId = authUser.sellers[0].id

    // Obtener la orden
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: sellerId
      },
      include: {
        orderItems: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Actualizar todos los items
    const result = await prisma.orderItem.updateMany({
      where: {
        id: { in: itemIds },
        orderId: orderId
      },
      data: {
        confirmed: confirmed,
        issueNote: confirmed ? null : undefined
      }
    })

    // Si se confirmaron items, actualizar availableQty de cada uno
    if (confirmed) {
      for (const itemId of itemIds) {
        const item = order.orderItems.find(i => i.id === itemId)
        if (item) {
          await prisma.orderItem.update({
            where: { id: itemId },
            data: { availableQty: item.quantity }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${result.count} productos ${confirmed ? 'confirmados' : 'actualizados'}`,
      count: result.count
    })

  } catch (error) {
    console.error('Error confirming order items:', error)
    return NextResponse.json(
      { error: 'Error al confirmar los productos: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
