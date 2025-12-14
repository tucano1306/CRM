// app/api/order-schedules/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DayOfWeek } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { validateSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/order-schedules?sellerId=xxx
 * Obtener horarios de confirmación de órdenes de un vendedor
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      return NextResponse.json(
        { success: false, error: 'sellerId es requerido' },
        { status: 400 }
      )
    }

    const schedules = await prisma.orderSchedule.findMany({
      where: { sellerId },
      orderBy: { dayOfWeek: 'asc' }
    })

    return NextResponse.json({
      success: true,
      schedules
    })

  } catch (error) {
    console.error('Error en GET /api/order-schedules:', error)
    return NextResponse.json(
      { success: false, error: 'Error obteniendo horarios' },
      { status: 500 }
    )
  } finally {
    // prisma singleton
  }
}

/**
 * POST /api/order-schedules
 * Crear/Actualizar horarios de confirmación de órdenes
 * Solo vendedores pueden crear sus horarios
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

    // 2. Verificar que sea vendedor
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'Solo vendedores pueden configurar horarios' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // ✅ Validar schema (idéntico a chat-schedules)
    const orderScheduleSchema = z.object({
      schedules: z.array(z.object({
        dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
        startTime: z.string().regex(/^([0-1]?\d|2[0-3]):[0-5]\d$/, 'Formato de tiempo inválido. Use HH:MM'),
        endTime: z.string().regex(/^([0-1]?\d|2[0-3]):[0-5]\d$/, 'Formato de tiempo inválido. Use HH:MM'),
        isActive: z.boolean().optional()
      })).min(1, 'Debe proporcionar al menos un horario')
    })

    const validation = validateSchema(orderScheduleSchema, body)
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: validation.errors }, { status: 400 })
    }

    const { schedules } = validation.data

    // 4. Usar transacción para actualizar todos los horarios
    const result = await prisma.$transaction(async (tx) => {
      // Eliminar horarios existentes
      await tx.orderSchedule.deleteMany({
        where: { sellerId: seller.id }
      })

      // Crear nuevos horarios
      await tx.orderSchedule.createMany({
        data: schedules.map((s: any) => ({
          sellerId: seller.id,
          dayOfWeek: s.dayOfWeek as DayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: s.isActive === undefined ? true : s.isActive
        }))
      })

      // Obtener los horarios creados
      const newSchedules = await tx.orderSchedule.findMany({
        where: { sellerId: seller.id },
        orderBy: { dayOfWeek: 'asc' }
      })

      return newSchedules
    })

    return NextResponse.json({
      success: true,
      message: 'Horarios actualizados exitosamente',
      schedules: result
    })

  } catch (error) {
    console.error('Error en POST /api/order-schedules:', error)
    return NextResponse.json(
      { success: false, error: 'Error creando horarios' },
      { status: 500 }
    )
  } finally {
    // prisma singleton
  }
}

/**
 * DELETE /api/order-schedules
 * Eliminar todos los horarios de un vendedor
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 2. Verificar que sea vendedor
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'Solo vendedores pueden eliminar horarios' },
        { status: 403 }
      )
    }

    // 3. Eliminar horarios
    await prisma.orderSchedule.deleteMany({
      where: { sellerId: seller.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Horarios eliminados exitosamente'
    })

  } catch (error) {
    console.error('Error en DELETE /api/order-schedules:', error)
    return NextResponse.json(
      { success: false, error: 'Error eliminando horarios' },
      { status: 500 }
    )
  } finally {
    // prisma singleton
  }
}