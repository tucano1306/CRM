import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'

// GET /api/orders - Obtener todas las órdenes (para vendedor)
// ✅ CON TIMEOUT DE 5 SEGUNDOS
// Soporta: ?status=PENDING&limit=10&recent=true
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔒 SEGURIDAD: Obtener vendedor del usuario autenticado
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      return NextResponse.json({ 
        error: 'No tienes permisos para ver órdenes. Debes ser un vendedor registrado.' 
      }, { status: 403 })
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limitParam = searchParams.get('limit')
    const recentParam = searchParams.get('recent')
    
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    const isRecent = recentParam === 'true'

    // 🔒 SEGURIDAD: Construir filtro SIEMPRE con sellerId
    const whereClause: any = {
      sellerId: seller.id  // ← FILTRO OBLIGATORIO: Solo órdenes de este vendedor
    }
    
    if (status && status !== 'all') {
      // Soportar múltiples estados separados por coma (ej: "DELIVERED,COMPLETED")
      const statuses = status.split(',').map(s => s.trim())
      if (statuses.length > 1) {
        whereClause.status = { in: statuses }
      } else {
        whereClause.status = status
      }
    }

    // ✅ Obtener órdenes CON TIMEOUT (incluye campos para factura)
    const orders = await withPrismaTimeout(
      () => prisma.order.findMany({
        where: whereClause,
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  sku: true,
                  unit: true,  // ← Para factura
                  imageUrl: true,
                  isActive: true,
                  stock: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
            },
          },
          client: {
            select: {
              id: true,
              name: true,
              businessName: true,  // ← Para factura
              email: true,
              phone: true,
              address: true,  // ← Para factura
            },
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true,  // ← Para factura
              phone: true,  // ← Para factura
            },
          },
          creditNoteUsages: {  // ← Para factura con créditos
            include: {
              creditNote: {
                select: {
                  id: true,
                  creditNoteNumber: true,
                  amount: true,
                  balance: true,  // Saldo restante
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        ...(limit ? { take: limit } : {}),
      })
    )

    // Si se solicita formato "recent" simplificado
    if (isRecent) {
      const recentOrders = orders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        clientName: order.client?.name || 'Cliente no disponible',
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
        itemCount: order.orderItems.length,
      }))

      return NextResponse.json({
        success: true,
        orders: recentOrders,
      })
    }

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
  }
}