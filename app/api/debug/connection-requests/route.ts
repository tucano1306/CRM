import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/debug/connection-requests
 * Endpoint de debug para verificar solicitudes (ELIMINAR EN PRODUCCIÓN)
 */
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 [DEBUG] Checking connection requests...')
    
    // También verificar auth
    let authInfo: any = { userId: null, error: null }
    let authUserInfo: any = null
    
    try {
      const { userId } = await auth()
      authInfo.userId = userId
      
      if (userId) {
        const authUser = await prisma.authenticated_users.findUnique({
          where: { authId: userId },
          include: { sellers: true }
        })
        authUserInfo = authUser ? {
          id: authUser.id,
          email: authUser.email,
          name: authUser.name,
          role: authUser.role,
          sellersCount: authUser.sellers?.length || 0,
          sellers: authUser.sellers?.map(s => ({ id: s.id, name: s.name }))
        } : null
      }
    } catch (e: any) {
      authInfo.error = e.message
    }
    
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
      auth: authInfo,
      authUser: authUserInfo,
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
