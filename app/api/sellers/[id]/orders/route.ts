import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache, CACHE_CONFIGS } from '@/lib/apiCache'



// GET - Obtener órdenes de un seller
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    const where: any = { sellerId: id }
    if (status) {
      where.status = status
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true
              }
            }
          }
        },
        _count: {
          select: { orderItems: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular totales por estado
    const statusSummary = await prisma.order.groupBy({
      by: ['status'],
      where: { sellerId: id },
      _count: true,
      _sum: { totalAmount: true }
    })

    const response = NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
      summary: statusSummary.map(s => ({
        status: s.status,
        count: s._count,
        totalAmount: s._sum.totalAmount || 0
      }))
    })

    // 🚀 CACHE: Orders API con cache user-specific (órdenes cambian frecuentemente)
    return withCache(response, CACHE_CONFIGS.USER_SPECIFIC)
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener órdenes del seller' 
      },
      { status: 500 }
    )
  }
}