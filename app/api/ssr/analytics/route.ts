import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getSeller, UnauthorizedError, handleAuthError } from '@/lib/auth-helpers'

// API optimizada para Analytics SSR
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const seller = await getSeller(userId)
    if (!seller) {
      return NextResponse.json({ error: 'Seller no encontrado' }, { status: 404 })
    }

    // Query compleja optimizada para analytics
    const analyticsData = await prisma.$queryRaw<Array<{
      hourly_stats: any[],
      daily_stats: any[],
      top_products: any[],
      client_stats: any
    }>>`
      WITH hourly_stats AS (
        SELECT 
          EXTRACT(HOUR FROM "createdAt")::int as hour,
          COUNT(*)::int as orders,
          COALESCE(SUM("totalAmount"), 0) as revenue
        FROM orders 
        WHERE "sellerId" = ${seller.id}
          AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM "createdAt")
        ORDER BY hour
      ),
      daily_stats AS (
        SELECT 
          DATE("createdAt") as date,
          COUNT(*)::int as orders,
          COALESCE(SUM("totalAmount"), 0) as revenue
        FROM orders 
        WHERE "sellerId" = ${seller.id}
          AND "createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
        LIMIT 30
      ),
      top_products AS (
        SELECT 
          p.name as product_name,
          SUM(oi.quantity)::int as total_sold,
          COALESCE(SUM(oi.subtotal), 0) as total_revenue
        FROM order_items oi
        INNER JOIN orders o ON oi."orderId" = o.id
        INNER JOIN products p ON oi."productId" = p.id
        WHERE o."sellerId" = ${seller.id}
          AND o.status = 'COMPLETED'
          AND o."createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY p.name
        ORDER BY total_sold DESC
        LIMIT 10
      ),
      client_stats AS (
        SELECT 
          COUNT(DISTINCT o."clientId")::int as active_clients,
          AVG(o."totalAmount") as avg_order_value,
          COUNT(*)::int as total_orders
        FROM orders o
        WHERE o."sellerId" = ${seller.id}
          AND o."createdAt" >= NOW() - INTERVAL '30 days'
      )
      SELECT 
        (SELECT json_agg(hourly_stats) FROM hourly_stats) as hourly_stats,
        (SELECT json_agg(daily_stats) FROM daily_stats) as daily_stats,
        (SELECT json_agg(top_products) FROM top_products) as top_products,
        (SELECT row_to_json(client_stats) FROM client_stats) as client_stats
    `

    const result = analyticsData[0]

    const responseData = {
      success: true,
      data: {
        hourlyStats: result.hourly_stats || [],
        dailyStats: result.daily_stats || [],
        topProducts: result.top_products || [],
        clientStats: result.client_stats || {
          active_clients: 0,
          avg_order_value: 0,
          total_orders: 0
        },
        period: '30 days',
        generatedAt: new Date().toISOString(),
      }
    }

    const response = NextResponse.json(responseData)

    // ✅ SMART CACHING - Analytics se actualiza menos frecuentemente
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900')
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=300')
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=300')

    return response

  } catch (error) {
    console.error('Error en analytics SSR API:', error)
    
    if (error instanceof UnauthorizedError) {
      const authError = await handleAuthError(error)
      return NextResponse.json(
        { error: authError.error },
        { status: authError.statusCode }
      )
    }
    
    return NextResponse.json(
      { error: 'Error obteniendo analytics' },
      { status: 500 }
    )
  }
}