import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()
    console.log('🔍 [1] userId del vendedor:', userId)

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar vendedor
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    console.log('🔍 [2] Seller encontrado:', seller?.id, seller?.name)

    if (!seller) {
      return NextResponse.json({ 
        success: false, 
        error: 'No eres vendedor',
        debug: { userId }
      })
    }

    // Obtener clientes del vendedor
    const clients = await prisma.client.findMany({
      where: { sellerId: seller.id },
      include: {
        authenticated_users: true
      },
      orderBy: { name: 'asc' }
    })

    console.log('🔍 [3] Clientes encontrados:', clients.length)

    // Obtener mensajes no leídos por cliente
    const clientsWithUnread = await Promise.all(
      clients.map(async (client) => {
        const clientAuth = client.authenticated_users[0]
        
        console.log(`🔍 [4] Cliente "${client.name}":`, {
          id: client.id,
          email: client.email,
          hasAuth: !!clientAuth,
          clerkUserId: clientAuth?.authId
        })
        
        if (!clientAuth) {
          return {
            id: client.id,
            name: client.name,
            email: client.email,
            clerkUserId: null,
            unreadCount: 0
          }
        }

        const unreadCount = await prisma.chatMessage.count({
          where: {
            senderId: clientAuth.authId,
            receiverId: userId,
            isRead: false
          }
        })

        console.log(`🔍 [5] Mensajes no leídos de "${client.name}":`, unreadCount)

        return {
          id: client.id,
          name: client.name,
          email: client.email,
          clerkUserId: clientAuth.authId,
          unreadCount
        }
      })
    )

    // Filtrar solo clientes con clerkUserId
    const validClients = clientsWithUnread.filter(c => c.clerkUserId)

    console.log('🔍 [6] Clientes válidos (con authId):', validClients.length)

    return NextResponse.json({
      success: true,
      clients: validClients
    })
  } catch (error) {
    console.error('❌ Error en GET /api/seller/clients:', error)
    return NextResponse.json({ 
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
