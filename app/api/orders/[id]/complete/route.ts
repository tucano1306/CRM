import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// POST - Completar orden y actualizar stock
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar que la orden existe
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true
          }
        }
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

    // Solo se pueden completar órdenes CONFIRMED
    if (order.status !== 'CONFIRMED') {
      return NextResponse.json(
        { 
          success: false,
          error: `Solo se pueden completar órdenes confirmadas. Estado actual: ${order.status}` 
        },
        { status: 400 }
      )
    }

    // Verificar stock disponible antes de completar
    for (const item of order.items) {
      if (item.product.stock < item.quantity) {
        return NextResponse.json(
          { 
            success: false,
            error: `Stock insuficiente para ${item.product.name}. Disponible: ${item.product.stock}, Requerido: ${item.quantity}` 
          },
          { status: 400 }
        )
      }
    }

    // Usar transacción para actualizar stock y completar orden
    const completedOrder = await prisma.$transaction(async (tx) => {
      // Reducir stock de cada producto
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        })
      }

      // Actualizar estado de la orden
      return await tx.order.update({
        where: { id: params.id },
        data: { status: 'COMPLETED' },
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
    })

    return NextResponse.json({
      success: true,
      message: 'Orden completada exitosamente. Stock actualizado.',
      data: completedOrder
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al completar orden' 
      },
      { status: 500 }
    )
  }
}