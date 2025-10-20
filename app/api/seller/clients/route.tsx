import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()

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

    if (!seller) {
      return NextResponse.json({ 
        success: false, 
        error: 'No eres vendedor' 
      })
    }

    // Obtener clientes del vendedor con sus usuarios autenticados
    const clients = await prisma.client.findMany({
      where: { sellerId: seller.id },
      include: {
        authenticated_users: true
      },
      orderBy: { name: 'asc' }
    })

    // Obtener mensajes no leídos por cliente
    const clientsWithUnread = await Promise.all(
      clients.map(async (client) => {
        const clientAuth = client.authenticated_users[0]
        
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

    return NextResponse.json({
      success: true,
      clients: validClients
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
