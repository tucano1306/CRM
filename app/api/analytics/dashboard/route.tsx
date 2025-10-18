import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener estadísticas generales
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
      totalRevenue,
      totalProducts,
      lowStockProducts,
    ] = await Promise.all([
      // Total de órdenes
      prisma.order.count(),
      
      // Órdenes pendientes
      prisma.order.count({
        where: { status: 'PENDING' },
      }),
      
      // Órdenes en proceso
      prisma.order.count({
        where: { status: 'CONFIRMED' },
      }),
      
      // Órdenes completadas
      prisma.order.count({
        where: { status: 'COMPLETED' },
      }),
      
      // Órdenes canceladas
      prisma.order.count({
        where: { status: 'CANCELED' },
      }),
      
      // Ingresos totales (solo órdenes completadas)
      prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { totalAmount: true },
      }),
      
      // Total de productos
      prisma.product.count({
        where: { isActive: true },
      }),
      
      // Productos con stock bajo (menos de 10)
      prisma.product.count({
        where: {
          stock: { lt: 10 },
          isActive: true,
        },
      }),
    ]);

    // Obtener estadísticas diarias de los últimos 7 días
    const last7DaysDate = new Date();
    last7DaysDate.setDate(last7DaysDate.getDate() - 7);

    const dailyOrders = await prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: last7DaysDate
        }
      },
      _sum: {
        totalAmount: true
      },
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const dailyStats = dailyOrders.map(day => ({
      date: day.createdAt.toISOString().split('T')[0],
      orders: day._count.id,
      revenue: Number(day._sum.totalAmount || 0)
    }));

    // Órdenes recientes (últimas 5)
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: {
            name: true,
            email: true,
          },
        },
        orderItems: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Productos más vendidos
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 5,
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalOrders,
          pendingOrders,
          processingOrders,
          completedOrders,
          canceledOrders: cancelledOrders, // Nota: se usa canceledOrders (con una L)
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          totalProducts,
          lowStockProducts,
          totalClients: 0, // Agregado según el primer código
          activeClients: 0, // Agregado según el primer código
          totalSellers: 0, // Agregado según el primer código
         averageOrderValue: totalOrders > 0 ? Number(totalRevenue._sum.totalAmount || 0) / totalOrders : 0,
        },
        ordersByStatus: [
          { status: 'PENDING', count: pendingOrders, totalAmount: 0 },
          { status: 'CONFIRMED', count: processingOrders, totalAmount: 0 },
          { status: 'COMPLETED', count: completedOrders, totalAmount: totalRevenue._sum.totalAmount || 0 },
          { status: 'CANCELED', count: cancelledOrders, totalAmount: 0 },
        ],
        recentPerformance: {
          last7Days: {
            orders: dailyStats.reduce((acc, day) => acc + day.orders, 0),
            revenue: dailyStats.reduce((acc, day) => acc + day.revenue, 0),
          },
          currentMonth: {
            orders: totalOrders,
            revenue: totalRevenue._sum.totalAmount || 0,
          },
          dailyStats: dailyStats  // ✅ Agregar esto
        },
        topProducts: topProducts.map(p => ({
          productId: p.productId,
          productName: p.productName,
          totalSold: p._sum.quantity || 0,
          totalRevenue: p._sum.subtotal || 0,
          ordersCount: 0,
        })),
        summary: {
          totalOrders,
          pendingOrders,
          processingOrders,
          completedOrders,
          cancelledOrders,
          totalRevenue: totalRevenue._sum.totalAmount || 0,
          totalProducts,
          lowStockProducts,
        },
        recentOrders,
      },
    });
  } catch (error) {
    console.error('Error obteniendo analytics del dashboard:', error);
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}