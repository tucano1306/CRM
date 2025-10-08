import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Obtener clientes de un seller
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const clients = await prisma.client.findMany({
      where: { sellerId: id },
      include: {
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular estadísticas de cada cliente
    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        const orderStats = await prisma.order.aggregate({
          where: {
            clientId: client.id,
            status: 'COMPLETED'
          },
          _sum: { totalAmount: true }
        })

        return {
          ...client,
          totalSpent: orderStats._sum.totalAmount || 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: clientsWithStats,
      count: clientsWithStats.length
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener clientes del seller' 
      },
      { status: 500 }
    )
  }
}