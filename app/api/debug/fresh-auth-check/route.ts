/**
 * Fresh diagnostic endpoint - NO CACHE
 * GET /api/debug/fresh-auth-check
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Create a COMPLETELY fresh Prisma instance
const freshPrisma = new PrismaClient({
  log: ['error', 'warn'],
})

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({
        status: 'no_auth',
        message: 'No user ID from Clerk'
      }, { status: 401 })
    }

    // Use ONLY raw SQL - bypass ALL Prisma abstractions
    const rawUsers = await freshPrisma.$queryRaw<Array<{
      id: string
      authId: string
      email: string
      role: string
      createdAt: Date
    }>>`
      SELECT id, "authId", email, role::text, "createdAt"
      FROM authenticated_users
      WHERE "authId" = ${userId}
      ORDER BY "createdAt" DESC
    `

    const rawSellers = await freshPrisma.$queryRaw<Array<{
      seller_id: string
      seller_name: string
      seller_email: string
      user_id: string
    }>>`
      SELECT 
        s.id as seller_id,
        s.name as seller_name,
        s.email as seller_email,
        su."B" as user_id
      FROM sellers s
      INNER JOIN "_SellerUsers" su ON su."A" = s.id
      INNER JOIN authenticated_users au ON au.id = su."B"
      WHERE au."authId" = ${userId}
    `

    const result = {
      timestamp: new Date().toISOString(),
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || 'unknown',
      region: process.env.VERCEL_REGION || 'unknown',
      clerkUserId: userId,
      database: {
        rawQueryResults: {
          users: rawUsers,
          sellers: rawSellers
        },
        userCount: rawUsers.length,
        sellerCount: rawSellers.length
      },
      verdict: rawSellers.length > 0 ? 'AUTHORIZED' : 'UNAUTHORIZED',
      cacheHeaders: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }

    console.log('🔍 [FRESH AUTH CHECK]', JSON.stringify(result, null, 2))

    await freshPrisma.$disconnect()

    return NextResponse.json(result, { 
      status: rawSellers.length > 0 ? 200 : 403,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    })

  } catch (error) {
    console.error('❌ [FRESH AUTH CHECK] Error:', error)
    
    await freshPrisma.$disconnect()
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
