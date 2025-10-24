import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/notifications
 * Obtener notificaciones del usuario actual (vendedor o comprador)
 * Query params:
 * - unreadOnly: true/false (solo no leídas)
 * - limit: número (default 20)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Determinar si es vendedor o comprador
    const isSeller = authUser.sellers.length > 0
    const isClient = authUser.clients.length > 0

    // Construir query
    const where: any = {}
    
    if (isSeller && authUser.sellers[0]) {
      where.sellerId = authUser.sellers[0].id
    } else if (isClient && authUser.clients[0]) {
      where.clientId = authUser.clients[0].id
    } else {
      return NextResponse.json(
        { error: 'Usuario no tiene rol asignado' },
        { status: 403 }
      )
    }

    if (unreadOnly) {
      where.isRead = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // Contar no leídas
    const unreadWhere = { ...where, isRead: false }
    const unreadCount = await prisma.notification.count({
      where: unreadWhere,
    })

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      userType: isSeller ? 'seller' : 'client',
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Error obteniendo notificaciones' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Crear una nueva notificación (uso interno)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sellerId, clientId, type, title, message, orderId, relatedId, metadata } = body

    // Debe tener al menos un destinatario
    if (!sellerId && !clientId) {
      return NextResponse.json(
        { error: 'Debe especificar sellerId o clientId' },
        { status: 400 }
      )
    }

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Campos requeridos: type, title, message' },
        { status: 400 }
      )
    }

    const notification = await prisma.notification.create({
      data: {
        sellerId,
        clientId,
        type,
        title,
        message,
        orderId,
        relatedId,
        metadata: metadata || null,
      },
    })

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Error creando notificación' },
      { status: 500 }
    )
  }
}
