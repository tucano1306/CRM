/**
 * Schedule Validation Utilities
 * 
 * Funciones para validar horarios de pedidos y chat
 * basados en los schedules configurados por vendedor
 */

import { prisma } from './prisma'
import logger, { LogCategory } from './logger'

// ============================================================================
// TIPOS
// ============================================================================

export interface TimeValidationResult {
  isValid: boolean
  message?: string
  schedule?: {
    dayOfWeek: string
    startTime: string
    endTime: string
  }
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

// ============================================================================
// HELPERS DE TIEMPO
// ============================================================================

/**
 * Obtiene el día de la semana como DayOfWeek enum
 */
export function getDayOfWeek(date: Date = new Date()): DayOfWeek {
  const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY']
  return days[date.getDay()]
}

/**
 * Convierte una fecha a formato HH:MM
 */
export function getTimeString(date: Date = new Date()): string {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Convierte HH:MM a minutos desde medianoche
 */
export function timeToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * Verifica si un tiempo está dentro de un rango
 */
export function isTimeInRange(
  currentTime: string,
  startTime: string,
  endTime: string
): boolean {
  const current = timeToMinutes(currentTime)
  const start = timeToMinutes(startTime)
  const end = timeToMinutes(endTime)

  return current >= start && current <= end
}

// ============================================================================
// VALIDACIÓN DE ORDER SCHEDULES
// ============================================================================

/**
 * Valida si se puede crear un pedido en el horario actual
 * basado en el OrderSchedule del vendedor
 */
export async function validateOrderTime(
  sellerId: string,
  date: Date = new Date()
): Promise<TimeValidationResult> {
  try {
    const dayOfWeek = getDayOfWeek(date)
    const currentTime = getTimeString(date)

    // Buscar el schedule para este día y vendedor
    const schedule = await prisma.orderSchedule.findFirst({
      where: {
        sellerId,
        dayOfWeek,
        isActive: true
      }
    })

    // Si no hay schedule configurado, permitir
    if (!schedule) {
      logger.debug(LogCategory.VALIDATION, 'No order schedule found, allowing order', {
        sellerId,
        dayOfWeek,
        currentTime
      })

      return {
        isValid: true,
        message: 'No hay restricciones de horario configuradas'
      }
    }

    // Verificar si el tiempo actual está dentro del rango
    const isInRange = isTimeInRange(currentTime, schedule.startTime, schedule.endTime)

    if (isInRange) {
      logger.debug(LogCategory.VALIDATION, 'Order time is valid', {
        sellerId,
        dayOfWeek,
        currentTime,
        scheduleStart: schedule.startTime,
        scheduleEnd: schedule.endTime
      })

      return {
        isValid: true,
        schedule: {
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        }
      }
    } else {
      logger.warn(LogCategory.VALIDATION, 'Order time outside schedule', {
        sellerId,
        dayOfWeek,
        currentTime,
        scheduleStart: schedule.startTime,
        scheduleEnd: schedule.endTime
      })

      return {
        isValid: false,
        message: `Los pedidos para este vendedor solo se aceptan de ${schedule.startTime} a ${schedule.endTime}`,
        schedule: {
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        }
      }
    }
  } catch (error) {
    logger.error(LogCategory.VALIDATION, 'Error validating order time', error, {
      sellerId,
      date: date.toISOString()
    })

    // En caso de error, permitir el pedido pero loggear el problema
    return {
      isValid: true,
      message: 'Error al validar horario, pedido permitido por defecto'
    }
  }
}

/**
 * Obtiene el siguiente horario disponible para pedidos
 */
export async function getNextAvailableOrderTime(
  sellerId: string
): Promise<{ dayOfWeek: DayOfWeek; startTime: string } | null> {
  try {
    const today = getDayOfWeek()
    const daysOrder: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
    
    const todayIndex = daysOrder.indexOf(today)
    
    // Buscar en los próximos 7 días
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (todayIndex + i) % 7
      const nextDay = daysOrder[nextDayIndex]
      
      const schedule = await prisma.orderSchedule.findFirst({
        where: {
          sellerId,
          dayOfWeek: nextDay,
          isActive: true
        }
      })
      
      if (schedule) {
        return {
          dayOfWeek: schedule.dayOfWeek as DayOfWeek,
          startTime: schedule.startTime
        }
      }
    }
    
    return null
  } catch (error) {
    logger.error(LogCategory.VALIDATION, 'Error getting next available order time', error, {
      sellerId
    })
    return null
  }
}

// ============================================================================
// VALIDACIÓN DE CHAT SCHEDULES
// ============================================================================

/**
 * Valida si se puede enviar un mensaje de chat en el horario actual
 * basado en el ChatSchedule del vendedor
 */
export async function validateChatTime(
  sellerId: string,
  date: Date = new Date()
): Promise<TimeValidationResult> {
  try {
    const dayOfWeek = getDayOfWeek(date)
    const currentTime = getTimeString(date)

    // Buscar el schedule para este día y vendedor
    const schedule = await prisma.chatSchedule.findFirst({
      where: {
        sellerId,
        dayOfWeek,
        isActive: true
      }
    })

    // Si no hay schedule configurado, permitir
    if (!schedule) {
      logger.debug(LogCategory.VALIDATION, 'No chat schedule found, allowing chat', {
        sellerId,
        dayOfWeek,
        currentTime
      })

      return {
        isValid: true,
        message: 'No hay restricciones de horario configuradas para chat'
      }
    }

    // Verificar si el tiempo actual está dentro del rango
    const isInRange = isTimeInRange(currentTime, schedule.startTime, schedule.endTime)

    if (isInRange) {
      logger.debug(LogCategory.VALIDATION, 'Chat time is valid', {
        sellerId,
        dayOfWeek,
        currentTime,
        scheduleStart: schedule.startTime,
        scheduleEnd: schedule.endTime
      })

      return {
        isValid: true,
        schedule: {
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        }
      }
    } else {
      logger.warn(LogCategory.VALIDATION, 'Chat time outside schedule', {
        sellerId,
        dayOfWeek,
        currentTime,
        scheduleStart: schedule.startTime,
        scheduleEnd: schedule.endTime
      })

      return {
        isValid: false,
        message: `El chat está disponible de ${schedule.startTime} a ${schedule.endTime}`,
        schedule: {
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        }
      }
    }
  } catch (error) {
    logger.error(LogCategory.VALIDATION, 'Error validating chat time', error, {
      sellerId,
      date: date.toISOString()
    })

    // En caso de error, permitir el chat pero loggear el problema
    return {
      isValid: true,
      message: 'Error al validar horario, chat permitido por defecto'
    }
  }
}

/**
 * Obtiene todos los horarios de un vendedor (pedidos y chat)
 */
export async function getSellerSchedules(sellerId: string) {
  try {
    const [orderSchedules, chatSchedules] = await Promise.all([
      prisma.orderSchedule.findMany({
        where: { sellerId, isActive: true },
        orderBy: { dayOfWeek: 'asc' }
      }),
      prisma.chatSchedule.findMany({
        where: { sellerId, isActive: true },
        orderBy: { dayOfWeek: 'asc' }
      })
    ])

    return {
      orderSchedules,
      chatSchedules
    }
  } catch (error) {
    logger.error(LogCategory.VALIDATION, 'Error getting seller schedules', error, {
      sellerId
    })
    return {
      orderSchedules: [],
      chatSchedules: []
    }
  }
}

/**
 * Verifica si un vendedor está disponible ahora (tanto para pedidos como chat)
 */
export async function isSellerAvailableNow(sellerId: string) {
  const [orderValidation, chatValidation] = await Promise.all([
    validateOrderTime(sellerId),
    validateChatTime(sellerId)
  ])

  return {
    ordersAvailable: orderValidation.isValid,
    chatAvailable: chatValidation.isValid,
    orderMessage: orderValidation.message,
    chatMessage: chatValidation.message,
    orderSchedule: orderValidation.schedule,
    chatSchedule: chatValidation.schedule
  }
}
