import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/debug/connection-requests
 * Endpoint de debug para verificar solicitudes (ELIMINAR EN PRODUCCIÓN)
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Checking connection requests...')
    
    // Obtener todas las solicitudes
    const requests = await (prisma as any).connectionRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('📊 [DEBUG] Found requests:', requests.length)
    
    // Obtener sellers para referencia
    const sellers = await prisma.seller.findMany({
      select: { id: true, name: true }
    })
    
    return NextResponse.json({
      success: true,
      debug: true,
      requestsCount: requests.length,
      requests: requests.map((r: any) => ({
        id: r.id,
        buyerName: r.buyerName,
        buyerEmail: r.buyerEmail,
        sellerId: r.sellerId,
        status: r.status,
        createdAt: r.createdAt
      })),
      sellers: sellers
    })
    
  } catch (error: any) {
    console.error('❌ [DEBUG] Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
