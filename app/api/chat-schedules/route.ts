import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import logger, { LogCategory, createRequestLogger } from '@/lib/logger'
import { validateSchema, createChatScheduleSchema } from '@/lib/validations'

/**
 * GET /api/chat-schedules
 * Obtiene los horarios de chat de un vendedor
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth()
  const requestLogger = createRequestLogger({
    userId: userId || undefined,
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  })
  requestLogger.start('/api/chat-schedules', 'GET')

  try {
    if (!userId) {
      requestLogger.end('/api/chat-schedules', 'GET', 401)
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      requestLogger.end('/api/chat-schedules', 'GET', 400)
      return NextResponse.json(
        { success: false, error: 'sellerId es requerido' },
        { status: 400 }
      )
    }

    const schedules = await prisma.chatSchedule.findMany({
      where: { 
        sellerId,
        isActive: true
      },
      orderBy: {
        dayOfWeek: 'asc'
      }
    })

    requestLogger.end('/api/chat-schedules', 'GET', 200)
    logger.debug(LogCategory.API, 'Chat schedules fetched', {
      userId: userId || undefined,
      sellerId,
      count: schedules.length
    })

    return NextResponse.json({
      success: true,
      data: schedules
    })
  } catch (error) {
    requestLogger.error('/api/chat-schedules', 'GET', error)
    logger.error(LogCategory.API, 'Failed to fetch chat schedules', error, {
      userId: userId || undefined,
      endpoint: '/api/chat-schedules'
    })

    return NextResponse.json(
      { success: false, error: 'Error al obtener horarios de chat' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/chat-schedules
 * Crea o actualiza un horario de chat para un vendedor
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  const requestLogger = createRequestLogger({
    userId: userId || undefined,
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  })
  requestLogger.start('/api/chat-schedules', 'POST')

  try {
    if (!userId) {
      requestLogger.end('/api/chat-schedules', 'POST', 401)
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validar con Zod
    const validation = validateSchema(createChatScheduleSchema, body)

    if (!validation.success) {
      requestLogger.end('/api/chat-schedules', 'POST', 400)
      logger.warn(LogCategory.VALIDATION, 'Invalid chat schedule data', {
        userId: userId || undefined,
        endpoint: '/api/chat-schedules'
      }, { errors: validation.errors })

      return NextResponse.json(
        {
          success: false,
          error: 'Datos de horario inválidos',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    const { sellerId, dayOfWeek, startTime, endTime, isActive } = validation.data

    // Verificar que el seller existe
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId }
    })

    if (!seller) {
      requestLogger.end('/api/chat-schedules', 'POST', 404)
      return NextResponse.json(
        { success: false, error: 'Vendedor no encontrado' },
        { status: 404 }
      )
    }

    // Usar upsert para crear o actualizar
    const schedule = await prisma.chatSchedule.upsert({
      where: {
        sellerId_dayOfWeek: {
          sellerId,
          dayOfWeek
        }
      },
      update: {
        startTime,
        endTime,
        isActive: isActive ?? true
      },
      create: {
        sellerId,
        dayOfWeek,
        startTime,
        endTime,
        isActive: isActive ?? true
      }
    })

    requestLogger.end('/api/chat-schedules', 'POST', 201)
    logger.info(LogCategory.API, 'Chat schedule created/updated', {
      userId: userId || undefined,
      scheduleId: schedule.id,
      sellerId,
      dayOfWeek
    })

    return NextResponse.json({
      success: true,
      message: 'Horario de chat guardado exitosamente',
      data: schedule
    }, { status: 201 })
  } catch (error) {
    requestLogger.error('/api/chat-schedules', 'POST', error)
    logger.error(LogCategory.API, 'Failed to create chat schedule', error, {
      userId: userId || undefined,
      endpoint: '/api/chat-schedules'
    })

    return NextResponse.json(
      { success: false, error: 'Error al guardar horario de chat' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat-schedules
 * Desactiva un horario de chat
 */
export async function DELETE(request: NextRequest) {
  const { userId } = await auth()
  const requestLogger = createRequestLogger({
    userId: userId || undefined,
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  })
  requestLogger.start('/api/chat-schedules', 'DELETE')

  try {
    if (!userId) {
      requestLogger.end('/api/chat-schedules', 'DELETE', 401)
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      requestLogger.end('/api/chat-schedules', 'DELETE', 400)
      return NextResponse.json(
        { success: false, error: 'ID de horario requerido' },
        { status: 400 }
      )
    }

    // Verificar que el schedule existe
    const schedule = await prisma.chatSchedule.findUnique({
      where: { id }
    })

    if (!schedule) {
      requestLogger.end('/api/chat-schedules', 'DELETE', 404)
      return NextResponse.json(
        { success: false, error: 'Horario no encontrado' },
        { status: 404 }
      )
    }

    // Soft delete (desactivar)
    const updatedSchedule = await prisma.chatSchedule.update({
      where: { id },
      data: { isActive: false }
    })

    requestLogger.end('/api/chat-schedules', 'DELETE', 200)
    logger.info(LogCategory.API, 'Chat schedule deactivated', {
      userId: userId || undefined,
      scheduleId: id,
      sellerId: schedule.sellerId
    })

    return NextResponse.json({
      success: true,
      message: 'Horario de chat desactivado exitosamente',
      data: updatedSchedule
    })
  } catch (error) {
    requestLogger.error('/api/chat-schedules', 'DELETE', error)
    logger.error(LogCategory.API, 'Failed to delete chat schedule', error, {
      userId: userId || undefined,
      endpoint: '/api/chat-schedules'
    })

    return NextResponse.json(
      { success: false, error: 'Error al eliminar horario de chat' },
      { status: 500 }
    )
  }
}
