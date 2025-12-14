import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import { createRecurringOrderSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'

// Helper: Common include options for recurring orders
const recurringOrderInclude = {
  items: { include: { product: true } },
  executions: {
    orderBy: { executedAt: 'desc' as const },
    take: 5,
    include: { order: true }
  },
  client: { select: { name: true, email: true } }
}

// GET - Obtener órdenes recurrentes
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { clients: true, sellers: true }
    })

    if (!authUser) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Client gets only their orders, seller gets all
    const whereClause = authUser.clients.length > 0 
      ? { clientId: authUser.clients[0].id } 
      : {}

    const recurringOrders = await prisma.recurringOrder.findMany({
      where: whereClause,
      include: recurringOrderInclude,
      orderBy: { nextExecutionDate: 'asc' }
    })

    return NextResponse.json({ success: true, data: recurringOrders })
  } catch (error) {
    console.error('Error fetching recurring orders:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener órdenes recurrentes' },
      { status: 500 }
    )
  }
}

// POST - Crear nueva orden recurrente
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📦 [RECURRING ORDER] Datos recibidos:', JSON.stringify(body, null, 2))

    // 🔒 Obtener cliente del usuario autenticado
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { clients: true }
    })

    if (!authUser || authUser.clients.length === 0) {
      console.error('❌ [RECURRING ORDER] Usuario no tiene cliente asociado')
      return NextResponse.json(
        { success: false, error: 'Usuario no tiene cliente asociado' },
        { status: 403 }
      )
    }

    const clientId = authUser.clients[0].id
    console.log('✅ [RECURRING ORDER] Cliente detectado:', clientId)

    // Agregar clientId automáticamente
    const dataToValidate = { ...body, clientId }

    // ✅ VALIDACIÓN CON ZOD
    const validation = validateSchema(createRecurringOrderSchema, dataToValidate)
    if (!validation.success) {
      console.error('❌ [RECURRING ORDER] Validación falló:', validation.errors)
      return NextResponse.json({ 
        success: false,
        error: 'Datos inválidos',
        details: validation.errors
      }, { status: 400 })
    }

    const validatedData = validation.data

    // ✅ SANITIZACIÓN
    const sanitizedData = {
      ...validatedData,
      name: sanitizeText(validatedData.name),
      notes: validatedData.notes ? sanitizeText(validatedData.notes) : undefined,
      deliveryInstructions: validatedData.deliveryInstructions ? 
        sanitizeText(validatedData.deliveryInstructions) : undefined,
      customDays: validatedData.customDays || null,
      dayOfWeek: validatedData.dayOfWeek || null,
      dayOfMonth: validatedData.dayOfMonth || null
    }

    // Calcular total
    const totalAmount = sanitizedData.items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.pricePerUnit)
    }, 0)

    // Calcular próxima fecha de ejecución
    const nextDate = calculateNextExecutionDate(
      sanitizedData.frequency, 
      sanitizedData.startDate, 
      sanitizedData.dayOfWeek || undefined, 
      sanitizedData.dayOfMonth || undefined, 
      sanitizedData.customDays || undefined
    )

    // Crear orden recurrente
    console.log('💾 [RECURRING ORDER] Creando orden con:', {
      clientId,
      name: sanitizedData.name,
      frequency: sanitizedData.frequency,
      totalAmount,
      itemsCount: sanitizedData.items.length
    })

    const recurringOrder = await prisma.recurringOrder.create({
      data: {
        clientId,
        name: sanitizedData.name,
        frequency: sanitizedData.frequency,
        customDays: sanitizedData.customDays || null,
        dayOfWeek: sanitizedData.dayOfWeek || null,
        dayOfMonth: sanitizedData.dayOfMonth || null,
        startDate: sanitizedData.startDate ? new Date(sanitizedData.startDate) : new Date(),
        endDate: sanitizedData.endDate ? new Date(sanitizedData.endDate) : null,
        nextExecutionDate: nextDate,
        notes: sanitizedData.notes || null,
        deliveryInstructions: sanitizedData.deliveryInstructions || null,
        totalAmount,
        isActive: true,
        items: {
          create: sanitizedData.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            subtotal: item.quantity * item.pricePerUnit,
            notes: item.notes || null
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        client: true
      }
    })

    console.log('✅ [RECURRING ORDER] Orden recurrente creada:', recurringOrder.id)

    // 🔔 CREAR NOTIFICACIÓN PARA EL VENDEDOR
    try {
      // El cliente ya tiene el seller en recurringOrder.client.sellerId
      if (recurringOrder.client.sellerId) {
        const notification = await prisma.notification.create({
          data: {
            type: 'NEW_ORDER',
            title: '🔄 Nueva Orden Recurrente',
            message: `${recurringOrder.client.name} ha creado una orden recurrente "${recurringOrder.name}" por ${formatPrice(totalAmount)}. Frecuencia: ${getFrequencyLabel(recurringOrder.frequency)}`,
            clientId: body.clientId,
            sellerId: recurringOrder.client.sellerId,
            orderId: recurringOrder.id,
            relatedId: recurringOrder.id,
            isRead: false
          }
        })
        console.log('✅ [NOTIFICATION] Notificación creada para vendedor:', notification.id)
      } else {
        console.warn('⚠️ [NOTIFICATION] Cliente no tiene vendedor asociado')
      }
    } catch (notifError) {
      console.error('❌ [NOTIFICATION] Error creando notificación:', notifError)
      // No fallar la creación de la orden por error en notificación
    }

    return NextResponse.json({
      success: true,
      data: recurringOrder,
      message: 'Orden recurrente creada exitosamente'
    })
  } catch (error) {
    console.error('❌ [RECURRING ORDER] Error creating recurring order:', error)
    console.error('❌ [RECURRING ORDER] Error type:', typeof error)
    console.error('❌ [RECURRING ORDER] Error stack:', error instanceof Error ? error.stack : 'No stack')
    console.error('❌ [RECURRING ORDER] Error message:', error instanceof Error ? error.message : JSON.stringify(error))
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al crear orden recurrente',
        message: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
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

// Helper: Calculate days until next weekly occurrence
function getDaysUntilWeekday(nextDate: Date, targetDay: number): number {
  const currentDay = nextDate.getDay()
  const daysUntil = (targetDay - currentDay + 7) % 7
  return daysUntil === 0 ? 7 : daysUntil // Same day means next week
}

// Helper: Get valid day of month (handles months with fewer days)
function getValidDayOfMonth(year: number, month: number, day: number): number {
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
  return Math.min(day, lastDayOfMonth)
}

// Frequency handlers
const frequencyHandlers: Record<string, (date: Date, opts: {dayOfWeek?: number, dayOfMonth?: number, customDays?: number}) => void> = {
  DAILY: (date) => date.setDate(date.getDate() + 1),
  WEEKLY: (date, {dayOfWeek}) => {
    const daysToAdd = dayOfWeek === undefined ? 7 : getDaysUntilWeekday(date, dayOfWeek)
    date.setDate(date.getDate() + daysToAdd)
  },
  BIWEEKLY: (date) => date.setDate(date.getDate() + 14),
  MONTHLY: (date, {dayOfMonth}) => {
    date.setMonth(date.getMonth() + 1)
    if (dayOfMonth) {
      date.setDate(getValidDayOfMonth(date.getFullYear(), date.getMonth(), dayOfMonth))
    }
  },
  CUSTOM: (date, {customDays}) => date.setDate(date.getDate() + (customDays || 7)),
}

// Función auxiliar para calcular próxima fecha
function calculateNextExecutionDate(
  frequency: string,
  startDate?: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
  customDays?: number
): Date {
  const now = new Date()
  let nextDate = startDate ? new Date(startDate) : new Date()
  
  // Use today if base date is in the past
  if (nextDate < now) nextDate = new Date(now)

  // Apply frequency handler
  const handler = frequencyHandlers[frequency] || frequencyHandlers.WEEKLY
  handler(nextDate, { dayOfWeek, dayOfMonth, customDays })

  // Ensure date is in the future
  if (nextDate <= now) {
    nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + 1)
  }

  return nextDate
}
