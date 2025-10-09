import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Estadísticas completas del dashboard
export async function GET(request: NextRequest) {
  try {
    // Obtener totales generales
    const [
      totalClients,
      totalProducts,
      totalSellers,
      totalOrders,
      pendingOrders,
      completedOrders,
      canceledOrders
    ] = await Promise.all([
      prisma.client.count(),
      prisma.product.count(),
      prisma.seller.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count({ where: { status: 'CANCELED' } })
    ])

    // Ingresos totales
    const revenueData = await prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _sum: { totalAmount: true }
    })

    // Órdenes por estado
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
      _sum: { totalAmount: true }
    })

    // Productos con bajo stock (menos de 10)
    const lowStockProducts = await prisma.product.count({
      where: {
        stock: { lt: 10 },
        isActive: true
      }
    })

    // Clientes activos (con al menos una orden)
    const activeClients = await prisma.client.count({
      where: {
        orders: {
          some: {}
        }
      }
    })

    // Ventas de los últimos 7 días
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentSales = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: sevenDaysAgo }
      },
      _sum: { totalAmount: true },
      _count: true
    })

    // Ventas del mes actual
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const monthSales = await prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startOfMonth }
      },
      _sum: { totalAmount: true },
      _count: true
    })

    // Top 5 productos más vendidos
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: { status: 'COMPLETED' }
      },
      _sum: { quantity: true, subtotal: true },
      _count: true,
      orderBy: {
        _sum: { quantity: 'desc' }
      },
      take: 5
    })

    // Promedio de orden
    const avgOrder = await prisma.order.aggregate({
      where: { status: 'COMPLETED' },
      _avg: { totalAmount: true }
    })

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalClients,
          activeClients,
          totalProducts,
          lowStockProducts,
          totalSellers,
          totalOrders,
          pendingOrders,
          completedOrders,
          canceledOrders,
          totalRevenue: revenueData._sum.totalAmount || 0,
          averageOrderValue: avgOrder._avg.totalAmount || 0
        },
        ordersByStatus: ordersByStatus.map(item => ({
          status: item.status,
          count: item._count,
          totalAmount: item._sum.totalAmount || 0
        })),
        recentPerformance: {
          last7Days: {
            orders: recentSales._count,
            revenue: recentSales._sum.totalAmount || 0
          },
          currentMonth: {
            orders: monthSales._count,
            revenue: monthSales._sum.totalAmount || 0
          }
        },
        topProducts: topProducts.map(item => ({
          productId: item.productId,
          productName: item.productName,
          totalSold: item._sum.quantity || 0,
          totalRevenue: item._sum.subtotal || 0,
          ordersCount: item._count
        }))
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener estadísticas del dashboard' 
      },
      { status: 500 }
    )
  }
}