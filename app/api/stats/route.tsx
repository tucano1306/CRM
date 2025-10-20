// app/api/stats/route.tsx
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener todas las órdenes
    const orders = await prisma.order.findMany({
      include: {
        orderItems: true
      }
    })

    // Calcular estadísticas
    const totalOrders = orders.length
    
    // Convertir Decimal a número y calcular ingresos totales
    const totalRevenue = orders.reduce((sum, order) => {
      return sum + Number(order.totalAmount)
    }, 0)

    // Calcular promedio
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Contar productos con stock bajo (menos de 10)
    const lowStockProducts = await prisma.product.count({
      where: {
        stock: {
          lt: 10
        }
      }
    })

    // Órdenes por estado
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2)),
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        lowStockProducts,
        ordersByStatus
      }
    })

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error)
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}