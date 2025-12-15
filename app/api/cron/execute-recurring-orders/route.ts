import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Verificar CRON_SECRET para seguridad
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const now = new Date()
    console.log(`[CRON] Ejecutando cron job de órdenes recurrentes: ${now.toISOString()}`)

    // Obtener órdenes que deben ejecutarse
    const pendingOrders = await prisma.recurringOrder.findMany({
      where: {
        isActive: true,
        nextExecutionDate: {
          lte: now
        },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        client: {
          include: {
            seller: true
          }
        }
      }
    })

    console.log(`[CRON] Encontradas ${pendingOrders.length} órdenes para ejecutar`)

    const results = []

    for (const recurringOrder of pendingOrders) {
      try {
        // Validar que el cliente tenga vendedor asignado
        if (!recurringOrder.client.sellerId) {
          throw new Error('El cliente no tiene vendedor asignado')
        }

        // Calcular totales
        const subtotal = recurringOrder.items.reduce((sum: number, item: any) => sum + Number(item.subtotal), 0)

        // Crear orden normal
        const order = await prisma.order.create({
          data: {
            clientId: recurringOrder.clientId,
            sellerId: recurringOrder.client.sellerId,
            orderNumber: `REC-${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            status: 'PENDING',
            totalAmount: subtotal,
            notes: (() => {
              const notesSuffix = recurringOrder.notes ? `\n\n${recurringOrder.notes}` : '';
              return `Orden automática: ${recurringOrder.name}${notesSuffix}`;
            })(),
            orderItems: {
              create: recurringOrder.items.map((item: any) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                pricePerUnit: Number(item.pricePerUnit),
                subtotal: Number(item.subtotal),
                itemNote: item.notes
              }))
            }
          }
        })

        // Registrar ejecución exitosa
        await prisma.recurringOrderExecution.create({
          data: {
            recurringOrderId: recurringOrder.id,
            orderId: order.id,
            status: 'SUCCESS'
          }
        })

        // Calcular próxima fecha de ejecución
        const nextDate = calculateNextExecutionDate(recurringOrder)

        // Actualizar orden recurrente
        await prisma.recurringOrder.update({
          where: { id: recurringOrder.id },
          data: {
            nextExecutionDate: nextDate,
            lastExecutionDate: now,
            executionCount: { increment: 1 }
          }
        })

        results.push({
          id: recurringOrder.id,
          name: recurringOrder.name,
          orderId: order.id,
          orderNumber: order.orderNumber,
          success: true,
          nextExecution: nextDate
        })

        console.log(`[CRON] ✅ Orden creada: ${order.orderNumber} para ${recurringOrder.client.name}`)
      } catch (error: any) {
        // Registrar ejecución fallida
        try {
          // Crear una orden temporal para registrar el fallo
          const errorOrder = await prisma.order.create({
            data: {
              clientId: recurringOrder.clientId,
              sellerId: recurringOrder.client.sellerId || '',
              orderNumber: `ERR-${Date.now()}`,
              status: 'CANCELED',
              totalAmount: 0,
              notes: `Error en orden recurrente: ${error.message}`
            }
          })

          await prisma.recurringOrderExecution.create({
            data: {
              recurringOrderId: recurringOrder.id,
              orderId: errorOrder.id,
              status: 'FAILED',
              errorMessage: error.message || 'Error desconocido'
            }
          })
        } catch (logError) {
          console.error('[CRON] Error al registrar fallo:', logError)
        }

        results.push({
          id: recurringOrder.id,
          name: recurringOrder.name,
          success: false,
          error: error.message || 'Error desconocido'
        })

        console.error(`[CRON] ❌ Error al procesar ${recurringOrder.name}:`, error)
      }
    }

    console.log(`[CRON] Finalizado. ${results.filter(r => r.success).length}/${results.length} exitosas`)

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      executed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    })
  } catch (error) {
    console.error('[CRON] Error general:', error)
    return NextResponse.json(
      { success: false, error: 'Error al ejecutar órdenes recurrentes' },
      { status: 500 }
    )
  }
}

// Función para calcular próxima fecha de ejecución
function calculateNextExecutionDate(order: any): Date {
  const current = new Date(order.nextExecutionDate)
  let nextDate = new Date(current)

  switch (order.frequency) {
    case 'DAILY':
      nextDate.setDate(nextDate.getDate() + 1)
      break

    case 'WEEKLY':
      if (order.dayOfWeek !== null && order.dayOfWeek !== undefined) {
        // Avanzar a la próxima semana con el mismo día
        nextDate.setDate(nextDate.getDate() + 7)
      } else {
        nextDate.setDate(nextDate.getDate() + 7)
      }
      break

    case 'BIWEEKLY':
      nextDate.setDate(nextDate.getDate() + 14)
      break

    case 'MONTHLY':
      if (order.dayOfMonth) {
        nextDate.setMonth(nextDate.getMonth() + 1)
        const maxDayInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate()
        nextDate.setDate(Math.min(order.dayOfMonth, maxDayInMonth))
      } else {
        nextDate.setMonth(nextDate.getMonth() + 1)
      }
      break

    case 'CUSTOM':
      if (order.customDays) {
        nextDate.setDate(nextDate.getDate() + order.customDays)
      } else {
        nextDate.setDate(nextDate.getDate() + 7)
      }
      break

    default:
      nextDate.setDate(nextDate.getDate() + 7)
  }

  return nextDate
}
