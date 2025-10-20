// app/api/schedule/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, DayOfWeek } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'

const prisma = new PrismaClient()

/**
 * PUT /api/schedule
 * Configurar horarios de pedidos
 * Solo SELLER puede configurar
 */
export async function PUT(request: NextRequest) {
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
        { success: false, error: 'Solo sellers pueden configurar horarios' },
        { status: 403 }
      )
    }

    // 3. Obtener datos del request
    const body = await request.json()
    const { schedules } = body

    if (!Array.isArray(schedules)) {
      return NextResponse.json(
        { success: false, error: 'schedules debe ser un array' },
        { status: 400 }
      )
    }

    // 4. Validar formato
    for (const schedule of schedules) {
      if (!schedule.dayOfWeek || !schedule.startTime || !schedule.endTime) {
        return NextResponse.json(
          { success: false, error: 'Cada horario debe tener dayOfWeek, startTime y endTime' },
          { status: 400 }
        )
      }
    }

    // 5. Actualizar horarios usando transacción
    const result = await prisma.$transaction(async (tx) => {
      // Borrar horarios existentes
      await tx.orderSchedule.deleteMany({
        where: { sellerId: seller.id }
      })

      // Crear nuevos horarios
      const created = []
      for (const schedule of schedules) {
        const newSchedule = await tx.orderSchedule.create({
          data: {
            sellerId: seller.id,
            dayOfWeek: schedule.dayOfWeek as DayOfWeek,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            isActive: schedule.isActive !== false
          }
        })
        created.push(newSchedule)
      }

      return created
    })

    return NextResponse.json({
      success: true,
      message: 'Horarios actualizados exitosamente',
      schedules: result
    })

  } catch (error) {
    console.error('Error al actualizar horarios:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

/**
 * GET /api/schedule
 * Obtener horarios de pedidos
 */
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener todos los horarios
    const schedules = await prisma.orderSchedule.findMany({
      include: {
        seller: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      schedules
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}