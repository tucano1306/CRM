import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Obtener items de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const items = await prisma.orderItem.findMany({
      where: { orderId: params.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            unit: true,
            price: true,
            stock: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Calcular totales
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.pricePerUnit), 0)

    return NextResponse.json({
      success: true,
      data: items,
      summary: {
        totalItems: items.length,
        totalQuantity,
        totalAmount,
        confirmedItems: items.filter(item => item.confirmed).length
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener items de la orden' 
      },
      { status: 500 }
    )
  }
}