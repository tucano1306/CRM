import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// GET - Análisis de clientes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '10');

    // Top clientes por gasto total
    const topClientsBySpending = await prisma.order.groupBy({
      by: ['clientId'],
      where: { status: 'COMPLETED' },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: {
        _sum: { totalAmount: 'desc' }
      },
      take: limit
    });

    // Obtener detalles de top clientes
    const topClientsWithDetails = await Promise.all(
      topClientsBySpending
        .filter((item): item is typeof item & { clientId: string } => item.clientId !== null)
        .map(async (item) => {
          const client = await prisma.client.findUnique({
            where: { id: item.clientId as string },
            select: {
              id: true,
              name: true,
              businessName: true,
              email: true,
              phone: true,
              address: true,
              createdAt: true,
              seller: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          });

          const lastOrder = await prisma.order.findFirst({
            where: { clientId: item.clientId as string },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              createdAt: true,
              status: true
            }
          });

          return {
            client,
            stats: {
              totalOrders: item._count,
              totalSpent: Number(item._sum.totalAmount || 0),
              averageOrderValue: item._sum.totalAmount 
                ? Number((Number(item._sum.totalAmount) / Number(item._count)).toFixed(2))
                : 0,
              lastOrderDate: lastOrder?.createdAt,
              lastOrderStatus: lastOrder?.status
            }
          };
        })
    );

    // Clientes más frecuentes (por número de órdenes)
    const topClientsByFrequency = await prisma.order.groupBy({
      by: ['clientId'],
      _count: true,
      orderBy: {
        _count: { clientId: 'desc' }
      },
      take: limit
    });

    const frequentClientsWithDetails = await Promise.all(
      topClientsByFrequency
        .filter((item): item is typeof item & { clientId: string } => item.clientId !== null)
        .map(async (item) => {
          const client = await prisma.client.findUnique({
            where: { id: item.clientId as string },
            select: {
              id: true,
              name: true,
              email: true
            }
          });

          return {
            client,
            ordersCount: item._count
          };
        })
    );

    // Clientes nuevos (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const newClients = await prisma.client.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        _count: {
          select: { orders: true }
        }
      }
    });

    // Clientes inactivos (sin órdenes en últimos 30 días)
    const inactiveClients = await prisma.client.findMany({
      where: {
        orders: {
          none: {
            createdAt: { gte: thirtyDaysAgo }
          }
        }
      },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    // Resumen general
    const clientSummary = await prisma.client.aggregate({
      _count: true
    });

    const clientsWithOrders = await prisma.client.count({
      where: {
        orders: { some: {} }
      }
    });

    // Tasa de retención (clientes con más de 1 orden)
    const returningClients = await prisma.client.count({
      where: {
        orders: { some: {} }
      }
    });

    const clientsWithMultipleOrders = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(DISTINCT "clientId")::bigint as count
      FROM orders
      GROUP BY "clientId"
      HAVING COUNT(*) > 1
    `;

    const retentionRate = returningClients > 0
      ? (Number(clientsWithMultipleOrders[0]?.count || 0) / returningClients) * 100
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalClients: clientSummary._count,
          activeClients: clientsWithOrders,
          newClientsLast30Days: newClients.length,
          inactiveClients: inactiveClients.length,
          retentionRate: Math.round(retentionRate * 100) / 100
        },
        topBySpending: topClientsWithDetails,
        topByFrequency: frequentClientsWithDetails,
        newClients,
        inactiveClients
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener análisis de clientes' 
      },
      { status: 500 }
    );
  }
}