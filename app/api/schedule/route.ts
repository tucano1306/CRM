import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// PUT /api/schedule - replace seller's order schedules
export async function PUT(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()
    const { sellerId, schedules, idempotencyKey } = body

    if (!sellerId || !Array.isArray(schedules)) {
      return NextResponse.json({ error: 'sellerId y schedules son requeridos' }, { status: 400 })
    }

    // Simple idempotency: if idempotencyKey provided and we've already processed it (stored on an order), skip
    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({ where: { idempotencyKey } })
      if (existing) return NextResponse.json({ success: true, message: 'Already applied (idempotent)' })
    }

    // Replace existing OrderSchedules for seller with provided ones
    await prisma.$transaction(async (tx) => {
      await tx.orderSchedule.deleteMany({ where: { sellerId } })
      for (const s of schedules) {
        await tx.orderSchedule.create({ data: { id: s.id || undefined, sellerId, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime, isActive: s.isActive ?? true } })
      }
    })

    return NextResponse.json({ success: true, message: 'Schedules updated' })
  } catch (error) {
    console.error('Error en schedule PUT', error)
    return NextResponse.json({ error: 'Error actualizando schedules' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// GET /api/schedule?sellerId=... - get schedules for seller
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')
    if (!sellerId) return NextResponse.json({ error: 'sellerId requerido' }, { status: 400 })

    const schedules = await prisma.orderSchedule.findMany({ where: { sellerId }, orderBy: { dayOfWeek: 'asc' } })
    return NextResponse.json({ success: true, schedules })
  } catch (error) {
    console.error('Error en schedule GET', error)
    return NextResponse.json({ error: 'Error obteniendo schedules' }, { status: 500 })
  }
}
