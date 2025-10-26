import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/notifications/[id]
 * Marcar notificación como leída
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id: notificationId } = await params

    // Verificar que la notificación pertenece al usuario
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
    const where: any = { id: notificationId }
    
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

    // Verificar que la notificación existe y pertenece al usuario
    const notification = await prisma.notification.findFirst({ where })

    if (!notification) {
      return NextResponse.json(
        { error: 'Notificación no encontrada' },
        { status: 404 }
      )
    }

    // Marcar como leída
    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      notification: updated,
    })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: 'Error actualizando notificación' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/notifications/[id]
 * Eliminar una notificación
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id: notificationId } = await params

    // Verificar que la notificación pertenece al usuario
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
    const where: any = { id: notificationId }
    
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

    // Eliminar notificación
    await prisma.notification.deleteMany({ where })

    return NextResponse.json({
      success: true,
      message: 'Notificación eliminada',
    })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: 'Error eliminando notificación' },
      { status: 500 }
    )
  }
}
