import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateRecurringOrderSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'

interface RouteContext {
  params: Promise<{ id: string }>
}

// Helper: Apply text field updates with sanitization
function applyTextFieldUpdates(updateData: any, validatedData: any) {
  if ('name' in validatedData && validatedData.name) {
    updateData.name = sanitizeText(validatedData.name)
  }
  if ('notes' in validatedData) {
    updateData.notes = validatedData.notes ? sanitizeText(validatedData.notes) : null
  }
  if ('deliveryInstructions' in validatedData) {
    updateData.deliveryInstructions = validatedData.deliveryInstructions ? 
      sanitizeText(validatedData.deliveryInstructions) : null
  }
}

// Helper: Apply frequency field updates
function applyFrequencyFieldUpdates(updateData: any, validatedData: any) {
  if ('frequency' in validatedData && validatedData.frequency !== undefined) {
    updateData.frequency = validatedData.frequency
  }
  if ('customDays' in validatedData && validatedData.customDays !== undefined) {
    updateData.customDays = validatedData.customDays
  }
  if ('dayOfWeek' in validatedData && validatedData.dayOfWeek !== undefined) {
    updateData.dayOfWeek = validatedData.dayOfWeek
  }
  if ('dayOfMonth' in validatedData && validatedData.dayOfMonth !== undefined) {
    updateData.dayOfMonth = validatedData.dayOfMonth
  }
}

// Helper: Apply other field updates
function applyOtherFieldUpdates(updateData: any, validatedData: any) {
  if ('endDate' in validatedData && validatedData.endDate !== undefined) {
    updateData.endDate = validatedData.endDate ? new Date(validatedData.endDate) : null
  }
  if ('isActive' in validatedData && validatedData.isActive !== undefined) {
    updateData.isActive = validatedData.isActive
  }
}

// Helper: Update items and calculate total
async function updateOrderItems(orderId: string, items: any[], updateData: any) {
  await prisma.recurringOrderItem.deleteMany({ where: { recurringOrderId: orderId } })

  const totalAmount = items.reduce((sum: number, item: any) => {
    return sum + (item.quantity * item.pricePerUnit)
  }, 0)

  updateData.totalAmount = totalAmount
  updateData.items = {
    create: items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      pricePerUnit: item.pricePerUnit,
      subtotal: item.quantity * item.pricePerUnit,
      notes: item.notes
    }))
  }
}

// Helper: Check if frequency recalculation is needed
function needsFrequencyRecalculation(body: any): boolean {
  return !!(body.frequency || body.customDays || body.dayOfWeek || body.dayOfMonth)
}

// Helper: Create notification for order deletion
async function createDeletionNotification(orderInfo: {
  name: string
  frequency: string
  clientName: string
  clientId: string
  sellerId: string | null
}, orderId: string) {
  if (!orderInfo.sellerId) {
    console.warn('⚠️ [NOTIFICATION] Cliente no tiene vendedor asociado')
    return
  }

  try {
    const notification = await prisma.notification.create({
      data: {
        type: 'ORDER_CANCELLED',
        title: '🗑️ Orden Recurrente Eliminada',
        message: `${orderInfo.clientName} ha eliminado la orden recurrente "${orderInfo.name}" (Frecuencia: ${getFrequencyLabel(orderInfo.frequency)}). Esta orden ya no se ejecutará automáticamente.`,
        clientId: orderInfo.clientId,
        sellerId: orderInfo.sellerId,
        relatedId: orderId,
        isRead: false
      }
    })
    console.log('✅ [NOTIFICATION] Notificación de eliminación enviada al vendedor:', notification.id)
  } catch (notifError) {
    console.error('❌ [NOTIFICATION] Error creando notificación:', notifError)
  }
}

// GET - Obtener una orden recurrente específica
export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params

    const recurringOrder = await prisma.recurringOrder.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        executions: { orderBy: { executedAt: 'desc' }, include: { order: true } },
        client: true
      }
    })

    if (!recurringOrder) {
      return NextResponse.json({ success: false, error: 'Orden recurrente no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: recurringOrder })
  } catch (error) {
    console.error('Error fetching recurring order:', error)
    return NextResponse.json({ success: false, error: 'Error al obtener orden recurrente' }, { status: 500 })
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
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params
    const body = await request.json()

    const validation = validateSchema(updateRecurringOrderSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        success: false,
        error: 'Datos inválidos',
        details: validation.errors
      }, { status: 400 })
    }

    const validatedData = validation.data

    const existingOrder = await prisma.recurringOrder.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existingOrder) {
      return NextResponse.json({ success: false, error: 'Orden recurrente no encontrada' }, { status: 404 })
    }

    const updateData: any = {}
    applyTextFieldUpdates(updateData, validatedData)
    applyFrequencyFieldUpdates(updateData, validatedData)
    applyOtherFieldUpdates(updateData, validatedData)

    if ('items' in validatedData && validatedData.items && Array.isArray(validatedData.items)) {
      await updateOrderItems(id, validatedData.items, updateData)
    }

    if (needsFrequencyRecalculation(body)) {
      updateData.nextExecutionDate = calculateNextExecutionDate(
        body.frequency || existingOrder.frequency,
        undefined,
        body.dayOfWeek === undefined ? existingOrder.dayOfWeek : body.dayOfWeek,
        body.dayOfMonth === undefined ? existingOrder.dayOfMonth : body.dayOfMonth,
        body.customDays === undefined ? existingOrder.customDays : body.customDays
      )
    }

    const updatedOrder = await prisma.recurringOrder.update({
      where: { id },
      data: updateData,
      include: { items: { include: { product: true } } }
    })

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Orden recurrente actualizada exitosamente'
    })
  } catch (error) {
    console.error('Error updating recurring order:', error)
    return NextResponse.json({ success: false, error: 'Error al actualizar orden recurrente' }, { status: 500 })
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
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const params = await context.params
    const { id } = params

    const existingOrder = await prisma.recurringOrder.findUnique({
      where: { id },
      include: { client: { select: { id: true, name: true, sellerId: true } } }
    })

    if (!existingOrder) {
      return NextResponse.json({ success: false, error: 'Orden recurrente no encontrada' }, { status: 404 })
    }

    const orderInfo = {
      name: existingOrder.name,
      frequency: existingOrder.frequency,
      totalAmount: existingOrder.totalAmount,
      clientName: existingOrder.client.name,
      clientId: existingOrder.client.id,
      sellerId: existingOrder.client.sellerId
    }

    await prisma.recurringOrder.delete({ where: { id } })
    console.log('✅ [RECURRING ORDER] Orden recurrente eliminada:', id)

    await createDeletionNotification(orderInfo, id)

    return NextResponse.json({ success: true, message: 'Orden recurrente eliminada exitosamente' })
  } catch (error) {
    console.error('Error deleting recurring order:', error)
    return NextResponse.json({ success: false, error: 'Error al eliminar orden recurrente' }, { status: 500 })
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

// Función auxiliar para obtener etiqueta de frecuencia legible
function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case 'DAILY': return 'Diaria'
    case 'WEEKLY': return 'Semanal'
    case 'BIWEEKLY': return 'Quincenal'
    case 'MONTHLY': return 'Mensual'
    case 'CUSTOM': return 'Personalizada'
    default: return frequency
  }
}
