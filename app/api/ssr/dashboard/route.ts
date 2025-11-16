import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getSeller, UnauthorizedError, handleAuthError } from '@/lib/auth-helpers'

// API optimizada para SSR con smart caching
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificación de seller
    const seller = await getSeller(userId)
    if (!seller) {
      return NextResponse.json({ error: 'Seller no encontrado' }, { status: 404 })
    }

    // Query optimizada para SSR - single query con joins
    const dashboardData = await prisma.$queryRaw<Array<{
      order_stats: any,
      product_stats: any,
      recent_orders: any[]
    }>>`
      WITH order_stats AS (
        SELECT 
          COUNT(*)::int as total_orders,
          COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending_orders,
          COUNT(CASE WHEN status = 'CONFIRMED' THEN 1 END)::int as processing_orders,  
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as completed_orders,
          COUNT(CASE WHEN status = 'CANCELED' THEN 1 END)::int as canceled_orders,
          COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN "totalAmount" END), 0) as total_revenue
        FROM orders 
        WHERE "sellerId" = ${seller.id}
      ),
      product_stats AS (
        SELECT 
          COUNT(*)::int as total_products,
          COUNT(CASE WHEN stock < 10 THEN 1 END)::int as low_stock_products
        FROM products p
        INNER JOIN product_sellers ps ON p.id = ps."productId"
        WHERE ps."sellerId" = ${seller.id} AND p."isActive" = true
      ),
      recent_orders AS (
        SELECT 
          o.id,
          o."orderNumber",
          o."totalAmount",
          o.status,
          o."createdAt",
          c.name as client_name,
          COUNT(oi.id)::int as item_count
        FROM orders o
        INNER JOIN clients c ON o."clientId" = c.id
        LEFT JOIN order_items oi ON o.id = oi."orderId"
        WHERE o."sellerId" = ${seller.id}
        GROUP BY o.id, o."orderNumber", o."totalAmount", o.status, o."createdAt", c.name
        ORDER BY o."createdAt" DESC
        LIMIT 5
      )
      SELECT 
        (SELECT row_to_json(order_stats) FROM order_stats) as order_stats,
        (SELECT row_to_json(product_stats) FROM product_stats) as product_stats,
        (SELECT json_agg(recent_orders) FROM recent_orders) as recent_orders
    `

    const result = dashboardData[0]
    const orderStats = result.order_stats
    const productStats = result.product_stats
    const recentOrders = result.recent_orders || []

    const responseData = {
      success: true,
      data: {
        overview: {
          totalOrders: Number(orderStats.total_orders),
          pendingOrders: Number(orderStats.pending_orders),
          processingOrders: Number(orderStats.processing_orders),
          completedOrders: Number(orderStats.completed_orders),
          canceledOrders: Number(orderStats.canceled_orders),
          totalRevenue: Number(orderStats.total_revenue),
          totalProducts: Number(productStats.total_products),
          lowStockProducts: Number(productStats.low_stock_products),
        },
        recentOrders: recentOrders.map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          clientName: order.client_name,
          totalAmount: Number(order.totalAmount),
          status: order.status,
          createdAt: order.createdAt,
          itemCount: Number(order.item_count),
        })),
        generatedAt: new Date().toISOString(),
      }
    }

    const response = NextResponse.json(responseData)

    // ✅ SMART CACHING for SSR
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=60')
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=60')
    
    return response

  } catch (error) {
    console.error('Error en dashboard SSR API:', error)
    
    if (error instanceof UnauthorizedError) {
      const authError = await handleAuthError(error)
      return NextResponse.json(
        { error: authError.error },
        { status: authError.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'Error obteniendo datos del dashboard' },
      { status: 500 }
    )
  }
}