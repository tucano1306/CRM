import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/notifications/mark-all-read
 * Marcar todas las notificaciones como leídas
 * ✅ No requiere body, marca todas isRead = true
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Buscar el usuario autenticado
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { 
        sellers: true,
        clients: true 
      }
    })

    if (!authUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Construir where clause
    const where: any = { isRead: false }
    
    if (authUser.sellers.length > 0) {
      where.sellerId = authUser.sellers[0].id
    } else if (authUser.clients.length > 0) {
      where.clientId = authUser.clients[0].id
    } else {
      return NextResponse.json(
        { error: 'Usuario no tiene rol asignado' },
        { status: 403 }
      )
    }

    // Marcar todas como leídas
    const result = await prisma.notification.updateMany({
      where,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `${result.count} notificaciones marcadas como leídas`,
    })
  } catch (error) {
    console.error('Error marking all as read:', error)
    return NextResponse.json(
      { error: 'Error marcando notificaciones como leídas' },
      { status: 500 }
    )
  }
}
