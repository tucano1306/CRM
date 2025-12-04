import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/notifications/unread-count
 * Obtener cantidad de notificaciones no leídas
 */
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ count: 0 })
    }

    // Buscar si es vendedor
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    // Buscar si es cliente
    const client = await prisma.client.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    let count = 0

    if (seller) {
      // Contar notificaciones no leídas del vendedor
      count = await prisma.notification.count({
        where: {
          sellerId: seller.id,
          isRead: false
        }
      })
    } else if (client) {
      // Contar notificaciones no leídas del cliente
      count = await prisma.notification.count({
        where: {
          clientId: client.id,
          isRead: false
        }
      })
    }

    return NextResponse.json({ 
      success: true,
      count 
    })
  } catch (error) {
    console.error('Error obteniendo conteo de notificaciones:', error)
    return NextResponse.json({ count: 0 })
  }
}
