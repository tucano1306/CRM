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
        items: {
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
          averageOrderValue: totalOrders > 0 ? (totalRevenue._sum.totalAmount || 0) / totalOrders : 0,
        },
        ordersByStatus: [
          { status: 'PENDING', count: pendingOrders, totalAmount: 0 },
          { status: 'CONFIRMED', count: processingOrders, totalAmount: 0 },
          { status: 'COMPLETED', count: completedOrders, totalAmount: totalRevenue._sum.totalAmount || 0 },
          { status: 'CANCELED', count: cancelledOrders, totalAmount: 0 },
        ],
        recentPerformance: {
          last7Days: {
            orders: 0,
            revenue: 0,
          },
          currentMonth: {
            orders: totalOrders,
            revenue: totalRevenue._sum.totalAmount || 0,
          },
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