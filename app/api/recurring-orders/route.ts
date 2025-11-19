import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { formatPrice } from '@/lib/utils'
import { createRecurringOrderSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'

// GET - Obtener órdenes recurrentes
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener usuario autenticado
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { 
        clients: true,
        sellers: true
      }
    })

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    let recurringOrders

    // Si es cliente, obtener solo sus órdenes
    if (authUser.clients.length > 0) {
      const clientId = authUser.clients[0].id

      recurringOrders = await prisma.recurringOrder.findMany({
        where: { clientId },
        include: {
          items: {
            include: {
              product: true
            }
          },
          executions: {
            orderBy: { executedAt: 'desc' },
            take: 5,
            include: {
              order: true
            }
          },
          client: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { nextExecutionDate: 'asc' }
      })
    } else {
      // Si es vendedor, obtener todas las órdenes
      recurringOrders = await prisma.recurringOrder.findMany({
        include: {
          items: {
            include: {
              product: true
            }
          },
          executions: {
            orderBy: { executedAt: 'desc' },
            take: 5,
            include: {
              order: true
            }
          },
          client: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: { nextExecutionDate: 'asc' }
      })
    }

    return NextResponse.json({
      success: true,
      data: recurringOrders
    })
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
        customDays: sanitizedData.customDays,
        dayOfWeek: sanitizedData.dayOfWeek,
        dayOfMonth: sanitizedData.dayOfMonth,
        startDate: sanitizedData.startDate ? new Date(sanitizedData.startDate) : new Date(),
        endDate: sanitizedData.endDate ? new Date(sanitizedData.endDate) : null,
        nextExecutionDate: nextDate,
        notes: sanitizedData.notes,
        deliveryInstructions: sanitizedData.deliveryInstructions,
        totalAmount,
        isActive: true,
        items: {
          create: body.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            subtotal: item.quantity * item.pricePerUnit,
            notes: item.notes
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
    console.error('Error creating recurring order:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear orden recurrente' },
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

// Función auxiliar para calcular próxima fecha
function calculateNextExecutionDate(
  frequency: string,
  startDate?: string,
  dayOfWeek?: number,
  dayOfMonth?: number,
  customDays?: number
): Date {
  const baseDate = startDate ? new Date(startDate) : new Date()
  const now = new Date()
  let nextDate = new Date(baseDate)

  // Si la fecha base es en el pasado, usar hoy
  if (nextDate < now) {
    nextDate = new Date(now)
  }

  switch (frequency) {
    case 'DAILY':
      // Si es hoy, programar para mañana
      if (nextDate.toDateString() === now.toDateString()) {
        nextDate.setDate(nextDate.getDate() + 1)
      }
      break

    case 'WEEKLY':
      // Encontrar el próximo día de la semana especificado
      if (dayOfWeek !== undefined) {
        const currentDay = nextDate.getDay()
        let daysUntilNext = (dayOfWeek - currentDay + 7) % 7
        
        // Si es el mismo día, programar para la próxima semana
        if (daysUntilNext === 0) {
          daysUntilNext = 7
        }
        
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
        // Ir al próximo mes
        nextDate.setMonth(nextDate.getMonth() + 1)
        // Establecer el día del mes
        nextDate.setDate(Math.min(dayOfMonth, new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()))
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1)
      }
      break

    case 'CUSTOM':
      if (customDays) {
        nextDate.setDate(nextDate.getDate() + customDays)
      } else {
        nextDate.setDate(nextDate.getDate() + 7) // Default a semanal
      }
      break

    default:
      nextDate.setDate(nextDate.getDate() + 7)
  }

  // Asegurar que la fecha esté en el futuro
  if (nextDate <= now) {
    nextDate = new Date(now)
    nextDate.setDate(nextDate.getDate() + 1)
  }

  return nextDate
}
