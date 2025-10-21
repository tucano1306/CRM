import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'

/**
 * Vercel Cron Job: Auto-confirmar órdenes PENDING que pasaron su deadline
 * Ejecuta cada 5 minutos
 * 
 * PENDING → PLACED (si confirmationDeadline <= now)
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autorización del cron (Vercel Cron Secret)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()

    console.log('🕐 [CRON] Iniciando auto-confirmación de órdenes...')
    console.log('🕐 [CRON] Fecha actual:', now.toISOString())

    // Buscar órdenes PENDING con deadline vencido
    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        confirmationDeadline: {
          lte: now, // deadline menor o igual a ahora
        },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            orderConfirmationEnabled: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        orderItems: true,
      },
    })

    console.log(`🕐 [CRON] Órdenes encontradas: ${expiredOrders.length}`)

    if (expiredOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay órdenes para confirmar',
        confirmedCount: 0,
        timestamp: now.toISOString(),
      })
    }

    // Actualizar órdenes a PLACED
    const confirmedOrders = []

    for (const order of expiredOrders) {
      // Solo auto-confirmar si el cliente tiene habilitada la confirmación automática
      if (!order.client.orderConfirmationEnabled) {
        console.log(`⏭️ [CRON] Orden ${order.orderNumber} - Cliente sin auto-confirmación`)
        continue
      }

      try {
        // Actualizar orden
        const updatedOrder = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'PLACED',
            confirmedAt: now,
            updatedAt: now,
          },
        })

        // Registrar actualización de estado
        await prisma.orderStatusUpdate.create({
          data: {
            orderId: order.id,
            oldStatus: 'PENDING',
            newStatus: 'PLACED',
            idempotencyKey: `auto-confirm-${order.id}-${now.getTime()}`,
          },
        })

        console.log(`✅ [CRON] Orden ${order.orderNumber} confirmada automáticamente`)
        confirmedOrders.push(updatedOrder)

        // Emitir evento ORDER_UPDATED
        await eventEmitter.emit({
          type: EventType.ORDER_UPDATED,
          timestamp: now,
          data: {
            orderId: order.id,
            clientId: order.clientId,
            amount: Number(order.totalAmount),
            status: 'PLACED',
          },
        })

        // Emitir evento de notificación al vendedor
        await eventEmitter.emit({
          type: EventType.NOTIFICATION_CREATED,
          timestamp: now,
          data: {
            title: 'Orden Auto-confirmada',
            message: `Orden ${order.orderNumber} del cliente ${order.client.name} fue confirmada automáticamente`,
            type: 'info',
          },
        })
      } catch (error) {
        console.error(`❌ [CRON] Error confirmando orden ${order.orderNumber}:`, error)
      }
    }

    console.log(`🎉 [CRON] Auto-confirmación completada: ${confirmedOrders.length} órdenes`)

    return NextResponse.json({
      success: true,
      message: `${confirmedOrders.length} órdenes confirmadas automáticamente`,
      confirmedCount: confirmedOrders.length,
      orders: confirmedOrders.map(o => ({
        orderNumber: o.orderNumber,
        totalAmount: o.totalAmount,
        confirmedAt: o.confirmedAt,
      })),
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('❌ [CRON] Error en auto-confirmación:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Error en auto-confirmación de órdenes',
        details: (error as Error).message,
      },
      { status: 500 }
    )
  }
}
