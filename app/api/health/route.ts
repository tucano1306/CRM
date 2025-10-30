import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/health
 * Health check endpoint with database connectivity check
 */
export async function GET() {
  const startTime = Date.now()
  
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`
    
    const responseTime = Date.now() - startTime
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Food Orders CRM API is running',
      services: {
        database: 'connected',
        api: 'operational'
      },
      performance: {
        responseTime: `${responseTime}ms`
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        message: 'Health check failed',
        services: {
          database: 'disconnected',
          api: 'degraded'
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}
