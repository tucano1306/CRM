import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'
import { withResilientDb } from '@/lib/db-retry'

// GET /api/orders - Obtener todas las órdenes (para vendedor o cliente)
// ✅ CON TIMEOUT DE 5 SEGUNDOS
// Soporta: ?status=PENDING&limit=10&recent=true&role=seller|client
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'seller' o 'client'
    const status = searchParams.get('status')
    const limitParam = searchParams.get('limit')
    const recentParam = searchParams.get('recent')
    
    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    const isRecent = recentParam === 'true'

    console.log('📋 [ORDERS GET] Params:', { role, status, limit, userId })

    // Obtener usuario autenticado
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: {
        sellers: true,
        clients: true
      }
    })

    if (!authUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Determinar el rol del usuario si no se especifica
    const isClient = authUser.clients.length > 0
    const isSeller = authUser.sellers.length > 0
    const effectiveRole = role || (isClient ? 'client' : isSeller ? 'seller' : null)

    console.log('🎭 [ORDERS GET] Effective role:', effectiveRole, { isClient, isSeller })

    // 🔒 SEGURIDAD: Construir filtro según el rol
    const whereClause: any = {}

    if (effectiveRole === 'client' && isClient) {
      // Cliente: ver sus propias órdenes
      const clientId = authUser.clients[0].id
      whereClause.clientId = clientId
      console.log('👤 [ORDERS GET] Filtering by clientId:', clientId)
    } else if (effectiveRole === 'seller' && isSeller) {
      // Vendedor: ver órdenes de sus clientes
      const sellerId = authUser.sellers[0].id
      whereClause.sellerId = sellerId
      console.log('👔 [ORDERS GET] Filtering by sellerId:', sellerId)
    } else {
      return NextResponse.json({ 
        error: 'No tienes permisos para ver órdenes.' 
      }, { status: 403 })
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

    console.log('🔎 [ORDERS GET] Where clause:', JSON.stringify(whereClause, null, 2))

    // ✅ Obtener órdenes CON TIMEOUT + RETRY (incluye campos para factura)
    console.log('💾 [ORDERS GET] Executing Prisma query...')
    const orders = await withResilientDb(
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
          // ← Para mostrar problemas de stock en el modal
          issues: {
            select: {
              id: true,
              productName: true,
              issueType: true,
              requestedQty: true,
              availableQty: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        ...(limit ? { take: limit } : {}),
      }),
      { timeoutMs: 5000, retries: 2, initialDelayMs: 150 }
    )
    
    console.log('✅ [ORDERS GET] Found orders:', orders.length)

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