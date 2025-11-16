import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getSeller, UnauthorizedError, handleAuthError } from '@/lib/auth-helpers'

// API ultra-optimizada para Stats SSR con pre-cálculos pesados
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

    // Query súper optimizada con agregaciones complejas
    const statsData = await prisma.$queryRaw<Array<{
      sales_summary: any,
      monthly_trends: any[],
      product_performance: any[],
      client_insights: any,
      weekly_patterns: any[]
    }>>`
      WITH sales_summary AS (
        SELECT 
          COUNT(*)::int as total_orders,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as completed_orders,
          COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN "totalAmount" END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN status = 'COMPLETED' THEN "totalAmount" END), 0) as avg_order_value,
          COUNT(DISTINCT "clientId")::int as unique_clients,
          COALESCE(SUM(CASE WHEN status = 'COMPLETED' AND "createdAt" >= NOW() - INTERVAL '7 days' THEN "totalAmount" END), 0) as week_revenue,
          COUNT(CASE WHEN status = 'COMPLETED' AND "createdAt" >= NOW() - INTERVAL '7 days' THEN 1 END)::int as week_orders
        FROM orders 
        WHERE "sellerId" = ${seller.id}
          AND "createdAt" >= NOW() - INTERVAL '1 year'
      ),
      monthly_trends AS (
        SELECT 
          TO_CHAR("createdAt", 'YYYY-MM') as month,
          TO_CHAR("createdAt", 'Mon YYYY') as month_name,
          COUNT(*)::int as orders,
          COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN "totalAmount" END), 0) as revenue,
          COUNT(DISTINCT "clientId")::int as unique_clients
        FROM orders 
        WHERE "sellerId" = ${seller.id}
          AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR("createdAt", 'YYYY-MM'), TO_CHAR("createdAt", 'Mon YYYY')
        ORDER BY month DESC
        LIMIT 12
      ),
      product_performance AS (
        SELECT 
          p.name as product_name,
          p.category,
          SUM(oi.quantity)::int as total_sold,
          COALESCE(SUM(oi.subtotal), 0) as total_revenue,
          COUNT(DISTINCT o."clientId")::int as unique_buyers,
          COALESCE(AVG(oi.subtotal), 0) as avg_item_value,
          COUNT(DISTINCT o.id)::int as orders_count
        FROM order_items oi
        INNER JOIN orders o ON oi."orderId" = o.id
        INNER JOIN products p ON oi."productId" = p.id
        WHERE o."sellerId" = ${seller.id}
          AND o.status = 'COMPLETED'
          AND o."createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY p.name, p.category
        ORDER BY total_revenue DESC
        LIMIT 20
      ),
      client_insights AS (
        SELECT 
          COUNT(DISTINCT "clientId")::int as total_clients,
          COALESCE(AVG(client_orders.order_count), 0) as avg_orders_per_client,
          COALESCE(AVG(client_orders.total_spent), 0) as avg_spent_per_client,
          COUNT(CASE WHEN client_orders.order_count >= 5 THEN 1 END)::int as loyal_clients,
          COUNT(CASE WHEN client_orders.last_order >= NOW() - INTERVAL '30 days' THEN 1 END)::int as active_clients
        FROM (
          SELECT 
            "clientId",
            COUNT(*)::int as order_count,
            COALESCE(SUM("totalAmount"), 0) as total_spent,
            MAX("createdAt") as last_order
          FROM orders 
          WHERE "sellerId" = ${seller.id}
            AND status = 'COMPLETED'
          GROUP BY "clientId"
        ) client_orders
      ),
      weekly_patterns AS (
        SELECT 
          EXTRACT(DOW FROM "createdAt")::int as day_of_week,
          CASE EXTRACT(DOW FROM "createdAt")
            WHEN 0 THEN 'Domingo'
            WHEN 1 THEN 'Lunes'
            WHEN 2 THEN 'Martes'
            WHEN 3 THEN 'Miércoles'
            WHEN 4 THEN 'Jueves'
            WHEN 5 THEN 'Viernes'
            WHEN 6 THEN 'Sábado'
          END as day_name,
          COUNT(*)::int as orders,
          COALESCE(SUM(CASE WHEN status = 'COMPLETED' THEN "totalAmount" END), 0) as revenue
        FROM orders 
        WHERE "sellerId" = ${seller.id}
          AND "createdAt" >= NOW() - INTERVAL '3 months'
        GROUP BY EXTRACT(DOW FROM "createdAt")
        ORDER BY day_of_week
      )
      SELECT 
        (SELECT row_to_json(sales_summary) FROM sales_summary) as sales_summary,
        (SELECT json_agg(monthly_trends) FROM monthly_trends) as monthly_trends,
        (SELECT json_agg(product_performance) FROM product_performance) as product_performance,
        (SELECT row_to_json(client_insights) FROM client_insights) as client_insights,
        (SELECT json_agg(weekly_patterns) FROM weekly_patterns) as weekly_patterns
    `

    const result = statsData[0]

    // Calcular métricas adicionales
    const salesSummary = result.sales_summary
    const monthlyTrends = result.monthly_trends || []
    
    // Calcular crecimiento mensual
    const growthRate = monthlyTrends.length >= 2 
      ? ((Number(monthlyTrends[0].revenue) - Number(monthlyTrends[1].revenue)) / Number(monthlyTrends[1].revenue) * 100)
      : 0

    const responseData = {
      success: true,
      data: {
        summary: {
          ...salesSummary,
          growth_rate: growthRate,
          retention_rate: salesSummary.unique_clients > 0 
            ? (result.client_insights.loyal_clients / salesSummary.unique_clients * 100) 
            : 0
        },
        trends: {
          monthly: monthlyTrends,
          weekly: result.weekly_patterns || []
        },
        products: {
          performance: result.product_performance || [],
          categories: result.product_performance 
            ? result.product_performance.reduce((acc: any, product: any) => {
                const category = product.category || 'Sin categoría'
                if (!acc[category]) {
                  acc[category] = { count: 0, revenue: 0 }
                }
                acc[category].count += 1
                acc[category].revenue += Number(product.total_revenue)
                return acc
              }, {})
            : {}
        },
        clients: result.client_insights || {},
        period: '12 months',
        generatedAt: new Date().toISOString(),
      }
    }

    const response = NextResponse.json(responseData)

    // ✅ SMART CACHING - Stats pueden tener cache más largo (menos crítico)
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800')
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=600')
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=600')

    return response

  } catch (error) {
    console.error('Error en stats SSR API:', error)
    
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
  }
}