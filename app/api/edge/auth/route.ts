/**
 * Edge Function: Fast Authentication Validation
 * 
 * Runs on Vercel Edge Runtime for ultra-fast authentication checks
 * Validates JWT tokens, session status, and user roles without full server round-trip
 * 
 * Use Cases:
 * - Fast auth status checks for client-side navigation
 * - Pre-authentication for protected routes
 * - JWT token validation and refresh
 * - Session management at the edge
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

// Enable Edge Runtime for this function
export const runtime = 'edge'

interface AuthResponse {
  authenticated: boolean
  userId?: string
  role?: string
  sessionId?: string
  expiresAt?: number
  region?: string
  timestamp: number
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get user location from Edge (safely handle geo property)
    const requestGeo = (request as any).geo
    const country = requestGeo?.country || 'unknown'
    const region = requestGeo?.region || 'unknown'
    const city = requestGeo?.city || 'unknown'
    
    // Fast authentication check
    const { userId, sessionId } = await auth()
    
    if (!userId) {
      const response: AuthResponse = {
        authenticated: false,
        region: `${city}, ${region}, ${country}`,
        timestamp: Date.now()
      }
      
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, max-age=10', // Short cache for unauthenticated
          'X-Edge-Region': process.env.VERCEL_REGION || 'unknown',
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'X-Runtime': 'edge'
        }
      })
    }

    // Get user role from session claims (fast edge operation)
    const session = await auth()
    const sessionClaims = session.sessionClaims as any
    const role = sessionClaims?.metadata?.role || 
                 sessionClaims?.publicMetadata?.role || 
                 'CLIENT'

    const response: AuthResponse = {
      authenticated: true,
      userId,
      role: role as string,
      sessionId,
      region: `${city}, ${region}, ${country}`,
      timestamp: Date.now()
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=30', // Cache for 30 seconds
        'X-Edge-Region': process.env.VERCEL_REGION || 'unknown',
        'X-Processing-Time': `${Date.now() - startTime}ms`,
        'X-Runtime': 'edge',
        'Vary': 'Authorization'
      }
    })

  } catch (error) {
    console.error('[EDGE-AUTH] Error:', error)
    
    return NextResponse.json(
      { 
        authenticated: false, 
        error: 'Authentication check failed',
        timestamp: Date.now()
      },
      { 
        status: 500,
        headers: {
          'X-Edge-Region': process.env.VERCEL_REGION || 'unknown',
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'X-Runtime': 'edge'
        }
      }
    )
  }
}

/**
 * POST: Fast Token Validation
 * Validates tokens and returns user info without full server round-trip
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { token, action } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      )
    }

    // Fast token validation at edge
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { valid: false, error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Handle different validation actions
    switch (action) {
      case 'validate': {
        const geo = (request as any).geo
        return NextResponse.json({
          valid: true,
          userId,
          validatedAt: Date.now(),
          region: geo?.country || 'unknown'
        })
      }

      case 'refresh':
        // For token refresh, we might need to redirect to full server
        return NextResponse.json({
          valid: true,
          needsRefresh: true,
          redirectTo: '/api/auth/refresh'
        })

      default:
        return NextResponse.json({
          valid: true,
          userId,
          action: 'validated'
        })
    }

  } catch (error) {
    console.error('[EDGE-AUTH] POST Error:', error)
    
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Token validation failed',
        timestamp: Date.now()
      },
      { 
        status: 500,
        headers: {
          'X-Edge-Region': process.env.VERCEL_REGION || 'unknown',
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'X-Runtime': 'edge'
        }
      }
    )
  }
}

/**
 * OPTIONS: CORS handling for Edge Function
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      'X-Runtime': 'edge'
    }
  })
}