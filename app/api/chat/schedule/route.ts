import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withPrismaTimeout } from '@/lib/timeout'
import logger, { LogCategory } from '@/lib/logger'
import { z } from 'zod'
import { validateSchema } from '@/lib/validations'

// Schema de validación para horarios de chat
const chatScheduleSchema = z.object({
  MONDAY: z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isActive: z.boolean()
  }).optional(),
  TUESDAY: z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isActive: z.boolean()
  }).optional(),
  WEDNESDAY: z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isActive: z.boolean()
  }).optional(),
  THURSDAY: z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isActive: z.boolean()
  }).optional(),
  FRIDAY: z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isActive: z.boolean()
  }).optional(),
  SATURDAY: z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isActive: z.boolean()
  }).optional(),
  SUNDAY: z.object({
    startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    isActive: z.boolean()
  }).optional()
})

/**
 * GET /api/chat/schedule
 * Obtener horarios de chat del vendedor autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔒 SEGURIDAD: Obtener vendedor
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      return NextResponse.json({ 
        error: 'Solo vendedores pueden acceder a horarios de chat' 
      }, { status: 403 })
    }

    // Obtener horarios con timeout
    const schedules = await withPrismaTimeout(
      () => prisma.chatSchedule.findMany({
        where: { sellerId: seller.id },
        orderBy: { dayOfWeek: 'asc' }
      })
    )

    // Transformar a objeto por día
    const scheduleByDay = schedules.reduce((acc, schedule) => {
      acc[schedule.dayOfWeek] = {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        isActive: schedule.isActive
      }
      return acc
    }, {} as Record<string, any>)

    logger.info(LogCategory.API, 'Chat schedules retrieved', { 
      sellerId: seller.id,
      daysConfigured: Object.keys(scheduleByDay).length
    })

    return NextResponse.json({
      success: true,
      schedules: scheduleByDay
    })

  } catch (error) {
    logger.error(LogCategory.API, 'Error retrieving chat schedules', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener horarios de chat'
    }, { status: 500 })
  }
}

/**
 * PUT /api/chat/schedule
 * Configurar horarios de chat para el vendedor
 * ✅ IDEMPOTENTE (upsert)
 * 
 * Body example:
 * {
 *   "MONDAY": { "startTime": "09:00", "endTime": "17:00", "isActive": true },
 *   "TUESDAY": { "startTime": "09:00", "endTime": "17:00", "isActive": true },
 *   ...
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔒 SEGURIDAD: Obtener vendedor
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      return NextResponse.json({ 
        error: 'Solo vendedores pueden configurar horarios de chat' 
      }, { status: 403 })
    }

    const body = await request.json()

    // ✅ Validación con Zod
    const validation = validateSchema(chatScheduleSchema, body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.errors
      }, { status: 400 })
    }

    const schedules = validation.data

    // Actualizar/crear horarios (IDEMPOTENTE con upsert)
    const updates = []
    
    for (const [day, config] of Object.entries(schedules)) {
      if (!config) continue

      const updatePromise = withPrismaTimeout(
        () => prisma.chatSchedule.upsert({
          where: {
            sellerId_dayOfWeek: {
              sellerId: seller.id,
              dayOfWeek: day as any
            }
          },
          update: {
            startTime: config.startTime,
            endTime: config.endTime,
            isActive: config.isActive,
            updatedAt: new Date()
          },
          create: {
            sellerId: seller.id,
            dayOfWeek: day as any,
            startTime: config.startTime,
            endTime: config.endTime,
            isActive: config.isActive
          }
        })
      )
      
      updates.push(updatePromise)
    }

    await Promise.all(updates)

    logger.info(LogCategory.API, 'Chat schedules updated', {
      sellerId: seller.id,
      daysUpdated: Object.keys(schedules).length,
      userId
    })

    // Retornar horarios actualizados
    const updatedSchedules = await prisma.chatSchedule.findMany({
      where: { sellerId: seller.id },
      orderBy: { dayOfWeek: 'asc' }
    })

    const scheduleByDay = updatedSchedules.reduce((acc, schedule) => {
      acc[schedule.dayOfWeek] = {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        isActive: schedule.isActive
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      success: true,
      message: 'Horarios de chat actualizados exitosamente',
      schedules: scheduleByDay
    })

  } catch (error) {
    logger.error(LogCategory.API, 'Error updating chat schedules', error)
    return NextResponse.json({
      success: false,
      error: 'Error al actualizar horarios de chat'
    }, { status: 500 })
  }
}
