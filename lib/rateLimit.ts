/**
 * Rate Limiter - Sistema de límite de requests
 * Protección contra DoS y abuso de API
 */

interface RateLimitEntry {
  count: number
  resetTime: number
  blocked: boolean
  blockUntil?: number
}

interface RateLimitConfig {
  windowMs: number      // Ventana de tiempo en ms
  maxRequests: number   // Máximo de requests en la ventana
  blockDurationMs: number // Duración del bloqueo si se excede
}

class RateLimiter {
  private readonly store: Map<string, RateLimitEntry>
  private readonly config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.store = new Map()
    this.config = config

    // Limpiar entradas expiradas cada minuto
    setInterval(() => this.cleanup(), 60000)
  }

  /**
   * Verificar si una key (IP/userId) puede hacer un request
   */
  check(key: string): {
    allowed: boolean
    remaining: number
    resetTime: number
    blocked: boolean
  } {
    const now = Date.now()
    let entry = this.store.get(key)

    // Si está bloqueado, verificar si ya expiró el bloqueo
    if (entry?.blocked && entry.blockUntil) {
      if (now < entry.blockUntil) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: entry.blockUntil,
          blocked: true,
        }
      } else {
        // Bloqueo expirado, resetear
        entry.blocked = false
        entry.blockUntil = undefined
        entry.count = 0
        entry.resetTime = now + this.config.windowMs
      }
    }

    // Si no existe o expiró la ventana, crear nueva entrada
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + this.config.windowMs,
        blocked: false,
      }
      this.store.set(key, entry)
    }

    // Incrementar contador
    entry.count++

    // Verificar si excedió el límite
    if (entry.count > this.config.maxRequests) {
      entry.blocked = true
      entry.blockUntil = now + this.config.blockDurationMs
      
      console.warn(`⚠️ [RATE LIMIT] Bloqueado: ${key} - ${entry.count} requests en ventana`)
      
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.blockUntil,
        blocked: true,
      }
    }

    const remaining = this.config.maxRequests - entry.count

    return {
      allowed: true,
      remaining,
      resetTime: entry.resetTime,
      blocked: false,
    }
  }

  /**
   * Limpiar entradas expiradas del store
   */
  private cleanup(): void {
    const now = Date.now()
    let cleaned = 0

    for (const [key, entry] of this.store.entries()) {
      // Eliminar si:
      // 1. La ventana expiró y no está bloqueado
      // 2. El bloqueo expiró
      const windowExpired = now >= entry.resetTime && !entry.blocked
      const blockExpired = entry.blocked && entry.blockUntil && now >= entry.blockUntil

      if (windowExpired || blockExpired) {
        this.store.delete(key)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 [RATE LIMIT] Limpiados ${cleaned} entries expirados`)
    }
  }

  /**
   * Obtener estadísticas del rate limiter
   */
  getStats(): {
    totalEntries: number
    blockedEntries: number
    activeEntries: number
  } {
    const now = Date.now()
    let blocked = 0
    let active = 0

    for (const entry of this.store.values()) {
      if (entry.blocked && entry.blockUntil && now < entry.blockUntil) {
        blocked++
      }
      if (now < entry.resetTime) {
        active++
      }
    }

    return {
      totalEntries: this.store.size,
      blockedEntries: blocked,
      activeEntries: active,
    }
  }

  /**
   * Desbloquear manualmente una key (para admin)
   */
  unblock(key: string): boolean {
    const entry = this.store.get(key)
    if (entry?.blocked) {
      entry.blocked = false
      entry.blockUntil = undefined
      entry.count = 0
      console.log(`✅ [RATE LIMIT] Desbloqueado manualmente: ${key}`)
      return true
    }
    return false
  }

  /**
   * Resetear contador de una key
   */
  reset(key: string): void {
    this.store.delete(key)
  }

  /**
   * Limpiar todo el store (para testing)
   */
  clear(): void {
    this.store.clear()
    console.log('🧹 [RATE LIMIT] Store limpiado completamente')
  }
}

// ============================================================================
// Configuraciones predefinidas por tipo de endpoint
// ============================================================================

// API General: 200 requests por minuto (más permisivo para SPAs)
export const generalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 200,
  blockDurationMs: 2 * 60 * 1000, // 2 minutos de bloqueo (reducido)
})

// Auth endpoints: 100 requests por 15 minutos (más permisivo)
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutos
  maxRequests: 100, // Aumentado de 50 a 100
  blockDurationMs: 5 * 60 * 1000, // 5 minutos de bloqueo
})

// API pública (sin auth): 50 requests por minuto
export const publicRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 50,
  blockDurationMs: 2 * 60 * 1000, // 2 minutos de bloqueo
})

// Cron/Webhooks: 1 request por minuto
export const cronRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minuto
  maxRequests: 1,
  blockDurationMs: 5 * 60 * 1000, // 5 minutos de bloqueo
})

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Obtener IP del cliente desde headers
 */
export function getClientIp(request: Request): string {
  const headers = new Headers(request.headers)
  
  // Orden de prioridad de headers
  const ipHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip', // Cloudflare
    'x-client-ip',
    'x-cluster-client-ip',
  ]

  for (const header of ipHeaders) {
    const value = headers.get(header)
    if (value) {
      // x-forwarded-for puede contener múltiples IPs separadas por coma
      const ip = value.split(',')[0].trim()
      if (ip) return ip
    }
  }

  return 'unknown'
}

/**
 * Crear key para rate limiting combinando userId + IP
 */
export function createRateLimitKey(userId?: string | null, ip?: string): string {
  if (userId) {
    return `user:${userId}`
  }
  if (ip) {
    return `ip:${ip}`
  }
  return 'anonymous'
}

export { RateLimiter }
export type { RateLimitConfig, RateLimitEntry }
