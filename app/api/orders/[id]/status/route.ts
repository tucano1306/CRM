import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient, OrderStatus } from '@prisma/client'

const prisma = new PrismaClient()

// PATCH /api/orders/[id]/status - Actualizar estado de orden
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { status } = await request.json()

    // Validar que el estado sea válido
    const validStatuses = [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY_FOR_PICKUP',
      'IN_DELIVERY',
      'DELIVERED',
      'PARTIALLY_DELIVERED',
      'COMPLETED',
      'CANCELED',
      'PAYMENT_PENDING',
      'PAID'
    ]

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      )
    }

    // Actualizar el estado de la orden
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { status: status as OrderStatus },
      include: {
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            businessName: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Estado actualizado correctamente'
    })
  } catch (error) {
    console.error('Error actualizando estado de orden:', error)
    return NextResponse.json(
      { error: 'Error actualizando el estado' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
