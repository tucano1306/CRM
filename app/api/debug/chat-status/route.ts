import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/debug/chat-status
 * Diagnosticar problemas del chat
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'No autenticado',
        step: 'auth'
      })
    }

    // Buscar el usuario autenticado
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: {
        sellers: true,
        clients: {
          include: {
            seller: {
              include: {
                authenticated_users: true
              }
            }
          }
        }
      }
    })

    if (!authUser) {
      return NextResponse.json({
        success: false,
        error: 'Usuario no encontrado en authenticated_users',
        userId,
        step: 'find_user'
      })
    }

    const isSeller = authUser.sellers.length > 0
    const isClient = authUser.clients.length > 0

    // Obtener contactos disponibles para chat
    let chatContacts: any[] = []

    if (isSeller) {
      // Vendedor puede chatear con sus clientes
      const seller = authUser.sellers[0]
      const clients = await prisma.client.findMany({
        where: { sellerId: seller.id },
        include: {
          authenticated_users: {
            select: {
              id: true,
              authId: true,
              name: true,
              email: true
            }
          }
        }
      })
      
      chatContacts = clients.map(c => ({
        type: 'client',
        clientId: c.id,
        clientName: c.name,
        authUsers: c.authenticated_users
      }))
    }

    if (isClient) {
      // Cliente puede chatear con su vendedor
      const client = authUser.clients[0]
      if (client.seller) {
        chatContacts.push({
          type: 'seller',
          sellerId: client.seller.id,
          sellerName: client.seller.name,
          authUsers: client.seller.authenticated_users.map(au => ({
            id: au.id,
            authId: au.authId,
            name: au.name,
            email: au.email
          }))
        })
      }
    }

    // Contar mensajes recientes
    const recentMessages = await prisma.chatMessage.count({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ],
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Últimas 24 horas
        }
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.id,
        authId: authUser.authId,
        name: authUser.name,
        email: authUser.email,
        role: authUser.role
      },
      isSeller,
      isClient,
      sellersCount: authUser.sellers.length,
      clientsCount: authUser.clients.length,
      chatContacts,
      recentMessagesCount: recentMessages,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Debug chat error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    }, { status: 500 })
  }
}
