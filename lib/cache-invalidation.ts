// lib/cache-invalidation.ts
import { revalidatePath, revalidateTag } from 'next/cache'

// ============================================================================
// 🔄 CACHE INVALIDATION UTILITIES
// ============================================================================

interface RevalidateOptions {
  path?: string
  tag?: string
  tags?: string[]
  type?: 'page' | 'layout'
}

// 🚀 Revalidate specific paths
export async function revalidateApp(options: RevalidateOptions) {
  try {
    if (options.path) {
      revalidatePath(options.path, options.type)
      console.log(`✅ [CACHE] Revalidated path: ${options.path}`)
    }

    if (options.tag) {
      revalidateTag(options.tag)
      console.log(`✅ [CACHE] Revalidated tag: ${options.tag}`)
    }

    if (options.tags) {
      options.tags.forEach(tag => revalidateTag(tag))
      console.log(`✅ [CACHE] Revalidated tags: ${options.tags.join(', ')}`)
    }

    return true
  } catch (error) {
    console.error('❌ [CACHE] Revalidation error:', error)
    return false
  }
}

// 🚀 Trigger revalidation via API (for webhooks/external triggers)
export async function triggerRevalidation(options: RevalidateOptions) {
  try {
    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REVALIDATE_SECRET}`
      },
      body: JSON.stringify({
        type: options.tag ? 'tag' : options.tags ? 'tags' : 'path',
        path: options.path,
        tag: options.tag,
        tags: options.tags
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()
    console.log('✅ [CACHE] Revalidation triggered:', result.message)
    return true

  } catch (error) {
    console.error('❌ [CACHE] Failed to trigger revalidation:', error)
    return false
  }
}

// ============================================================================
// 🎯 SPECIFIC INVALIDATION FUNCTIONS
// ============================================================================

// Products-related cache invalidation
export async function invalidateProductsCache(productId?: string) {
  const tags = ['products', 'catalog']
  if (productId) tags.push(`product-${productId}`)
  
  return revalidateApp({
    tags,
    path: '/catalog'
  })
}

// Orders-related cache invalidation  
export async function invalidateOrdersCache(orderId?: string) {
  const tags = ['orders', 'dashboard']
  if (orderId) tags.push(`order-${orderId}`)
  
  return revalidateApp({
    tags,
    path: '/orders'
  })
}

// Clients-related cache invalidation
export async function invalidateClientsCache(clientId?: string) {
  const tags = ['clients']
  if (clientId) tags.push(`client-${clientId}`)
  
  return revalidateApp({
    tags,
    path: '/clients'
  })
}

// Analytics cache invalidation
export async function invalidateAnalyticsCache() {
  return revalidateApp({
    tags: ['analytics', 'stats', 'dashboard'],
    path: '/dashboard'
  })
}

// Full application cache invalidation
export async function invalidateAllCache() {
  return revalidateApp({
    tags: ['products', 'orders', 'clients', 'analytics', 'stats', 'dashboard']
  })
}

// Vercel Purge API integration (opcional)
export async function purgeVercelCache(paths: string[]) {
  const purgeToken = process.env.VERCEL_PURGE_API_TOKEN
  
  if (!purgeToken) {
    console.warn('⚠️ [CACHE] VERCEL_PURGE_API_TOKEN not configured')
    return false
  }

  try {
    const response = await fetch('https://api.vercel.com/v1/purge', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${purgeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paths })
    })

    if (!response.ok) {
      throw new Error(`Vercel Purge API failed: ${response.status}`)
    }

    const result = await response.json()
    console.log('✅ [CACHE] Vercel cache purged:', paths)
    return true

  } catch (error) {
    console.error('❌ [CACHE] Vercel purge failed:', error)
    return false
  }
}