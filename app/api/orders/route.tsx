import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'

const prisma = new PrismaClient()

// GET /api/orders - Obtener todas las órdenes (para vendedor)
// ✅ CON TIMEOUT DE 5 SEGUNDOS
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Construir filtro
    const whereClause: any = {}
    
    if (status && status !== 'all') {
      whereClause.status = status
    }

    // ✅ Obtener órdenes CON TIMEOUT
    const orders = await withPrismaTimeout(
      () => prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    )

    // Estadísticas rápidas
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING').length,
      processing: orders.filter(o => o.status === 'CONFIRMED').length,
      completed: orders.filter(o => o.status === 'COMPLETED').length,
      cancelled: orders.filter(o => o.status === 'CANCELED').length,
    }

    return NextResponse.json({
      success: true,
      orders,
      stats,
    })
  } catch (error) {
    console.error('Error obteniendo órdenes:', error)
    
    // ✅ MANEJO ESPECÍFICO DE TIMEOUT
    if (error instanceof TimeoutError) {
      const timeoutResponse = handleTimeoutError(error)
      return NextResponse.json(
        { success: false, ...timeoutResponse },
        { status: timeoutResponse.status }
      )
    }

    return NextResponse.json(
      { error: 'Error obteniendo órdenes: ' + (error as Error).message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}