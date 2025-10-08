import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Reporte de ventas por período
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || 'month'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Construir filtros de fecha
    const dateFilter: any = { status: 'COMPLETED' }
    
    if (startDate && endDate) {
      dateFilter.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    } else {
      const now = new Date()
      let startPeriod = new Date()

      switch (period) {
        case 'day':
          startPeriod.setHours(0, 0, 0, 0)
          break
        case 'week':
          startPeriod.setDate(now.getDate() - 7)
          break
        case 'month':
          startPeriod.setMonth(now.getMonth() - 1)
          break
        case 'year':
          startPeriod.setFullYear(now.getFullYear() - 1)
          break
      }

      dateFilter.createdAt = { gte: startPeriod }
    }

    // Ventas totales del período
    const totalSales = await prisma.order.aggregate({
      where: dateFilter,
      _sum: { totalAmount: true },
      _count: true,
      _avg: { totalAmount: true }
    })

    // Ventas por día (últimos 30 días) - CORREGIDO
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const dailySales = await prisma.$queryRaw<Array<{
      date: Date
      orders: bigint
      revenue: number
    }>>`
      SELECT 
        DATE("createdAt") as date,
        COUNT(*)::bigint as orders,
        SUM("totalAmount")::numeric as revenue
      FROM orders
      WHERE status = 'COMPLETED' 
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date DESC
      LIMIT 30
    `

    // Ventas por seller
    const salesBySeller = await prisma.order.groupBy({
      by: ['sellerId'],
      where: dateFilter,
      _sum: { totalAmount: true },
      _count: true,
      orderBy: {
        _sum: { totalAmount: 'desc' }
      }
    })

    // Obtener info de sellers
    const sellersWithSales = await Promise.all(
      salesBySeller.map(async (sale) => {
        const seller = await prisma.seller.findUnique({
          where: { id: sale.sellerId },
          select: { id: true, name: true, email: true, commission: true }
        })

        const commission = seller?.commission 
          ? (sale._sum.totalAmount || 0) * (seller.commission / 100)
          : 0

        return {
          seller,
          totalOrders: sale._count,
          totalRevenue: sale._sum.totalAmount || 0,
          commission
        }
      })
    )

    // Ventas por cliente
    const salesByClient = await prisma.order.groupBy({
      by: ['clientId'],
      where: dateFilter,
      _sum: { totalAmount: true },
      _count: true,
      orderBy: {
        _sum: { totalAmount: 'desc' }
      },
      take: 10
    })

    // Obtener info de clientes
    const clientsWithSales = await Promise.all(
      salesByClient.map(async (sale) => {
        const client = await prisma.client.findUnique({
          where: { id: sale.clientId },
          select: { id: true, name: true, email: true }
        })

        return {
          client,
          totalOrders: sale._count,
          totalSpent: sale._sum.totalAmount || 0
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalOrders: totalSales._count,
          totalRevenue: totalSales._sum.totalAmount || 0,
          averageOrderValue: totalSales._avg.totalAmount || 0,
          period
        },
        dailySales: dailySales.map(day => ({
          date: day.date,
          orders: Number(day.orders),
          revenue: Number(day.revenue)
        })),
        topSellers: sellersWithSales.slice(0, 5),
        topClients: clientsWithSales
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener reporte de ventas' 
      },
      { status: 500 }
    )
  }
}