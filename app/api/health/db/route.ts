// app/api/health/db/route.ts
// Single DB health check endpoint. Measures a trivial query latency.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const start = performance.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    const latencyMs = performance.now() - start
    return NextResponse.json({
      status: 'ok',
      db: 'up',
      latencyMs: Number(latencyMs.toFixed(2)),
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    const latencyMs = performance.now() - start
    return NextResponse.json({
      status: 'error',
      db: 'down',
      latencyMs: Number(latencyMs.toFixed(2)),
      message: (error as Error).message
    }, { status: 500 })
  }
}
