// app/api/stats/route.tsx
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getSeller, UnauthorizedError, handleAuthError } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔒 SEGURIDAD: Validar que es vendedor y obtener su ID
    const seller = await getSeller(userId)

    // 🔒 SEGURIDAD: Obtener SOLO las órdenes del vendedor autenticado
    const orders = await prisma.order.findMany({
      where: {
        sellerId: seller.id  // ← FILTRO OBLIGATORIO
      },
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

    // 🔒 SEGURIDAD: Contar productos con stock bajo SOLO del vendedor
    const lowStockProducts = await prisma.product.count({
      where: {
        stock: {
          lt: 10
        },
        sellers: {
          some: {
            sellerId: seller.id  // ← FILTRO OBLIGATORIO
          }
        }
      }
    })

    // 🔒 SEGURIDAD: Órdenes por estado SOLO del vendedor
    const ordersByStatus = await prisma.order.groupBy({
      by: ['status'],
      where: {
        sellerId: seller.id  // ← FILTRO OBLIGATORIO
      },
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
    
    // 🔒 SEGURIDAD: Manejar errores de autorización
    if (error instanceof UnauthorizedError) {
      const authError = await handleAuthError(error)
      return NextResponse.json(
        { error: authError.error },
        { status: authError.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    )
  } finally {
    // No $disconnect(): usamos singleton compartido
  }
}