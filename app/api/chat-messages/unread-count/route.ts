import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/chat-messages/unread-count
 * Obtener cantidad de mensajes no leídos del usuario actual
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Contar mensajes no leídos donde el usuario actual es el receptor
    const unreadCount = await prisma.chatMessage.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    })

    return NextResponse.json({
      success: true,
      unreadCount
    })

  } catch (error) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json(
      { success: false, error: 'Error obteniendo mensajes no leídos' },
      { status: 500 }
    )
  }
}
