// app/api/webhooks/cache-invalidation/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { invalidateProductsCache, invalidateOrdersCache, invalidateClientsCache, invalidateAnalyticsCache } from '@/lib/cache-invalidation'

// ✅ Webhook para invalidación automática de cache
export async function POST(request: NextRequest) {
  try {
    // 🔐 Verificar webhook secret
    const authHeader = request.headers.get('authorization')
    const webhookSecret = process.env.CACHE_WEBHOOK_SECRET || process.env.REVALIDATE_SECRET
    
    if (!webhookSecret || authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { event, entityType, entityId } = body

    console.log('🔄 [CACHE WEBHOOK] Received:', { event, entityType, entityId })

    let invalidated = false

    switch (entityType) {
      case 'product':
        await invalidateProductsCache(entityId)
        invalidated = true
        break

      case 'order':
        await invalidateOrdersCache(entityId)
        await invalidateAnalyticsCache() // Orders affect analytics
        invalidated = true
        break

      case 'client':
        await invalidateClientsCache(entityId)
        invalidated = true
        break

      case 'analytics':
        await invalidateAnalyticsCache()
        invalidated = true
        break

      case 'all':
        await Promise.all([
          invalidateProductsCache(),
          invalidateOrdersCache(),
          invalidateClientsCache(),
          invalidateAnalyticsCache()
        ])
        invalidated = true
        break

      default:
        console.warn(`⚠️ [CACHE WEBHOOK] Unknown entity type: ${entityType}`)
    }

    if (invalidated) {
      const entityIdSuffix = entityId ? ` (${entityId})` : '';
      console.log(`✅ [CACHE WEBHOOK] Cache invalidated for ${entityType}${entityIdSuffix}`)
    }

    return NextResponse.json({
      success: true,
      message: `Cache invalidation ${invalidated ? 'completed' : 'skipped'}`,
      processed: { event, entityType, entityId },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [CACHE WEBHOOK] Error:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Status endpoint
export async function GET() {
  return NextResponse.json({
    service: 'Cache Invalidation Webhook',
    status: 'active',
    supportedEntities: ['product', 'order', 'client', 'analytics', 'all'],
    example: {
      event: 'entity.updated',
      entityType: 'product',
      entityId: 'product-123',
      data: {}
    }
  })
}