import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

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

export default clerkMiddleware(async (auth, req) => {
  // Permitir rutas públicas siempre
  if (isPublicRoute(req)) {
    return NextResponse.next()
  }

  const { userId, sessionClaims } = await auth()

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
    console.error('Error obteniendo rol:', error)
    userRole = 'CLIENT'
  }

  console.log('🔍 Middleware DEBUG:', {
    path: req.nextUrl.pathname,
    userId: userId.substring(0, 15),
    userRole,
    hasSessionClaims: !!sessionClaims,
    hasPublicMetadata: !!(sessionClaims?.public_metadata),
  })

  // Proteger rutas de vendedor
  if (isSellerRoute(req)) {
    if (userRole !== 'SELLER' && userRole !== 'ADMIN') {
      console.log('❌ Redirigiendo a buyer (no es vendedor)')
      return NextResponse.redirect(new URL('/buyer/dashboard', req.url))
    }
    console.log('✅ Acceso de vendedor permitido')
  }

  // Proteger rutas de comprador
  if (isBuyerRoute(req)) {
    if (userRole !== 'CLIENT') {
      console.log('❌ Redirigiendo a dashboard (no es comprador)')
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    console.log('✅ Acceso de comprador permitido')
  }

  // Redirección desde raíz
  if (req.nextUrl.pathname === '/') {
    if (userRole === 'CLIENT') {
      return NextResponse.redirect(new URL('/buyer/dashboard', req.url))
    } else {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}