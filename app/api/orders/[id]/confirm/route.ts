import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'




// POST - Confirmar orden
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar que la orden existe
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Orden no encontrada' 
        },
        { status: 404 }
      )
    }

    // Solo se pueden confirmar órdenes PENDING o PLACED
    if (order.status !== 'PENDING' && order.status !== 'PLACED') {
      return NextResponse.json(
        { 
          success: false,
          error: `No se puede confirmar una orden con estado ${order.status}` 
        },
        { status: 400 }
      )
    }

    // Confirmar todos los items
    await prisma.orderItem.updateMany({
      where: { orderId: params.id },
      data: { confirmed: true }
    })

    // Actualizar estado de la orden
    const confirmedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { status: 'CONFIRMED' },
      include: {
        client: true,
        seller: true,
        items: {
          include: {
            product: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Orden confirmada exitosamente',
      data: confirmedOrder
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al confirmar orden' 
      },
      { status: 500 }
    )
  }
}