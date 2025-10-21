// app/api/chat-messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'
import { validateChatTime } from '@/lib/scheduleValidation'
import logger, { LogCategory } from '@/lib/logger'

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

    // 4. Obtener authenticated_user del sender
    const authenticatedUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId }
    })

    if (!authenticatedUser) {
      logger.warn(LogCategory.API, 'Authenticated user not found for chat', { userId })
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // 5. Determinar si el receiver es un seller y validar horario de chat
    const receiverSeller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: receiverId }
        }
      }
    })

    if (receiverSeller) {
      // Validar horario del seller receptor
      const scheduleValidation = await validateChatTime(receiverSeller.id)
      
      if (!scheduleValidation.isValid) {
        logger.warn(LogCategory.VALIDATION, 'Chat outside seller schedule', {
          sellerId: receiverSeller.id,
          message: scheduleValidation.message,
          schedule: scheduleValidation.schedule
        })
        
        return NextResponse.json({
          success: false,
          error: scheduleValidation.message,
          schedule: scheduleValidation.schedule
        }, { status: 403 })
      }

      logger.debug(LogCategory.VALIDATION, 'Chat time validated successfully', {
        sellerId: receiverSeller.id,
        schedule: scheduleValidation.schedule
      })
    }

    // 6. Obtener seller del sender (si aplica)
    const senderSeller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    // 7. Crear mensaje
    const chatMessage = await prisma.chatMessage.create({
      data: {
        senderId: userId,
        receiverId,
        message,
        orderId: orderId || null,
        idempotencyKey: idempotencyKey || null,
        userId: authenticatedUser.id,
        sellerId: senderSeller ? senderSeller.id : null
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

    // Emitir evento CHAT_MESSAGE_SENT
    await eventEmitter.emit({
      type: EventType.CHAT_MESSAGE_SENT,
      timestamp: new Date(),
      userId: userId,
      data: {
        messageId: chatMessage.id,
        senderId: userId,
        receiverId: receiverId,
        message: message,
        orderId: orderId || undefined,
      },
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