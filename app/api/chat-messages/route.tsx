// app/api/chat-messages/route.tsx - CON TIMEOUT
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'
import { notifyChatMessage } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db-retry'
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'
import { sendChatMessageEvent, sendChatReadEvent } from '@/lib/supabase-server'

/**
 * GET /api/chat-messages?otherUserId=xxx&orderId=xxx
 * Obtener mensajes de chat entre usuario y otro usuario
 * ✅ CON TIMEOUT DE 5 SEGUNDOS
 * ✅ CON VALIDACIÓN DE RELACIÓN SELLER-CLIENT
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

    if (!otherUserId) {
      return NextResponse.json(
        { success: false, error: 'otherUserId es requerido' },
        { status: 400 }
      )
    }

    // 🔒 SEGURIDAD: Validar que el usuario tiene relación con el otro usuario
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: {
        sellers: true,
        clients: true
      }
    })

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Determinar si es vendedor o cliente
    const isSeller = authUser.sellers.length > 0
    const isClient = authUser.clients.length > 0

    // Validar relación seller-client
    let hasPermission = false

    if (isSeller) {
      // Si es vendedor, verificar que el otro usuario es uno de sus clientes
      const seller = authUser.sellers[0]
      const otherUserClient = await prisma.client.findFirst({
        where: {
          sellerId: seller.id,
          authenticated_users: {
            some: { authId: otherUserId }
          }
        }
      })
      hasPermission = !!otherUserClient
    } else if (isClient) {
      // Si es cliente, verificar que el otro usuario es su vendedor
      const client = authUser.clients[0]
      const clientWithSeller = await prisma.client.findUnique({
        where: { id: client.id },
        include: {
          seller: {
            include: {
              authenticated_users: true
            }
          }
        }
      })
      
      if (clientWithSeller?.seller) {
        hasPermission = clientWithSeller.seller.authenticated_users.some(
          auth => auth.authId === otherUserId
        )
      }
    }

    if (!hasPermission) {
      console.warn('🚨 SECURITY: Unauthorized chat access attempt', {
        userId,
        otherUserId,
        isSeller,
        isClient
      })
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para ver estos mensajes' },
        { status: 403 }
      )
    }

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

    // ✅ APLICAR TIMEOUT A OPERACIÓN DE PRISMA
    const messages = await withDbRetry(() => withPrismaTimeout(
      () => prisma.chatMessage.findMany({
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
    ))

    return NextResponse.json({
      success: true,
      messages
    })

  } catch (error) {
    console.error('Error en GET /api/chat-messages:', error)
    
    // ✅ MANEJO ESPECÍFICO DE TIMEOUT
    if (error instanceof TimeoutError) {
      const timeoutResponse = handleTimeoutError(error)
      return NextResponse.json(
        { success: false, ...timeoutResponse },
        { status: timeoutResponse.status }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error obteniendo mensajes' },
      { status: 500 }
    )
  } finally {
    // prisma singleton
  }
}

/**
 * Get message preview for notifications
 */
function getMessagePreview(body: any, message: string): string {
  return body.attachmentUrl 
    ? `📎 ${body.attachmentName || 'Archivo adjunto'}`
    : message
}

/**
 * Create notification for seller receiver
 */
async function notifySellerReceiver(
  sellerId: string,
  senderName: string,
  messagePreview: string
): Promise<void> {
  await notifyChatMessage(sellerId, senderName, messagePreview)
}

/**
 * Create notification for client receiver
 */
async function notifyClientReceiver(
  clientId: string,
  senderName: string,
  messagePreview: string
): Promise<void> {
  await prisma.notification.create({
    data: {
      clientId,
      type: 'CHAT_MESSAGE',
      title: '💬 Nuevo Mensaje',
      message: `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      metadata: {
        senderName,
        messagePreview: messagePreview.substring(0, 100),
      }
    }
  })
}

/**
 * Handle receiver notification creation
 */
async function createReceiverNotification(
  receiverId: string,
  senderName: string,
  body: any,
  message: string
): Promise<void> {
  const receiverAuth = await prisma.authenticated_users.findUnique({
    where: { authId: receiverId },
    include: {
      sellers: true,
      clients: true
    }
  })

  if (!receiverAuth) return

  const messagePreview = getMessagePreview(body, message)

  // Notify seller if receiver is a seller
  if (receiverAuth.sellers.length > 0) {
    await notifySellerReceiver(receiverAuth.sellers[0].id, senderName, messagePreview)
  }
  
  // Notify client if receiver is a client
  if (receiverAuth.clients.length > 0) {
    await notifyClientReceiver(receiverAuth.clients[0].id, senderName, messagePreview)
  }
}

/**
 * Emit chat message event to event system
 */
async function emitChatMessageEvent(
  chatMessageId: string,
  userId: string,
  receiverId: string,
  message: string,
  orderId: string | null,
  body: any
): Promise<void> {
  await eventEmitter.emit({
    type: EventType.CHAT_MESSAGE_SENT,
    timestamp: new Date(),
    userId: userId,
    data: {
      messageId: chatMessageId,
      senderId: userId,
      receiverId: receiverId,
      content: message,
      orderId: orderId || undefined,
      hasAttachment: !!body.attachmentUrl,
      attachmentType: body.attachmentType || undefined
    }
  })
}

/**
 * Send realtime chat event
 */
async function sendRealtimeChatNotification(
  userId: string,
  receiverId: string,
  chatMessage: any,
  message: string,
  senderName: string,
  body: any,
  orderId: string | null
): Promise<void> {
  await sendChatMessageEvent(userId, receiverId, {
    messageId: chatMessage.id,
    message: message,
    senderName: senderName,
    attachmentUrl: body.attachmentUrl || null,
    attachmentType: body.attachmentType || null,
    orderId: orderId || null,
    createdAt: chatMessage.createdAt.toISOString()
  })
}

/**
 * POST /api/chat-messages
 * Enviar mensaje de chat
 * ✅ CON TIMEOUT DE 5 SEGUNDOS
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

    console.log('📨 POST /api/chat-messages:', {
      senderId: userId,
      receiverId,
      message: message?.substring(0, 50),
      orderId,
      idempotencyKey
    })

    // 2. Validar datos
    if (!receiverId || !message) {
      console.error('❌ Faltan datos:', { receiverId, message })
      return NextResponse.json(
        { success: false, error: 'receiverId y message son requeridos' },
        { status: 400 }
      )
    }

    // 3. ✅ Verificar idempotencia CON TIMEOUT
    if (idempotencyKey) {
      const existingMessage = await withPrismaTimeout(
        () => prisma.chatMessage.findUnique({
          where: { idempotencyKey }
        })
      )

      if (existingMessage) {
        return NextResponse.json({
          success: true,
          message: 'Mensaje ya enviado previamente (idempotent)',
          chatMessage: existingMessage
        })
      }
    }

    // 4. ✅ Obtener authenticated_user CON TIMEOUT
    const authenticatedUser = await withPrismaTimeout(
      () => prisma.authenticated_users.findFirst({
        where: { authId: userId }
      })
    )

    if (!authenticatedUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // 5. ✅ Obtener seller si aplica CON TIMEOUT
    const senderSeller = await withPrismaTimeout(
      () => prisma.seller.findFirst({
        where: {
          authenticated_users: {
            some: { authId: userId }
          }
        }
      })
    )

    // 6. (Chat schedule validation disabled for development)

    // 7. ✅ Crear mensaje CON TIMEOUT
    const chatMessage = await withPrismaTimeout(
      () => prisma.chatMessage.create({
        data: {
          senderId: userId,
          receiverId,
          message,
          orderId: orderId || null,
          idempotencyKey: idempotencyKey || null,
          userId: authenticatedUser.id,
          sellerId: senderSeller ? senderSeller.id : null,
          // Campos de archivo adjunto
          attachmentUrl: body.attachmentUrl || null,
          attachmentType: body.attachmentType || null,
          attachmentName: body.attachmentName || null,
          attachmentSize: body.attachmentSize || null
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
    )

    // 8. ✅ Crear notificación para el receptor
    try {
      const senderName = authenticatedUser.name || 'Usuario'
      await createReceiverNotification(receiverId, senderName, body, message)
    } catch (notificationError) {
      // No fallar el envío del mensaje si falla la notificación
      console.error('Error creando notificación de chat:', notificationError)
    }

    // 9. 🎉 Emitir evento CHAT_MESSAGE_SENT para el sistema event-driven
    try {
      await emitChatMessageEvent(chatMessage.id, userId, receiverId, message, orderId, body)
    } catch (eventError) {
      // No bloquear la respuesta si falla el evento
      console.error('Error emitting CHAT_MESSAGE_SENT event:', eventError)
    }

    // 10. 📡 ENVIAR EVENTO REALTIME al receptor
    try {
      const senderName = authenticatedUser.name || 'Usuario'
      await sendRealtimeChatNotification(userId, receiverId, chatMessage, message, senderName, body, orderId)
    } catch (realtimeError) {
      // No bloquear si falla realtime
      console.error('Error sending realtime chat event:', realtimeError)
    }

    return NextResponse.json({
      success: true,
      message: 'Mensaje enviado exitosamente',
      chatMessage
    })

  } catch (error) {
    console.error('Error en POST /api/chat-messages:', error)
    
    // ✅ MANEJO ESPECÍFICO DE TIMEOUT
    if (error instanceof TimeoutError) {
      const timeoutResponse = handleTimeoutError(error)
      return NextResponse.json(
        { success: false, ...timeoutResponse },
        { status: timeoutResponse.status }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error enviando mensaje' },
      { status: 500 }
    )
  } finally {
    // prisma singleton
  }
}

/**
 * PATCH /api/chat-messages
 * Marcar mensajes como leídos
 * ✅ CON TIMEOUT DE 5 SEGUNDOS
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

    // ✅ Marcar como leídos CON TIMEOUT
    await withPrismaTimeout(
      () => prisma.chatMessage.updateMany({
        where: {
          id: { in: messageIds },
          receiverId: userId
        },
        data: {
          isRead: true
        }
      })
    )

    // 🎉 Emitir evento CHAT_MESSAGE_READ para el sistema event-driven
    try {
      await eventEmitter.emit({
        type: EventType.CHAT_MESSAGE_READ,
        timestamp: new Date(),
        userId: userId,
        data: {
          messageIds: messageIds,
          readBy: userId,
          readAt: new Date()
        }
      })
    } catch (eventError) {
      // No bloquear la respuesta si falla el evento
      console.error('Error emitting CHAT_MESSAGE_READ event:', eventError)
    }

    // 📡 ENVIAR EVENTO REALTIME de mensajes leídos
    // Necesitamos saber quién es el sender para notificarle
    try {
      // Obtener el senderId del primer mensaje para notificar
      const firstMessage = await prisma.chatMessage.findFirst({
        where: { id: { in: messageIds } },
        select: { senderId: true }
      })
      
      if (firstMessage && firstMessage.senderId !== userId) {
        await sendChatReadEvent(firstMessage.senderId, userId, messageIds)
      }
    } catch (realtimeError) {
      console.error('Error sending realtime read event:', realtimeError)
    }

    return NextResponse.json({
      success: true,
      message: 'Mensajes marcados como leídos'
    })

  } catch (error) {
    console.error('Error en PATCH /api/chat-messages:', error)
    
    // ✅ MANEJO ESPECÍFICO DE TIMEOUT
    if (error instanceof TimeoutError) {
      const timeoutResponse = handleTimeoutError(error)
      return NextResponse.json(
        { success: false, ...timeoutResponse },
        { status: timeoutResponse.status }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Error actualizando mensajes' },
      { status: 500 }
    )
  } finally {
    // prisma singleton
  }
}