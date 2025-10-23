import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET - Obtener una orden recurrente específica
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const params = await context.params
    const { id } = params

    const recurringOrder = await prisma.recurringOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        executions: {
          orderBy: { executedAt: 'desc' },
          include: {
            order: true
          }
        },
        client: true
      }
    })

    if (!recurringOrder) {
      return NextResponse.json(
        { success: false, error: 'Orden recurrente no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: recurringOrder
    })
  } catch (error) {
    console.error('Error fetching recurring order:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener orden recurrente' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar orden recurrente
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const params = await context.params
    const { id } = params
    const body = await request.json()

    // Verificar que la orden existe
    const existingOrder = await prisma.recurringOrder.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Orden recurrente no encontrada' },
        { status: 404 }
      )
    }

    // Preparar datos de actualización
    const updateData: any = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.frequency !== undefined) updateData.frequency = body.frequency
    if (body.customDays !== undefined) updateData.customDays = body.customDays
    if (body.dayOfWeek !== undefined) updateData.dayOfWeek = body.dayOfWeek
    if (body.dayOfMonth !== undefined) updateData.dayOfMonth = body.dayOfMonth
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.deliveryInstructions !== undefined) updateData.deliveryInstructions = body.deliveryInstructions
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.isActive !== undefined) updateData.isActive = body.isActive

    // Si se actualizan los items
    if (body.items && Array.isArray(body.items)) {
      // Eliminar items antiguos
      await prisma.recurringOrderItem.deleteMany({
        where: { recurringOrderId: id }
      })

      // Calcular nuevo total
      const totalAmount = body.items.reduce((sum: number, item: any) => {
        return sum + (item.quantity * item.pricePerUnit)
      }, 0)

      updateData.totalAmount = totalAmount

      // Crear nuevos items
      updateData.items = {
        create: body.items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          subtotal: item.quantity * item.pricePerUnit,
          notes: item.notes
        }))
      }
    }

    // Si cambia la frecuencia, recalcular próxima fecha
    if (body.frequency || body.customDays || body.dayOfWeek || body.dayOfMonth) {
      updateData.nextExecutionDate = calculateNextExecutionDate(
        body.frequency || existingOrder.frequency,
        undefined,
        body.dayOfWeek !== undefined ? body.dayOfWeek : existingOrder.dayOfWeek,
        body.dayOfMonth !== undefined ? body.dayOfMonth : existingOrder.dayOfMonth,
        body.customDays !== undefined ? body.customDays : existingOrder.customDays
      )
    }

    // Actualizar orden
    const updatedOrder = await prisma.recurringOrder.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Orden recurrente actualizada exitosamente'
    })
  } catch (error) {
    console.error('Error updating recurring order:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar orden recurrente' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar orden recurrente
export async function DELETE(
  request: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const params = await context.params
    const { id } = params

    // Verificar que la orden existe
    const existingOrder = await prisma.recurringOrder.findUnique({
      where: { id }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Orden recurrente no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar orden (los items y ejecuciones se eliminan en cascada)
    await prisma.recurringOrder.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Orden recurrente eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error deleting recurring order:', error)
    return NextResponse.json(
      { success: false, error: 'Error al eliminar orden recurrente' },
      { status: 500 }
    )
  }
}

// Función auxiliar para calcular próxima fecha
function calculateNextExecutionDate(
  frequency: string,
  startDate?: string,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
  customDays?: number | null
): Date {
  const baseDate = startDate ? new Date(startDate) : new Date()
  const now = new Date()
  let nextDate = new Date(baseDate)

  if (nextDate < now) {
    nextDate = new Date(now)
  }

  switch (frequency) {
    case 'DAILY':
      if (nextDate.toDateString() === now.toDateString()) {
        nextDate.setDate(nextDate.getDate() + 1)
      }
      break

    case 'WEEKLY':
      if (dayOfWeek !== null && dayOfWeek !== undefined) {
        const currentDay = nextDate.getDay()
        let daysUntilNext = (dayOfWeek - currentDay + 7) % 7
        if (daysUntilNext === 0) daysUntilNext = 7
        nextDate.setDate(nextDate.getDate() + daysUntilNext)
      } else {
        nextDate.setDate(nextDate.getDate() + 7)
      }
      break

    case 'BIWEEKLY':
      nextDate.setDate(nextDate.getDate() + 14)
      break

    case 'MONTHLY':
      if (dayOfMonth) {
        nextDate.setMonth(nextDate.getMonth() + 1)
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()))
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1)
      }
      break

    case 'CUSTOM':
      if (customDays) {
        nextDate.setDate(nextDate.getDate() + customDays)
      } else {
        nextDate.setDate(nextDate.getDate() + 7)
      }
      break

    default:
      nextDate.setDate(nextDate.getDate() + 7)
  }

  if (nextDate <= now) {
    nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + 1)
  }

  return nextDate
}
