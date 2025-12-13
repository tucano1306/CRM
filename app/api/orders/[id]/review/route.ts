/**
 * POST /api/orders/[id]/review
 * Vendedor inicia la revisión del pedido
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId } = await params

    // Verificar que el usuario es vendedor de esta orden
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        seller: {
          include: {
            authenticated_users: { select: { authId: true } }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const isOrderSeller = order.seller.authenticated_users.some(u => u.authId === userId)
    if (!isOrderSeller) {
      return NextResponse.json({ error: 'No tienes permiso' }, { status: 403 })
    }

    // Solo se puede revisar si está en PENDING
    if (order.status !== 'PENDING') {
      return NextResponse.json({
        error: `La orden ya está en estado ${order.status}`
      }, { status: 400 })
    }

    // Actualizar a REVIEWING
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'REVIEWING',
        reviewStartedAt: new Date()
      }
    })

    // Crear historial
    await prisma.orderStatusHistory.create({
      data: {
        orderId: orderId,
        previousStatus: 'PENDING',
        newStatus: 'REVIEWING',
        changedBy: userId,
        changedByName: order.seller.name,
        changedByRole: 'SELLER',
        notes: 'Vendedor inició revisión del pedido'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Revisión iniciada',
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        reviewStartedAt: updatedOrder.reviewStartedAt
      }
    })

  } catch (error) {
    console.error('Error en POST /api/orders/[id]/review:', error)
    return NextResponse.json(
      { error: 'Error al iniciar revisión' },
      { status: 500 }
    )
  }
}
