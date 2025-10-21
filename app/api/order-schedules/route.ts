import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import logger, { LogCategory, createRequestLogger } from '@/lib/logger'
import { validateSchema, createOrderScheduleSchema, paginationSchema } from '@/lib/validations'

/**
 * GET /api/order-schedules
 * Obtiene los horarios de pedidos de un vendedor
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth()
  const requestLogger = createRequestLogger({
    userId: userId || undefined,
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  })
  requestLogger.start('/api/order-schedules', 'GET')

  try {
    if (!userId) {
      requestLogger.end('/api/order-schedules', 'GET', 401)
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      requestLogger.end('/api/order-schedules', 'GET', 400)
      return NextResponse.json(
        { success: false, error: 'sellerId es requerido' },
        { status: 400 }
      )
    }

    const schedules = await prisma.orderSchedule.findMany({
      where: { 
        sellerId,
        isActive: true
      },
      orderBy: {
        dayOfWeek: 'asc'
      }
    })

    requestLogger.end('/api/order-schedules', 'GET', 200)
    logger.debug(LogCategory.API, 'Order schedules fetched', {
      userId: userId || undefined,
      sellerId,
      count: schedules.length
    })

    return NextResponse.json({
      success: true,
      data: schedules
    })
  } catch (error) {
    requestLogger.error('/api/order-schedules', 'GET', error)
    logger.error(LogCategory.API, 'Failed to fetch order schedules', error, {
      userId: userId || undefined,
      endpoint: '/api/order-schedules'
    })

    return NextResponse.json(
      { success: false, error: 'Error al obtener horarios' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/order-schedules
 * Crea o actualiza un horario de pedidos para un vendedor
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  const requestLogger = createRequestLogger({
    userId: userId || undefined,
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  })
  requestLogger.start('/api/order-schedules', 'POST')

  try {
    if (!userId) {
      requestLogger.end('/api/order-schedules', 'POST', 401)
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validar con Zod
    const validation = validateSchema(createOrderScheduleSchema, body)

    if (!validation.success) {
      requestLogger.end('/api/order-schedules', 'POST', 400)
      logger.warn(LogCategory.VALIDATION, 'Invalid order schedule data', {
        userId,
        endpoint: '/api/order-schedules'
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
      requestLogger.end('/api/order-schedules', 'POST', 404)
      return NextResponse.json(
        { success: false, error: 'Vendedor no encontrado' },
        { status: 404 }
      )
    }

    // Validar formato de tiempo (HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      requestLogger.end('/api/order-schedules', 'POST', 400)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Formato de tiempo inválido. Use HH:MM (00:00 - 23:59)' 
        },
        { status: 400 }
      )
    }

    // Validar que startTime sea antes de endTime
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    if (startMinutes >= endMinutes) {
      requestLogger.end('/api/order-schedules', 'POST', 400)
      return NextResponse.json(
        { 
          success: false, 
          error: 'La hora de inicio debe ser anterior a la hora de fin' 
        },
        { status: 400 }
      )
    }

    // Usar upsert para crear o actualizar
    const schedule = await prisma.orderSchedule.upsert({
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

    requestLogger.end('/api/order-schedules', 'POST', 201)
    logger.info(LogCategory.API, 'Order schedule created/updated', {
      userId: userId || undefined,
      scheduleId: schedule.id,
      sellerId,
      dayOfWeek
    })

    return NextResponse.json({
      success: true,
      message: 'Horario de pedidos guardado exitosamente',
      data: schedule
    }, { status: 201 })
  } catch (error) {
    requestLogger.error('/api/order-schedules', 'POST', error)
    logger.error(LogCategory.API, 'Failed to create order schedule', error, {
      userId: userId || undefined,
      endpoint: '/api/order-schedules'
    })

    return NextResponse.json(
      { success: false, error: 'Error al guardar horario' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/order-schedules
 * Desactiva un horario de pedidos
 */
export async function DELETE(request: NextRequest) {
  const { userId } = await auth()
  const requestLogger = createRequestLogger({
    userId: userId || undefined,
    ip: request.headers.get('x-forwarded-for') || 'unknown'
  })
  requestLogger.start('/api/order-schedules', 'DELETE')

  try {
    if (!userId) {
      requestLogger.end('/api/order-schedules', 'DELETE', 401)
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      requestLogger.end('/api/order-schedules', 'DELETE', 400)
      return NextResponse.json(
        { success: false, error: 'ID de horario requerido' },
        { status: 400 }
      )
    }

    // Verificar que el schedule existe y pertenece al usuario
    const schedule = await prisma.orderSchedule.findUnique({
      where: { id }
    })

    if (!schedule) {
      requestLogger.end('/api/order-schedules', 'DELETE', 404)
      return NextResponse.json(
        { success: false, error: 'Horario no encontrado' },
        { status: 404 }
      )
    }

    // Soft delete (desactivar)
    const updatedSchedule = await prisma.orderSchedule.update({
      where: { id },
      data: { isActive: false }
    })

    requestLogger.end('/api/order-schedules', 'DELETE', 200)
    logger.info(LogCategory.API, 'Order schedule deactivated', {
      userId: userId || undefined,
      scheduleId: id,
      sellerId: schedule.sellerId
    })

    return NextResponse.json({
      success: true,
      message: 'Horario desactivado exitosamente',
      data: updatedSchedule
    })
  } catch (error) {
    requestLogger.error('/api/order-schedules', 'DELETE', error)
    logger.error(LogCategory.API, 'Failed to delete order schedule', error, {
      userId: userId || undefined,
      endpoint: '/api/order-schedules'
    })

    return NextResponse.json(
      { success: false, error: 'Error al eliminar horario' },
      { status: 500 }
    )
  }
}
