// app/api/chat-messages/route.tsx - CON TIMEOUT
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'

const prisma = new PrismaClient()

/**
 * GET /api/chat-messages?otherUserId=xxx&orderId=xxx
 * Obtener mensajes de chat entre usuario y otro usuario
 * ✅ CON TIMEOUT DE 5 SEGUNDOS
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
    )

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