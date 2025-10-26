import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener items de una orden
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const items = await prisma.orderItem.findMany({
      where: { orderId: id },
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

    // Calcular totales - Convertir Decimal a número
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * Number(item.pricePerUnit)), 0)

    return NextResponse.json({
      success: true,
      data: items,
      summary: {
        totalItems: items.length,
        totalQuantity,
        totalAmount: Number(totalAmount.toFixed(2)),
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