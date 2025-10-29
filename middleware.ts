import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import {
  generalRateLimiter,
  authRateLimiter,
  publicRateLimiter,
  cronRateLimiter,
  getClientIp,
  createRateLimitKey,
} from '@/lib/rateLimit'
import { handleCorsPreflightRequest, addCorsHeaders } from '@/lib/cors'
import logger, { LogCategory } from '@/lib/logger'

// Rutas públicas
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

// Rutas de vendedor
const isSellerRoute = createRouteMatcher([
  '/dashboard',
  '/products(.*)',
  '/clients(.*)',
  '/orders(.*)',
  '/stats(.*)',
])

// Rutas de comprador
const isBuyerRoute = createRouteMatcher([
  '/buyer(.*)',
])

// Rutas de autenticación (más restrictivas)
const isAuthRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/auth(.*)',
])

// Rutas de cron/webhooks (muy restrictivas)
const isCronRoute = createRouteMatcher([
  '/api/cron(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // ============================================================================
  // CORS - Manejar preflight requests (OPTIONS)
  // ============================================================================
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  const ip = getClientIp(req)
  const { userId, sessionClaims } = await auth()
  
  // ============================================================================
  // RATE LIMITING
  // ============================================================================
  
  let rateLimitResult
  let limiterType = 'general'
  
  // Seleccionar rate limiter según el tipo de ruta
  if (isCronRoute(req)) {
    // Cron/Webhooks: 1 request por minuto
    rateLimitResult = cronRateLimiter.check(`ip:${ip}`)
    limiterType = 'cron'
  } else if (isAuthRoute(req)) {
    // Auth: 10 requests por 15 minutos
    const key = createRateLimitKey(userId, ip)
    rateLimitResult = authRateLimiter.check(key)
    limiterType = 'auth'
  } else if (req.nextUrl.pathname.startsWith('/api')) {
    // API General: 100 requests por minuto
    const key = createRateLimitKey(userId, ip)
    rateLimitResult = generalRateLimiter.check(key)
    limiterType = 'api'
  } else if (isPublicRoute(req)) {
    // Rutas públicas: 20 requests por minuto
    rateLimitResult = publicRateLimiter.check(`ip:${ip}`)
    limiterType = 'public'
  }
  
  // Si hay rate limiting aplicado, verificar resultado
  if (rateLimitResult) {
    const response = rateLimitResult.allowed 
      ? NextResponse.next()
      : NextResponse.json(
          {
            error: 'Too many requests',
            message: rateLimitResult.blocked 
              ? 'You have been temporarily blocked due to too many requests'
              : 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
          },
          { 
            status: 429,
            headers: {
              'Retry-After': String(Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)),
            }
          }
        )
    
    // Agregar headers de rate limit a la respuesta
    response.headers.set('X-RateLimit-Limit', limiterType === 'cron' ? '1' : limiterType === 'auth' ? '10' : limiterType === 'public' ? '20' : '100')
    response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
    response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime))
    
    if (!rateLimitResult.allowed) {
      logger.warn(LogCategory.RATE_LIMIT, 'Rate limit exceeded - Request blocked', {
        userId: userId || undefined,
        ip,
        endpoint: req.nextUrl.pathname,
        method: req.method
      }, { limiterType, blocked: rateLimitResult.blocked })
      return response
    }
    
    // Log solo si quedan pocos requests
    if (rateLimitResult.remaining < 10) {
      logger.debug(LogCategory.RATE_LIMIT, 'Rate limit warning - Low remaining requests', {
        userId: userId || undefined,
        ip,
        endpoint: req.nextUrl.pathname
      }, { remaining: rateLimitResult.remaining, limiterType })
    }
  }
  
  // ============================================================================
  // AUTENTICACIÓN Y AUTORIZACIÓN (lógica existente)
  // ============================================================================
  // Permitir rutas públicas siempre
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  // Si no está autenticado, redirigir a login
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url)
    return NextResponse.redirect(signInUrl)
  }

  // Intentar obtener el rol de diferentes formas
  let userRole = 'CLIENT'
  
  try {
    // Método 1: Desde sessionClaims directamente
    if ((sessionClaims as any)?.role) {
      userRole = (sessionClaims as any).role
    }
    // Método 2: Desde public_metadata
    else if (sessionClaims?.public_metadata) {
      const metadata = sessionClaims.public_metadata as any
      userRole = metadata?.role || 'CLIENT'
    }
  } catch (error) {
    logger.error(LogCategory.AUTH, 'Failed to get user role', error, {
      userId: userId || undefined,
      endpoint: req.nextUrl.pathname
    })
    userRole = 'CLIENT'
  }

  logger.debug(LogCategory.AUTH, 'Middleware authentication check', {
    userId: userId || undefined,
    userRole,
    endpoint: req.nextUrl.pathname,
    method: req.method
  }, {
    hasSessionClaims: !!sessionClaims,
    hasPublicMetadata: !!(sessionClaims?.public_metadata)
  })

  // Proteger rutas de vendedor
  if (isSellerRoute(req)) {
    if (userRole !== 'SELLER' && userRole !== 'ADMIN') {
      logger.warn(LogCategory.AUTH, 'Unauthorized seller route access attempt', {
        userId: userId || undefined,
        userRole,
        endpoint: req.nextUrl.pathname
      })
      return NextResponse.redirect(new URL('/buyer/dashboard', req.url))
    }
  }

  // Proteger rutas de comprador
  if (isBuyerRoute(req)) {
    // ✅ PERMITIR a SELLERS ver el catálogo (solo lectura)
    const allowedSellerRoutes = ['/buyer/catalog', '/buyer/dashboard']
    const isAllowedForSeller = allowedSellerRoutes.some(route => 
      req.nextUrl.pathname.startsWith(route)
    )
    
    if (userRole !== 'CLIENT' && !isAllowedForSeller) {
      logger.warn(LogCategory.AUTH, 'Unauthorized buyer route access attempt', {
        userId: userId || undefined,
        userRole,
        endpoint: req.nextUrl.pathname
      })
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // Redirección desde raíz
  if (req.nextUrl.pathname === '/') {
    if (userRole === 'CLIENT') {
      logger.info(LogCategory.AUTH, '🔄 Redirecting CLIENT to /buyer/dashboard', {
        userId: userId || undefined,
        userRole
      })
      return NextResponse.redirect(new URL('/buyer/dashboard', req.url))
    } else {
      // Vendedor/Admin → Redirigir a dashboard
      logger.info(LogCategory.AUTH, '🔄 Redirecting SELLER/ADMIN to /dashboard', {
        userId: userId || undefined,
        userRole
      })
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  // ============================================================================
  // CORS - Agregar headers a todas las responses
  // ============================================================================
  const response = NextResponse.next()
  return addCorsHeaders(response, req)
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}