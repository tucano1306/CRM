/**
 * Diagnostic API endpoint
 * Tests authentication status in real-time from production
 * GET /api/debug/auth-status
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({
        status: 'no_auth',
        message: 'No user ID from Clerk'
      }, { status: 401 })
    }

    // Check authenticated_users
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: { sellers: true }
    })

    // Simulate getSeller()
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      },
      include: {
        authenticated_users: true
      }
    })

    const diagnosticResult = {
      timestamp: new Date().toISOString(),
      clerkUserId: userId,
      database: {
        authUser: {
          found: !!authUser,
          id: authUser?.id,
          email: authUser?.email,
          role: authUser?.role,
          sellersCount: authUser?.sellers?.length || 0
        },
        seller: {
          found: !!seller,
          id: seller?.id,
          name: seller?.name,
          email: seller?.email,
          isActive: seller?.isActive,
          usersCount: seller?.authenticated_users?.length || 0
        }
      },
      verdict: seller ? 'AUTHORIZED' : 'UNAUTHORIZED',
      prismaClientInfo: {
        environment: process.env.NODE_ENV,
        databaseUrl: process.env.DATABASE_URL?.substring(0, 30) + '...'
      }
    }

    console.log('🔍 [DEBUG /api/debug/auth-status]', diagnosticResult)

    return NextResponse.json(diagnosticResult, { 
      status: seller ? 200 : 403 
    })

  } catch (error) {
    console.error('❌ [DEBUG /api/debug/auth-status] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
