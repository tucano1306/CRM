import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  generalRateLimiter,
  authRateLimiter,
  publicRateLimiter,
  cronRateLimiter,
} from '@/lib/rateLimit'

/**
 * GET /api/admin/rate-limit/stats
 * Obtener estadísticas del rate limiter (solo admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que es ADMIN
    const userRole = (sessionClaims as any)?.role || (sessionClaims?.public_metadata as any)?.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden acceder' },
        { status: 403 }
      )
    }

    const stats = {
      general: generalRateLimiter.getStats(),
      auth: authRateLimiter.getStats(),
      public: publicRateLimiter.getStats(),
      cron: cronRateLimiter.getStats(),
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Error obteniendo stats de rate limit:', error)
    return NextResponse.json(
      { error: 'Error obteniendo estadísticas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/rate-limit/unblock
 * Desbloquear una IP o usuario (solo admin)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que es ADMIN
    const userRole = (sessionClaims as any)?.role || (sessionClaims?.public_metadata as any)?.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden acceder' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { key, limiter } = body

    if (!key || !limiter) {
      return NextResponse.json(
        { error: 'key y limiter son requeridos' },
        { status: 400 }
      )
    }

    let unblocked = false

    switch (limiter) {
      case 'general':
        unblocked = generalRateLimiter.unblock(key)
        break
      case 'auth':
        unblocked = authRateLimiter.unblock(key)
        break
      case 'public':
        unblocked = publicRateLimiter.unblock(key)
        break
      case 'cron':
        unblocked = cronRateLimiter.unblock(key)
        break
      default:
        return NextResponse.json(
          { error: 'Limiter inválido. Usar: general, auth, public, cron' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      unblocked,
      message: unblocked
        ? `Key ${key} desbloqueada exitosamente`
        : `Key ${key} no estaba bloqueada`,
    })
  } catch (error) {
    console.error('Error desbloqueando key:', error)
    return NextResponse.json(
      { error: 'Error desbloqueando key' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/rate-limit/clear
 * Limpiar completamente un rate limiter (solo admin, para testing)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que es ADMIN
    const userRole = (sessionClaims as any)?.role || (sessionClaims?.public_metadata as any)?.role
    if (userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo administradores pueden acceder' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limiter = searchParams.get('limiter')

    if (!limiter) {
      return NextResponse.json(
        { error: 'Parámetro limiter es requerido' },
        { status: 400 }
      )
    }

    switch (limiter) {
      case 'general':
        generalRateLimiter.clear()
        break
      case 'auth':
        authRateLimiter.clear()
        break
      case 'public':
        publicRateLimiter.clear()
        break
      case 'cron':
        cronRateLimiter.clear()
        break
      case 'all':
        generalRateLimiter.clear()
        authRateLimiter.clear()
        publicRateLimiter.clear()
        cronRateLimiter.clear()
        break
      default:
        return NextResponse.json(
          { error: 'Limiter inválido. Usar: general, auth, public, cron, all' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Rate limiter ${limiter} limpiado exitosamente`,
    })
  } catch (error) {
    console.error('Error limpiando rate limiter:', error)
    return NextResponse.json(
      { error: 'Error limpiando rate limiter' },
      { status: 500 }
    )
  }
}
