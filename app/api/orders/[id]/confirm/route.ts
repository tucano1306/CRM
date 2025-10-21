import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'

/**
 * POST /api/orders/[id]/confirm
 * Confirmar manualmente una orden (PENDING → PLACED)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const orderId = params.id

    // Buscar la orden
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        seller: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que esté en PENDING
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: `La orden está en estado ${order.status}, no se puede confirmar` },
        { status: 400 }
      )
    }

    const now = new Date()

    // Actualizar orden a PLACED
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PLACED',
        confirmedAt: now,
        updatedAt: now,
      },
      include: {
        orderItems: true,
        client: true,
        seller: true,
      },
    })

    // Registrar actualización de estado
    await prisma.orderStatusUpdate.create({
      data: {
        orderId: orderId,
        oldStatus: 'PENDING',
        newStatus: 'PLACED',
        idempotencyKey: `manual-confirm-${orderId}-${now.getTime()}`,
      },
    })

    console.log(`✅ Orden ${order.orderNumber} confirmada manualmente por ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Orden confirmada exitosamente',
      order: updatedOrder,
    })
  } catch (error) {
    console.error('Error confirmando orden:', error)
    return NextResponse.json(
      { error: 'Error confirmando orden: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
