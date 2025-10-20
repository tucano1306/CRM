// app/api/chat-schedules/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, DayOfWeek } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'

const prisma = new PrismaClient()

/**
 * GET /api/chat-schedules?sellerId=xxx
 * Obtener horarios de chat de un vendedor
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

    const schedules = await prisma.chatSchedule.findMany({
      where: { sellerId },
      orderBy: { dayOfWeek: 'asc' }
    })

    return NextResponse.json({
      success: true,
      schedules
    })

  } catch (error) {
    console.error('Error en GET /api/chat-schedules:', error)
    return NextResponse.json(
      { success: false, error: 'Error obteniendo horarios de chat' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * POST /api/chat-schedules
 * Crear/Actualizar horarios de chat
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
        { success: false, error: 'Solo vendedores pueden configurar horarios de chat' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { schedules } = body

    if (!schedules || !Array.isArray(schedules)) {
      return NextResponse.json(
        { success: false, error: 'schedules debe ser un array' },
        { status: 400 }
      )
    }

    // 3. Validar formato de cada horario
    for (const schedule of schedules) {
      if (!schedule.dayOfWeek || !schedule.startTime || !schedule.endTime) {
        return NextResponse.json(
          { success: false, error: 'Cada horario debe tener dayOfWeek, startTime y endTime' },
          { status: 400 }
        )
      }

      // Validar formato de tiempo HH:MM
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(schedule.startTime) || !timeRegex.test(schedule.endTime)) {
        return NextResponse.json(
          { success: false, error: 'Formato de tiempo inválido. Use HH:MM (ej: 08:00)' },
          { status: 400 }
        )
      }
    }

    // 4. Usar transacción para actualizar todos los horarios
    const result = await prisma.$transaction(async (tx) => {
      // Eliminar horarios existentes
      await tx.chatSchedule.deleteMany({
        where: { sellerId: seller.id }
      })

      // Crear nuevos horarios
      await tx.chatSchedule.createMany({
        data: schedules.map((s: any) => ({
          sellerId: seller.id,
          dayOfWeek: s.dayOfWeek as DayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          isActive: s.isActive !== undefined ? s.isActive : true
        }))
      })

      // Obtener los horarios creados
      const newSchedules = await tx.chatSchedule.findMany({
        where: { sellerId: seller.id },
        orderBy: { dayOfWeek: 'asc' }
      })

      return newSchedules
    })

    return NextResponse.json({
      success: true,
      message: 'Horarios de chat actualizados exitosamente',
      schedules: result
    })

  } catch (error) {
    console.error('Error en POST /api/chat-schedules:', error)
    return NextResponse.json(
      { success: false, error: 'Error creando horarios de chat' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * DELETE /api/chat-schedules
 * Eliminar todos los horarios de chat de un vendedor
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
        { success: false, error: 'Solo vendedores pueden eliminar horarios de chat' },
        { status: 403 }
      )
    }

    // 3. Eliminar horarios
    await prisma.chatSchedule.deleteMany({
      where: { sellerId: seller.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Horarios de chat eliminados exitosamente'
    })

  } catch (error) {
    console.error('Error en DELETE /api/chat-schedules:', error)
    return NextResponse.json(
      { success: false, error: 'Error eliminando horarios de chat' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}