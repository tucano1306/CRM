import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Validar datos requeridos
    if (!body.clientId || !body.name || !body.frequency || !body.items || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    // Calcular total
    const totalAmount = body.items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.pricePerUnit)
    }, 0)

    // Calcular próxima fecha de ejecución
    const nextDate = calculateNextExecutionDate(body.frequency, body.startDate, body.dayOfWeek, body.dayOfMonth, body.customDays)

    // Crear orden recurrente
    const recurringOrder = await prisma.recurringOrder.create({
      data: {
        clientId: body.clientId,
        name: body.name,
        frequency: body.frequency,
        customDays: body.customDays,
        dayOfWeek: body.dayOfWeek,
        dayOfMonth: body.dayOfMonth,
        startDate: body.startDate ? new Date(body.startDate) : new Date(),
        endDate: body.endDate ? new Date(body.endDate) : null,
        nextExecutionDate: nextDate,
        notes: body.notes,
        deliveryInstructions: body.deliveryInstructions,
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
        }
      }
    })

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
