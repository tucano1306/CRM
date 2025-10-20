// app/api/chat-messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'

const prisma = new PrismaClient()

/**
 * GET /api/chat-messages?userId=xxx&sellerId=xxx
 * Obtener mensajes de chat entre usuario y vendedor
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const otherUserId = searchParams.get('otherUserId')
    const orderId = searchParams.get('orderId')

    // Obtener mensajes
    const where: any = {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ]
    }

    if (orderId) {
      where.orderId = orderId
    }

    const messages = await prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      messages
    })

  } catch (error) {
    console.error('Error en GET /api/chat-messages:', error)
    return NextResponse.json(
      { success: false, error: 'Error obteniendo mensajes' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * POST /api/chat-messages
 * Enviar mensaje de chat
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { receiverId, message, orderId, idempotencyKey } = body

    // 2. Validar datos
    if (!receiverId || !message) {
      return NextResponse.json(
        { success: false, error: 'receiverId y message son requeridos' },
        { status: 400 }
      )
    }

    // 3. Verificar idempotencia
    if (idempotencyKey) {
      const existingMessage = await prisma.chatMessage.findUnique({
        where: { idempotencyKey }
      })

      if (existingMessage) {
        return NextResponse.json({
          success: true,
          message: 'Mensaje ya enviado previamente (idempotent)',
          chatMessage: existingMessage
        })
      }
    }

    // 4. Obtener información del usuario autenticado
    const authenticatedUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId }
    })

    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // 5. Verificar horario de chat si el receptor es vendedor
    const receiverSeller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: receiverId }
        }
      }
    })

    if (receiverSeller) {
      const now = new Date()
      const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase() // ✅ CORREGIDO
      const currentTime = now.toTimeString().slice(0, 5) // "HH:MM"

      const chatSchedule = await prisma.chatSchedule.findFirst({
        where: {
          sellerId: receiverSeller.id,
          dayOfWeek: dayOfWeek as any,
          isActive: true,
          startTime: { lte: currentTime },
          endTime: { gte: currentTime }
        }
      })

      if (!chatSchedule) {
        return NextResponse.json({
          success: false,
          error: 'Fuera del horario de chat del vendedor',
          details: `El vendedor no está disponible para chat en este momento. Día: ${dayOfWeek}, Hora: ${currentTime}`
        }, { status: 403 })
      }
    }

    // 6. Crear mensaje
    const chatMessage = await prisma.chatMessage.create({
      data: {
        senderId: userId,
        receiverId,
        message,
        orderId: orderId || null,
        idempotencyKey: idempotencyKey || null,
        userId: authenticatedUser.id,
        sellerId: receiverSeller ? receiverSeller.id : null
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Mensaje enviado exitosamente',
      chatMessage
    })

  } catch (error) {
    console.error('Error en POST /api/chat-messages:', error)
    return NextResponse.json(
      { success: false, error: 'Error enviando mensaje' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * PATCH /api/chat-messages
 * Marcar mensajes como leídos
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { messageIds } = body

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json(
        { success: false, error: 'messageIds debe ser un array' },
        { status: 400 }
      )
    }

    // Marcar como leídos solo los mensajes donde el usuario actual es el receptor
    await prisma.chatMessage.updateMany({
      where: {
        id: { in: messageIds },
        receiverId: userId
      },
      data: {
        isRead: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Mensajes marcados como leídos'
    })

  } catch (error) {
    console.error('Error en PATCH /api/chat-messages:', error)
    return NextResponse.json(
      { success: false, error: 'Error actualizando mensajes' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}