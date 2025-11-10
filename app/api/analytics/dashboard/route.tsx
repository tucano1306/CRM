import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getSeller, UnauthorizedError, handleAuthError } from '@/lib/auth-helpers';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 🔒 SEGURIDAD: Validar que es vendedor y obtener su ID
    const seller = await getSeller(userId);

    // 🔒 SEGURIDAD: Obtener estadísticas SOLO del vendedor autenticado
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
      // Total de órdenes DEL VENDEDOR
      prisma.order.count({
        where: { sellerId: seller.id }
      }),
      
      // Órdenes pendientes DEL VENDEDOR
      prisma.order.count({
        where: { 
          status: 'PENDING',
          sellerId: seller.id
        },
      }),
      
      // Órdenes en proceso DEL VENDEDOR
      prisma.order.count({
        where: { 
          status: 'CONFIRMED',
          sellerId: seller.id
        },
      }),
      
      // Órdenes completadas DEL VENDEDOR
      prisma.order.count({
        where: { 
          status: 'COMPLETED',
          sellerId: seller.id
        },
      }),
      
      // Órdenes canceladas DEL VENDEDOR
      prisma.order.count({
        where: { 
          status: 'CANCELED',
          sellerId: seller.id
        },
      }),
      
      // Ingresos totales DEL VENDEDOR (solo órdenes completadas)
      prisma.order.aggregate({
        where: { 
          status: 'COMPLETED',
          sellerId: seller.id
        },
        _sum: { totalAmount: true },
      }),
      
      // Total de productos DEL VENDEDOR
      prisma.product.count({
        where: { 
          isActive: true,
          sellers: {
            some: {
              sellerId: seller.id
            }
          }
        },
      }),
      
      // Productos con stock bajo DEL VENDEDOR (menos de 10)
      prisma.product.count({
        where: {
          stock: { lt: 10 },
          isActive: true,
          sellers: {
            some: {
              sellerId: seller.id
            }
          }
        },
      }),
    ]);

    // 🔒 SEGURIDAD: Obtener estadísticas diarias de los últimos 7 días DEL VENDEDOR
    const last7DaysDate = new Date();
    last7DaysDate.setDate(last7DaysDate.getDate() - 7);

    const dailyOrders = await prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        status: 'COMPLETED',
        sellerId: seller.id,  // ← FILTRO OBLIGATORIO
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

    const dailyStats = dailyOrders.map((day) => ({
      date: day.createdAt.toISOString().split('T')[0],
      orders: day._count.id,
      revenue: Number(day._sum.totalAmount || 0)
    }));

    // 🔒 SEGURIDAD: Órdenes recientes DEL VENDEDOR (últimas 5)
    const recentOrders = await prisma.order.findMany({
      where: {
        sellerId: seller.id  // ← FILTRO OBLIGATORIO
      },
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

    // 🔒 SEGURIDAD: Productos más vendidos DEL VENDEDOR
    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: {
          sellerId: seller.id  // ← FILTRO OBLIGATORIO
        }
      },
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
            orders: dailyStats.reduce((acc: number, day: { orders: number }) => acc + day.orders, 0),
            revenue: dailyStats.reduce((acc: number, day: { revenue: number }) => acc + day.revenue, 0),
          },
          currentMonth: {
            orders: totalOrders,
            revenue: totalRevenue._sum.totalAmount || 0,
          },
          dailyStats: dailyStats  // ✅ Agregar esto
        },
        topProducts: topProducts.map((p) => ({
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
    
    // 🔒 SEGURIDAD: Manejar errores de autorización
    if (error instanceof UnauthorizedError) {
      const authError = await handleAuthError(error);
      return NextResponse.json(
        { error: authError.error },
        { status: authError.statusCode }
      );
    }
    
    return NextResponse.json(
      { error: 'Error obteniendo analytics del dashboard' },
      { status: 500 }
    );
  } finally {
    // Usamos el singleton de prisma; no desconectamos manualmente en cada request.
  }
}