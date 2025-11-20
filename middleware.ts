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
import { shouldCacheRequest } from '@/lib/apiCache'

// Rutas públicas
const isPublicRoute = createRouteMatcher([
  '/',  // Página principal accesible sin auth
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/buyer/sign-in(.*)',
  '/buyer/sign-up(.*)',
  '/buyer/connect(.*)', // Permitir acceso sin auth para procesar invitaciones
  '/api/sellers(.*)', // Permitir consultar vendedores sin auth
  '/api/webhooks(.*)',
  '/select-mode',
  // Asegurar que activos estáticos críticos no requieran auth
  '/favicon.ico',
  '/site.webmanifest',
  '/robots.txt',
  '/_next(.*)',  // Assets de Next.js
  '/static(.*)',  // Assets estáticos
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
  '/buyer/sign-in(.*)',
  '/buyer/sign-up(.*)',
  '/api/auth(.*)',
])

// Rutas de cron/webhooks (muy restrictivas)
const isCronRoute = createRouteMatcher([
  '/api/cron(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  // ============================================================================
  // E2E TESTING BYPASS - Solo en ambiente de testing
  // ============================================================================
  const bypassAuth = req.headers.get('X-Test-Bypass-Auth') === 'true'
  const testUserRole = req.headers.get('X-Test-User-Role') || 'CLIENT'
  const testUserId = req.headers.get('X-Test-User-Id') || 'test-user-e2e'
  
  // Solo permitir bypass en desarrollo o testing
  const isTestEnvironment = process.env.NODE_ENV === 'test' || 
                           process.env.E2E_TESTING === 'true'
  
  if (bypassAuth && isTestEnvironment) {
    logger.warn(LogCategory.AUTH, '⚠️ E2E TEST MODE - Auth bypassed', {
      userId: testUserId,
      userRole: testUserRole,
      endpoint: req.nextUrl.pathname
    })
    
    // Crear una respuesta que simula autenticación
    const response = NextResponse.next()
    response.headers.set('X-Test-Auth-Bypassed', 'true')
    response.headers.set('X-Test-User-Role', testUserRole)
    
    // Proteger rutas según el rol de prueba (usar la misma lógica de mapeo)
    if (isSellerRoute(req) && testUserRole !== 'SELLER' && testUserRole !== 'ADMIN') {
      // Mapear a ruta de buyer equivalente
      const path = req.nextUrl.pathname
      const mapToBuyer = (p: string) => {
        if (p === '/dashboard') return '/buyer/dashboard'
        if (p.startsWith('/chat')) return p.replace('/chat', '/buyer/chat')
        if (p.startsWith('/orders')) return p.replace('/orders', '/buyer/orders')
        if (p.startsWith('/quotes')) return p.replace('/quotes', '/buyer/quotes')
        if (p.startsWith('/recurring-orders')) return p.replace('/recurring-orders', '/buyer/recurring-orders')
        if (p.startsWith('/returns')) return p.replace('/returns', '/buyer/returns')
        if (p.startsWith('/clients')) return '/buyer/dashboard'
        if (p.startsWith('/products')) return '/buyer/catalog'
        if (p.startsWith('/stats')) return '/buyer/dashboard'
        return '/buyer/dashboard'
      }
      const target = mapToBuyer(path)
      return NextResponse.redirect(new URL(target, req.url))
    }
    
    return response
  }
  
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

  // ============================================================================
  // MODE PARAMETER - Detectar parámetro ?mode=seller o ?mode=buyer
  // ============================================================================
  const searchParams = req.nextUrl.searchParams
  const modeParam = searchParams.get('mode')
  
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
    hasPublicMetadata: !!(sessionClaims?.public_metadata),
    modeParam: modeParam || 'none'
  })

  // ============================================================================
  // VALIDACIÓN DE MODE PARAMETER
  // ============================================================================
  // Si el usuario accede con ?mode=seller, verificar que tenga rol SELLER/ADMIN
  if (modeParam === 'seller' && req.nextUrl.pathname === '/') {
    if (userRole !== 'SELLER' && userRole !== 'ADMIN') {
      logger.warn(LogCategory.AUTH, '⚠️ Unauthorized mode=seller access attempt', {
        userId: userId || undefined,
        userRole,
        endpoint: req.nextUrl.pathname
      })
      
      // Mostrar mensaje en la página de selección
      return NextResponse.redirect(new URL('/select-mode?error=not_seller', req.url))
    }
    
    // Si es SELLER/ADMIN, redirigir al dashboard de vendedor
    logger.info(LogCategory.AUTH, '🔄 Redirecting to seller dashboard (mode=seller)', {
      userId: userId || undefined,
      userRole
    })
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Si el usuario accede con ?mode=buyer, verificar que tenga rol CLIENT
  if (modeParam === 'buyer' && req.nextUrl.pathname === '/') {
    if (userRole !== 'CLIENT') {
      logger.warn(LogCategory.AUTH, '⚠️ Unauthorized mode=buyer access attempt', {
        userId: userId || undefined,
        userRole,
        endpoint: req.nextUrl.pathname
      })
      
      // Mostrar mensaje en la página de selección
      return NextResponse.redirect(new URL('/select-mode?error=not_buyer', req.url))
    }
    
    // Si es CLIENT, redirigir al dashboard de comprador
    logger.info(LogCategory.AUTH, '🔄 Redirecting to buyer dashboard (mode=buyer)', {
      userId: userId || undefined,
      userRole
    })
    return NextResponse.redirect(new URL('/buyer/dashboard', req.url))
  }

  // ============================================================================
  // PROTECCIÓN DE RUTAS POR ROL
  // ============================================================================

  // Proteger rutas de vendedor y redirigir a la versión de buyer cuando aplique
  if (isSellerRoute(req)) {
    if (userRole !== 'SELLER' && userRole !== 'ADMIN') {
      const path = req.nextUrl.pathname

      const mapToBuyer = (p: string) => {
        // Mapea rutas de vendedor a su equivalente en buyer, preservando subrutas
        if (p === '/dashboard') return '/buyer/dashboard'
        if (p.startsWith('/orders')) return p.replace('/orders', '/buyer/orders')
        if (p.startsWith('/quotes')) return p.replace('/quotes', '/buyer/quotes')
        if (p.startsWith('/recurring-orders')) return p.replace('/recurring-orders', '/buyer/recurring-orders')
        if (p.startsWith('/returns')) return p.replace('/returns', '/buyer/returns')
        if (p.startsWith('/clients')) return '/buyer/dashboard'
        if (p.startsWith('/products')) return '/buyer/catalog'
        if (p.startsWith('/stats')) return '/buyer/dashboard'
        return '/buyer/dashboard'
      }

      const target = mapToBuyer(path)

      logger.warn(LogCategory.AUTH, 'Unauthorized seller route access attempt - redirecting to buyer equivalent', {
        userId: userId || undefined,
        userRole,
        from: path,
        to: target
      })
      const r = NextResponse.redirect(new URL(target, req.url))
      r.headers.set('x-debug-role', userRole)
      r.headers.set('x-debug-from', path)
      r.headers.set('x-debug-to', target)
      return r
    }
  }

  // Proteger rutas de comprador
  if (isBuyerRoute(req)) {
    // ✅ Solo CLIENT puede acceder a rutas de buyer
    if (userRole !== 'CLIENT') {
      logger.warn(LogCategory.AUTH, 'Unauthorized buyer route access attempt', {
        userId: userId || undefined,
        userRole,
        endpoint: req.nextUrl.pathname
      })
      const r = NextResponse.redirect(new URL('/dashboard', req.url))
      r.headers.set('x-debug-role', userRole)
      r.headers.set('x-debug-from', req.nextUrl.pathname)
      r.headers.set('x-debug-to', '/dashboard')
      return r
    }
  }

  // Redirección desde raíz
  if (req.nextUrl.pathname === '/') {
    // Si el usuario no está autenticado, permitir acceso a la página principal
    if (!userId) {
      logger.info(LogCategory.AUTH, 'Allowing unauthenticated access to home page', { ip })
      return NextResponse.next()
    }
    
    // Si no hay parámetro mode, redirigir a página de selección
    if (!modeParam) {
      logger.info(LogCategory.AUTH, '🔄 Redirecting to mode selection page', {
        userId: userId || undefined,
        userRole
      })
      return NextResponse.redirect(new URL('/select-mode', req.url))
    }
    
    // Si hay mode=buyer
    if (modeParam === 'buyer' && userRole === 'CLIENT') {
      logger.info(LogCategory.AUTH, '🔄 Redirecting CLIENT to /buyer/dashboard', {
        userId: userId || undefined,
        userRole
      })
      const r = NextResponse.redirect(new URL('/buyer/dashboard', req.url))
      r.headers.set('x-debug-role', userRole)
      r.headers.set('x-debug-from', '/')
      r.headers.set('x-debug-to', '/buyer/dashboard')
      return r
    }
    
    // Si hay mode=seller
    if (modeParam === 'seller' && (userRole === 'SELLER' || userRole === 'ADMIN')) {
      logger.info(LogCategory.AUTH, '🔄 Redirecting SELLER/ADMIN to /dashboard', {
        userId: userId || undefined,
        userRole
      })
      const r = NextResponse.redirect(new URL('/dashboard', req.url))
      r.headers.set('x-debug-role', userRole)
      r.headers.set('x-debug-from', '/')
      r.headers.set('x-debug-to', '/dashboard')
      return r
    }
  }

  // Asegurar que usuarios CLIENT usen siempre rutas de buyer si caen en rutas generales
  if (userRole === 'CLIENT') {
    const path = req.nextUrl.pathname
    const mapGeneralToBuyer = (p: string) => {
      if (p === '/dashboard') return '/buyer/dashboard'
      if (p === '/chat' || p.startsWith('/chat')) return '/buyer/chat'
      if (p === '/orders' || p.startsWith('/orders')) return p.replace('/orders', '/buyer/orders')
      if (p === '/quotes' || p.startsWith('/quotes')) return p.replace('/quotes', '/buyer/quotes')
      if (p === '/recurring-orders' || p.startsWith('/recurring-orders')) return p.replace('/recurring-orders', '/buyer/recurring-orders')
      if (p === '/returns' || p.startsWith('/returns')) return p.replace('/returns', '/buyer/returns')
      if (p === '/credit-notes' || p.startsWith('/credit-notes')) return p.replace('/credit-notes', '/buyer/credit-notes')
      if (p === '/cart' || p.startsWith('/cart')) return p.replace('/cart', '/buyer/cart')
      if (p === '/products' || p.startsWith('/products')) return '/buyer/catalog'
      return null
    }

    const buyerPath = mapGeneralToBuyer(path)
    if (buyerPath && buyerPath !== path) {
      logger.info(LogCategory.AUTH, 'Redirecting CLIENT to buyer route equivalent', {
        userId: userId || undefined,
        from: path,
        to: buyerPath
      })
      const r = NextResponse.redirect(new URL(buyerPath, req.url))
      r.headers.set('x-debug-role', userRole)
      r.headers.set('x-debug-from', path)
      r.headers.set('x-debug-to', buyerPath)
      return r
    }
  }

  // ============================================================================
  // EDGE CACHING - Añadir headers de cache para APIs cachables
  // ============================================================================
  const response = NextResponse.next()
  
  // 🚀 CACHE: Añadir headers para optimización edge sin romper funcionalidad
  if (shouldCacheRequest(req)) {
    // Headers para optimización de CDN/Edge
    response.headers.set('X-Edge-Cache', 'enabled')
    response.headers.set('Vary', 'Authorization, Accept')
    
    // Headers específicos por tipo de ruta
    const pathname = req.nextUrl.pathname
    
    if (pathname.includes('/products') && req.method === 'GET') {
      response.headers.set('X-Cache-Hint', 'products-static')
    } else if (pathname.includes('/orders') && req.method === 'GET') {
      response.headers.set('X-Cache-Hint', 'orders-dynamic')
    } else if (pathname.includes('/clients') && req.method === 'GET') {
      response.headers.set('X-Cache-Hint', 'clients-dynamic')
    } else if (pathname.startsWith('/api/public/')) {
      response.headers.set('X-Cache-Hint', 'public-static')
    }
  }

  // ============================================================================
  // CORS - Agregar headers a todas las responses
  // ============================================================================
  response.headers.set('x-debug-role', userRole)
  response.headers.set('x-debug-path', req.nextUrl.pathname)
  return addCorsHeaders(response, req)
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}