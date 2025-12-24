import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
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

// ============================================================================
// ROUTE MATCHERS
// ============================================================================

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

// ============================================================================
// HELPER FUNCTIONS - Reducir complejidad cognitiva del middleware
// ============================================================================

/**
 * Mapea rutas de seller a su equivalente buyer
 */
function mapSellerToBuyerRoute(path: string): string {
  if (path === '/dashboard') return '/buyer/dashboard'
  if (path.startsWith('/chat')) return path.replace('/chat', '/buyer/chat')
  if (path.startsWith('/orders')) return path.replace('/orders', '/buyer/orders')
  if (path.startsWith('/quotes')) return path.replace('/quotes', '/buyer/quotes')
  if (path.startsWith('/recurring-orders')) return path.replace('/recurring-orders', '/buyer/recurring-orders')
  if (path.startsWith('/returns')) return path.replace('/returns', '/buyer/returns')
  if (path.startsWith('/clients')) return '/buyer/dashboard'
  if (path.startsWith('/products')) return '/buyer/catalog'
  if (path.startsWith('/stats')) return '/buyer/dashboard'
  return '/buyer/dashboard'
}

/**
 * Mapea rutas generales a buyer para usuarios CLIENT
 */
function mapGeneralToBuyerRoute(path: string): string | null {
  if (path === '/dashboard') return '/buyer/dashboard'
  if (path === '/chat' || path.startsWith('/chat')) return '/buyer/chat'
  if (path === '/orders' || path.startsWith('/orders')) return path.replace('/orders', '/buyer/orders')
  if (path === '/quotes' || path.startsWith('/quotes')) return path.replace('/quotes', '/buyer/quotes')
  if (path === '/recurring-orders' || path.startsWith('/recurring-orders')) return path.replace('/recurring-orders', '/buyer/recurring-orders')
  if (path === '/returns' || path.startsWith('/returns')) return path.replace('/returns', '/buyer/returns')
  if (path === '/credit-notes' || path.startsWith('/credit-notes')) return path.replace('/credit-notes', '/buyer/credit-notes')
  if (path === '/cart' || path.startsWith('/cart')) return path.replace('/cart', '/buyer/cart')
  if (path === '/products' || path.startsWith('/products')) return '/buyer/catalog'
  return null
}

/**
 * Extrae el rol del usuario desde sessionClaims
 */
function extractUserRole(sessionClaims: any): string {
  try {
    if (sessionClaims?.role) return sessionClaims.role
    if (sessionClaims?.public_metadata?.role) return sessionClaims.public_metadata.role
  } catch {
    // Silently fail
  }
  return 'CLIENT'
}

/**
 * Verifica si el usuario tiene rol de seller
 */
function isSellerOrAdmin(role: string): boolean {
  return role === 'SELLER' || role === 'ADMIN'
}

/**
 * Procesa rate limiting y retorna la respuesta si aplica
 */
function processRateLimit(
  req: NextRequest,
  userId: string | null,
  ip: string
): { response: NextResponse | null; limiterType: string } {
  let rateLimitResult
  let limiterType = 'general'
  
  if (isCronRoute(req)) {
    rateLimitResult = cronRateLimiter.check(`ip:${ip}`)
    limiterType = 'cron'
  } else if (isAuthRoute(req)) {
    rateLimitResult = authRateLimiter.check(createRateLimitKey(userId, ip))
    limiterType = 'auth'
  } else if (req.nextUrl.pathname.startsWith('/api')) {
    rateLimitResult = generalRateLimiter.check(createRateLimitKey(userId, ip))
    limiterType = 'api'
  } else if (isPublicRoute(req)) {
    rateLimitResult = publicRateLimiter.check(`ip:${ip}`)
    limiterType = 'public'
  }
  
  if (!rateLimitResult) return { response: null, limiterType }
  
  if (!rateLimitResult.allowed) {
    logger.warn(LogCategory.RATE_LIMIT, 'Rate limit exceeded', {
      userId: userId || undefined,
      ip,
      endpoint: req.nextUrl.pathname
    }, { limiterType, blocked: rateLimitResult.blocked })
    
    return {
      response: createRateLimitResponse(rateLimitResult, limiterType),
      limiterType
    }
  }
  
  if (rateLimitResult.remaining < 10) {
    logger.debug(LogCategory.RATE_LIMIT, 'Low remaining requests', {
      userId: userId || undefined,
      ip,
      endpoint: req.nextUrl.pathname
    }, { remaining: rateLimitResult.remaining, limiterType })
  }
  
  return { response: null, limiterType }
}

/**
 * Crea respuesta de rate limit
 */
function createRateLimitResponse(
  rateLimitResult: { resetTime: number; remaining: number; blocked?: boolean },
  limiterType: string
): NextResponse {
  const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
  const response = NextResponse.json(
    {
      error: 'Too many requests',
      message: rateLimitResult.blocked 
        ? 'You have been temporarily blocked due to too many requests'
        : 'Rate limit exceeded. Please try again later.',
      retryAfter,
    },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
  
  const limitMap: Record<string, string> = { cron: '1', auth: '10', public: '20' }
  response.headers.set('X-RateLimit-Limit', limitMap[limiterType] || '100')
  response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
  response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetTime))
  
  return response
}

/**
 * Agrega headers de cache a la respuesta
 */
function addCacheHeaders(response: NextResponse, req: NextRequest): void {
  if (!shouldCacheRequest(req)) return
  
  response.headers.set('X-Edge-Cache', 'enabled')
  response.headers.set('Vary', 'Authorization, Accept')
  
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

/**
 * Crea respuesta de redirección con headers de debug
 */
function createRedirectResponse(
  req: NextRequest,
  target: string,
  userRole: string,
  from?: string
): NextResponse {
  const response = NextResponse.redirect(new URL(target, req.url))
  response.headers.set('x-debug-role', userRole)
  response.headers.set('x-debug-from', from || req.nextUrl.pathname)
  response.headers.set('x-debug-to', target)
  return response
}

// ============================================================================
// MIDDLEWARE PRINCIPAL
// ============================================================================

export default clerkMiddleware(async (auth, req) => {
  // E2E Testing bypass
  const e2eResponse = handleE2ETestBypass(req)
  if (e2eResponse) return e2eResponse
  
  // CORS preflight
  if (req.method === 'OPTIONS') return handleCorsPreflightRequest(req)

  const ip = getClientIp(req)
  const { userId, sessionClaims } = await auth()
  
  // Rate limiting
  const { response: rateLimitResponse } = processRateLimit(req, userId, ip)
  if (rateLimitResponse) return rateLimitResponse
  
  // Public routes - siempre permitir
  if (isPublicRoute(req)) return NextResponse.next()

  // Sin autenticación - redirigir a login
  if (!userId) return NextResponse.redirect(new URL('/sign-in', req.url))

  const modeParam = req.nextUrl.searchParams.get('mode')
  const userRole = extractUserRole(sessionClaims)

  // Mode parameter validation en raíz
  const modeResponse = handleModeParameter(req, userId, userRole, modeParam)
  if (modeResponse) return modeResponse

  // Protección de rutas por rol
  const routeResponse = handleRouteProtection(req, userId, userRole)
  if (routeResponse) return routeResponse

  // Root redirect handling
  const rootResponse = handleRootRedirect(req, userId, userRole, modeParam, ip)
  if (rootResponse) return rootResponse

  // CLIENT accessing general routes
  const clientRedirect = handleClientRouteMapping(req, userId, userRole)
  if (clientRedirect) return clientRedirect

  // Respuesta final con headers
  const response = NextResponse.next()
  addCacheHeaders(response, req)
  response.headers.set('x-debug-role', userRole)
  response.headers.set('x-debug-path', req.nextUrl.pathname)
  return addCorsHeaders(response, req)
})

// ============================================================================
// HANDLERS AUXILIARES - Cada uno maneja un aspecto específico
// ============================================================================

function handleE2ETestBypass(req: NextRequest): NextResponse | null {
  const bypassAuth = req.headers.get('X-Test-Bypass-Auth') === 'true'
  const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.E2E_TESTING === 'true'
  
  if (!bypassAuth || !isTestEnvironment) return null
  
  const testUserRole = req.headers.get('X-Test-User-Role') || 'CLIENT'
  const testUserId = req.headers.get('X-Test-User-Id') || 'test-user-e2e'
  
  logger.warn(LogCategory.AUTH, '⚠️ E2E TEST MODE - Auth bypassed', {
    userId: testUserId,
    userRole: testUserRole,
    endpoint: req.nextUrl.pathname
  })
  
  // Verificar acceso a rutas de seller
  if (isSellerRoute(req) && !isSellerOrAdmin(testUserRole)) {
    const target = mapSellerToBuyerRoute(req.nextUrl.pathname)
    return NextResponse.redirect(new URL(target, req.url))
  }
  
  const response = NextResponse.next()
  response.headers.set('X-Test-Auth-Bypassed', 'true')
  response.headers.set('X-Test-User-Role', testUserRole)
  return response
}

function handleModeParameter(
  req: NextRequest,
  userId: string,
  userRole: string,
  modeParam: string | null
): NextResponse | null {
  if (req.nextUrl.pathname !== '/' || !modeParam) return null
  
  if (modeParam === 'seller') {
    if (!isSellerOrAdmin(userRole)) {
      logger.warn(LogCategory.AUTH, '⚠️ Unauthorized mode=seller access attempt', {
        userId, userRole, endpoint: req.nextUrl.pathname
      })
      return NextResponse.redirect(new URL('/select-mode?error=not_seller', req.url))
    }
    logger.info(LogCategory.AUTH, '🔄 Redirecting to seller dashboard (mode=seller)', { userId, userRole })
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
  
  if (modeParam === 'buyer') {
    if (userRole !== 'CLIENT') {
      logger.warn(LogCategory.AUTH, '⚠️ Unauthorized mode=buyer access attempt', {
        userId, userRole, endpoint: req.nextUrl.pathname
      })
      return NextResponse.redirect(new URL('/select-mode?error=not_buyer', req.url))
    }
    logger.info(LogCategory.AUTH, '🔄 Redirecting to buyer dashboard (mode=buyer)', { userId, userRole })
    return NextResponse.redirect(new URL('/buyer/dashboard', req.url))
  }
  
  return null
}

function handleRouteProtection(
  req: NextRequest,
  userId: string,
  userRole: string
): NextResponse | null {
  // Seller routes - redirigir a buyer si no es SELLER/ADMIN
  if (isSellerRoute(req) && !isSellerOrAdmin(userRole)) {
    const target = mapSellerToBuyerRoute(req.nextUrl.pathname)
    logger.warn(LogCategory.AUTH, 'Unauthorized seller route access - redirecting', {
      userId, userRole, from: req.nextUrl.pathname, to: target
    })
    return createRedirectResponse(req, target, userRole, req.nextUrl.pathname)
  }
  
  // Buyer routes - redirigir a seller dashboard si no es CLIENT
  if (isBuyerRoute(req) && userRole !== 'CLIENT') {
    logger.warn(LogCategory.AUTH, 'Unauthorized buyer route access attempt', {
      userId, userRole, endpoint: req.nextUrl.pathname
    })
    return createRedirectResponse(req, '/dashboard', userRole, req.nextUrl.pathname)
  }
  
  return null
}

function handleRootRedirect(
  req: NextRequest,
  userId: string | null,
  userRole: string,
  modeParam: string | null,
  ip: string
): NextResponse | null {
  if (req.nextUrl.pathname !== '/') return null
  
  if (!userId) {
    logger.info(LogCategory.AUTH, 'Allowing unauthenticated access to home page', { ip })
    return NextResponse.next()
  }
  
  if (!modeParam) {
    logger.info(LogCategory.AUTH, '🔄 Redirecting to mode selection page', { userId, userRole })
    return NextResponse.redirect(new URL('/select-mode', req.url))
  }
  
  if (modeParam === 'buyer' && userRole === 'CLIENT') {
    logger.info(LogCategory.AUTH, '🔄 Redirecting CLIENT to /buyer/dashboard', { userId, userRole })
    return createRedirectResponse(req, '/buyer/dashboard', userRole, '/')
  }
  
  if (modeParam === 'seller' && isSellerOrAdmin(userRole)) {
    logger.info(LogCategory.AUTH, '🔄 Redirecting SELLER/ADMIN to /dashboard', { userId, userRole })
    return createRedirectResponse(req, '/dashboard', userRole, '/')
  }
  
  return null
}

function handleClientRouteMapping(
  req: NextRequest,
  userId: string,
  userRole: string
): NextResponse | null {
  if (userRole !== 'CLIENT') return null
  
  const buyerPath = mapGeneralToBuyerRoute(req.nextUrl.pathname)
  if (buyerPath && buyerPath !== req.nextUrl.pathname) {
    logger.info(LogCategory.AUTH, 'Redirecting CLIENT to buyer route equivalent', {
      userId, from: req.nextUrl.pathname, to: buyerPath
    })
    return createRedirectResponse(req, buyerPath, userRole, req.nextUrl.pathname)
  }
  
  return null
}

export const config = {
  matcher: [
    // NOSONAR - String.raw causes Next.js 16 build error "Unsupported node type TaggedTemplateExpression"
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', // NOSONAR
    '/(api|trpc)(.*)',
  ],
}