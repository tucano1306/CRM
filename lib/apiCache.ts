/**
 * 🚀 API Cache Helpers
 * 
 * Utilidades para implementar cache en API routes sin romper código existente
 */

import { NextResponse } from 'next/server'

export interface CacheConfig {
  // Tiempo de cache en segundos
  maxAge?: number
  // Tiempo de stale-while-revalidate en segundos  
  staleWhileRevalidate?: number
  // Si es público (puede ser cacheado por CDN)
  public?: boolean
  // Headers específicos de CDN
  cdnMaxAge?: number
  // Si debe ser cacheado por el navegador
  private?: boolean
  // No cache en absoluto
  noCache?: boolean
}

/**
 * Configuraciones predefinidas de cache para diferentes tipos de APIs
 */
export const CACHE_CONFIGS = {
  // APIs de lectura que cambian poco (productos, categorías)
  STATIC: {
    maxAge: 300, // 5 minutos
    staleWhileRevalidate: 900, // 15 minutos
    public: true,
    cdnMaxAge: 300
  } as CacheConfig,

  // APIs de datos dinámicos pero no críticos (estadísticas)
  DYNAMIC: {
    maxAge: 60, // 1 minuto
    staleWhileRevalidate: 300, // 5 minutos
    public: true,
    cdnMaxAge: 60
  } as CacheConfig,

  // APIs de usuario específico (órdenes del usuario)
  USER_SPECIFIC: {
    maxAge: 30, // 30 segundos
    staleWhileRevalidate: 120, // 2 minutos
    private: true
  } as CacheConfig,

  // APIs que cambian frecuentemente (dashboard live)
  REALTIME: {
    maxAge: 10, // 10 segundos
    staleWhileRevalidate: 60, // 1 minuto
    private: true
  } as CacheConfig,

  // APIs que nunca deben cachearse (auth, mutations)
  NO_CACHE: {
    noCache: true
  } as CacheConfig
}

/**
 * Genera el header Cache-Control basado en la configuración
 */
export function generateCacheHeader(config: CacheConfig): string {
  if (config.noCache) {
    return 'no-store, no-cache, must-revalidate, proxy-revalidate'
  }

  const parts: string[] = []

  // Public vs Private
  if (config.public) {
    parts.push('public')
  } else if (config.private) {
    parts.push('private')
  }

  // Max age
  if (config.maxAge !== undefined) {
    parts.push(`max-age=${config.maxAge}`)
  }

  // S-maxage (shared cache)
  if (config.public && config.cdnMaxAge !== undefined) {
    parts.push(`s-maxage=${config.cdnMaxAge}`)
  }

  // Stale while revalidate
  if (config.staleWhileRevalidate !== undefined) {
    parts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`)
  }

  return parts.join(', ')
}

/**
 * Añade headers de cache a una respuesta NextResponse
 * 
 * @param response - Response existente
 * @param config - Configuración de cache
 * @returns Response con headers de cache añadidos
 */
export function addCacheHeaders(response: NextResponse, config: CacheConfig): NextResponse {
  const cacheControl = generateCacheHeader(config)
  
  // Header principal de cache
  response.headers.set('Cache-Control', cacheControl)

  // Headers adicionales para CDN
  if (config.public && config.cdnMaxAge !== undefined) {
    response.headers.set('CDN-Cache-Control', `public, s-maxage=${config.cdnMaxAge}`)
    response.headers.set('Vercel-CDN-Cache-Control', `public, s-maxage=${config.cdnMaxAge}`)
  }

  // Headers para debugging
  response.headers.set('X-Cache-Config', JSON.stringify(config))
  response.headers.set('X-Cache-Generated', new Date().toISOString())

  return response
}

/**
 * Wrapper helper para APIs existentes - añade cache sin cambiar lógica
 * 
 * Uso:
 * ```typescript
 * export async function GET(request: Request) {
 *   const data = await fetchData() // Tu código existente
 *   const response = NextResponse.json({ data })
 *   return withCache(response, CACHE_CONFIGS.STATIC)
 * }
 * ```
 */
export function withCache(response: NextResponse, config: CacheConfig): NextResponse {
  return addCacheHeaders(response, config)
}

/**
 * Helper para respuestas JSON con cache
 */
export function jsonWithCache(data: any, config: CacheConfig, options?: { status?: number }): NextResponse {
  const response = NextResponse.json(data, options)
  return addCacheHeaders(response, config)
}

/**
 * Helper para APIs que necesitan cache condicional basado en parámetros
 */
export function getAdaptiveCache(request: Request): CacheConfig {
  const url = new URL(request.url)
  const searchParams = url.searchParams

  // Si hay filtros de usuario, cache privado
  if (searchParams.has('userId') || searchParams.has('clientId')) {
    return CACHE_CONFIGS.USER_SPECIFIC
  }

  // Si pide datos en tiempo real
  if (searchParams.has('realtime') || searchParams.has('live')) {
    return CACHE_CONFIGS.REALTIME
  }

  // Si es listado general, cache estático
  if (url.pathname.includes('/products') || url.pathname.includes('/categories')) {
    return CACHE_CONFIGS.STATIC
  }

  // Default: cache dinámico
  return CACHE_CONFIGS.DYNAMIC
}

/**
 * Middleware helper - para usar en el edge middleware
 */
export function shouldCacheRequest(request: Request): boolean {
  const method = request.method
  const url = new URL(request.url)
  
  // Solo cache GET requests
  if (method !== 'GET') return false
  
  // No cache para rutas de auth
  if (url.pathname.includes('/auth/') || url.pathname.includes('/webhook')) return false
  
  // No cache para rutas de debug
  if (url.pathname.includes('/debug/')) return false
  
  // Cache para APIs públicas y de datos
  return url.pathname.startsWith('/api/')
}

/**
 * Helper para invalidar cache (para usar con mutations)
 */
export function generateCacheInvalidationHeaders(): Record<string, string> {
  return {
    'Cache-Control': 'no-cache',
    'X-Cache-Invalidated': new Date().toISOString(),
    'X-Cache-Action': 'invalidate'
  }
}