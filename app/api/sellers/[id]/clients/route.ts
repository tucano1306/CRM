import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache, CACHE_CONFIGS } from '@/lib/apiCache'



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

    const response = NextResponse.json({
      success: true,
      data: clientsWithStats,
      count: clientsWithStats.length
    })

    // 🚀 CACHE: Clients API con cache dinámico (clientes cambian pero no tanto como órdenes)
    return withCache(response, CACHE_CONFIGS.DYNAMIC)
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