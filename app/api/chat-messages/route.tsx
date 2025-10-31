// app/api/chat-messages/route.tsx - CON TIMEOUT
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'
import { notifyChatMessage } from '@/lib/notifications'

const prisma = new PrismaClient()

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
    const messages = await withPrismaTimeout(
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
    )

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
    await prisma.$disconnect()
  }
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

    // 6. ✅ Validar horarios de chat (si el sender es seller) CON TIMEOUT
    // ⚠️ DESHABILITADO PARA DESARROLLO - Descomentar en producción si se necesita
    /*
    if (senderSeller) {
      const now = new Date()
      const dayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][now.getDay()]
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

      const activeSchedule = await withPrismaTimeout(
        () => prisma.chatSchedule.findFirst({
          where: {
            sellerId: senderSeller.id,
            dayOfWeek: dayOfWeek as any,
            isActive: true,
            startTime: { lte: currentTime },
            endTime: { gte: currentTime }
          }
        })
      )

      if (!activeSchedule) {
        return NextResponse.json({
          success: false,
          error: `No puedes enviar mensajes fuera del horario de chat configurado. 
Día: ${dayOfWeek}, Hora actual: ${currentTime}`
        }, { status: 403 })
      }
    }
    */

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
      // Obtener información del receptor
      const receiverAuth = await prisma.authenticated_users.findUnique({
        where: { authId: receiverId },
        include: {
          sellers: true,
          clients: true
        }
      })

      if (receiverAuth) {
        const senderName = authenticatedUser.name || 'Usuario'
        const messagePreview = body.attachmentUrl 
          ? `📎 ${body.attachmentName || 'Archivo adjunto'}`
          : message

        // Si el receptor es vendedor, crear notificación para él
        if (receiverAuth.sellers.length > 0) {
          await notifyChatMessage(
            receiverAuth.sellers[0].id,
            senderName,
            messagePreview
          )
        }
        
        // Si el receptor es cliente, crear notificación para él
        if (receiverAuth.clients.length > 0) {
          const clientId = receiverAuth.clients[0].id
          
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
      }
    } catch (notificationError) {
      // No fallar el envío del mensaje si falla la notificación
      console.error('Error creando notificación de chat:', notificationError)
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
    await prisma.$disconnect()
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
    await prisma.$disconnect()
  }
}