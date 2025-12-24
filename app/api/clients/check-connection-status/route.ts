import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/clients/check-connection-status
 * Verifica si un comprador fue aceptado por un vendedor
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado', wasAccepted: false },
        { status: 401 }
      )
    }

    // Buscar el authenticated_user
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { 
        clients: {
          include: {
            seller: true
          }
        }
      }
    })

    if (!authUser) {
      return NextResponse.json({
        wasAccepted: false,
        justAccepted: false
      })
    }

    // Verificar si tiene cliente asociado
    const hasClient = authUser.clients && authUser.clients.length > 0

    if (!hasClient) {
      return NextResponse.json({
        wasAccepted: false,
        justAccepted: false
      })
    }

    const client = authUser.clients[0]

    // Buscar la connection request más reciente
    const recentRequest = await (prisma as any).connectionRequest.findFirst({
      where: {
        buyerClerkId: userId,
        status: 'ACCEPTED'
      },
      orderBy: {
        respondedAt: 'desc'
      }
    })

    // Verificar si fue aceptado recientemente (últimos 30 segundos)
    const justAccepted = recentRequest?.respondedAt 
      ? (Date.now() - new Date(recentRequest.respondedAt).getTime()) < 30000
      : false

    return NextResponse.json({
      wasAccepted: true,
      justAccepted,
      seller: client.seller ? {
        id: client.seller.id,
        name: client.seller.name
      } : null,
      client: {
        id: client.id,
        name: client.name
      }
    })

  } catch (error) {
    console.error('Error checking connection status:', error)
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        wasAccepted: false,
        justAccepted: false
      },
      { status: 200 } // Return 200 to prevent UI errors
    )
  }
}
