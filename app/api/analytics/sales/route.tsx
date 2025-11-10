import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'

    // Calcular fechas según el periodo
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Obtener órdenes del periodo
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
        status: {
          in: ["COMPLETED", "CONFIRMED", "DELIVERED", "PENDING", "PREPARING", "READY_FOR_PICKUP", "IN_DELIVERY"]
        }
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    // Agrupar por día
    const dailySalesMap = new Map<string, { orders: number; revenue: number }>()

    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0]
      
      if (!dailySalesMap.has(dateKey)) {
        dailySalesMap.set(dateKey, { orders: 0, revenue: 0 })
      }

      const daySales = dailySalesMap.get(dateKey)!
      daySales.orders += 1
      daySales.revenue += Number(order.totalAmount) // ✅ CORREGIDO
    })

    // Convertir a array ordenado
    const dailySales = Array.from(dailySalesMap.entries())
      .map(([date, data]) => ({
        date,
        orders: data.orders,
        revenue: Number(data.revenue.toFixed(2)), // ✅ CORREGIDO
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: {
        dailySales,
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
    })
  } catch (error) {
    console.error('Error obteniendo analytics de ventas:', error)
    return NextResponse.json(
      { 
        error: 'Error obteniendo estadísticas de ventas',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}