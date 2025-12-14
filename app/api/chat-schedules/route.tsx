// app/api/chat-schedules/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { DayOfWeek } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { validateSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/chat-schedules?sellerId=xxx
 * Obtener horarios de chat de un vendedor
 * Si no se proporciona sellerId, usa el seller del usuario autenticado
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
    let sellerId = searchParams.get('sellerId')

    // Si no se proporciona sellerId, buscar el seller del usuario autenticado
    if (!sellerId) {
      const seller = await prisma.seller.findFirst({
        where: {
          authenticated_users: {
            some: { authId: userId }
          }
        }
      })

      if (!seller) {
        return NextResponse.json(
          { success: false, error: 'Seller no encontrado' },
          { status: 404 }
        )
      }

      sellerId = seller.id
    }

    const schedules = await prisma.chatSchedule.findMany({
      where: { sellerId },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ],
      include: {
        seller: {
          select: {
            id: true,
            name: true
          }
        }
      }
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
    // prisma singleton
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

    // ✅ Validar schema
    const chatScheduleSchema = z.object({
      schedules: z.array(z.object({
        dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
        startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de tiempo inválido. Use HH:MM'),
        endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de tiempo inválido. Use HH:MM'),
        isActive: z.boolean().optional()
      })).min(1, 'Debe proporcionar al menos un horario')
    })

    const validation = validateSchema(chatScheduleSchema, body)
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: validation.errors }, { status: 400 })
    }

    const { schedules } = validation.data

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
          isActive: s.isActive === undefined ? true : s.isActive
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
    // prisma singleton
  }
}

/**
 * PUT /api/chat-schedules
 * Alias de POST para seguir convenciones REST
 */
export async function PUT(request: NextRequest) {
  return POST(request)
}

/**
 * DELETE /api/chat-schedules
 * Eliminar todos los horarios de chat de un vendedor
 * ✅ No requiere body, elimina todos los horarios del seller autenticado
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
    // prisma singleton
  }
}