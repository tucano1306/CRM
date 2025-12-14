import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { changeOrderStatus, isStatusTransitionAllowed } from '@/lib/orderStatusAudit'
import { OrderStatus } from '@prisma/client'
import { 
  notifyOrderStatusChanged, 
  notifyOrderConfirmed, 
  notifyOrderCompleted,
  notifyOrderReceived,
  notifyOrderCancelled,
  sendAutomaticCancellationMessage
} from '@/lib/notifications'
import logger, { LogCategory } from '@/lib/logger'
import { sendRealtimeEvent, getSellerChannel, getBuyerChannel } from '@/lib/supabase-server'
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'
import { executeInBackground } from '@/lib/background-tasks'

const VALID_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY_FOR_PICKUP',
  'IN_DELIVERY',
  'DELIVERED',
  'PARTIALLY_DELIVERED',
  'COMPLETED',
  'CANCELED',
  'PAYMENT_PENDING',
  'PAID'
] as const

/**
 * PATCH /api/orders/[id]/status
 * Actualizar estado de orden con auditoría automática
 * 
 * Body: { status: OrderStatus, notes?: string }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Resolver params async (Next.js 15)
    const resolvedParams = await params
    const orderId = resolvedParams.id

    // Autenticación
    const authResult = await auth()
    const userId = authResult.userId

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Parsear body
    const body = await request.json()
    const { status, notes } = body

    // Validar estado
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Estado inválido' },
        { status: 400 }
      )
    }

    // Verificar que la orden existe
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { 
        id: true, 
        status: true, 
        sellerId: true, 
        clientId: true 
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Obtener información del usuario desde la BD
    const user = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      select: { name: true, role: true }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado en el sistema' },
        { status: 404 }
      )
    }

    // Validar que la transición de estado sea permitida
    const validation = isStatusTransitionAllowed(
      order.status,
      status as OrderStatus,
      user.role
    )

    if (!validation.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: validation.reason || 'Transición de estado no permitida' 
        },
        { status: 403 }
      )
    }

    // Actualizar el estado usando la función de auditoría
    const result = await changeOrderStatus({
      orderId: orderId,
      newStatus: status as OrderStatus,
      changedBy: userId,
      changedByName: user.name,
      changedByRole: user.role,
      notes: notes || null,
    })

    if (!result.updated) {
      return NextResponse.json({
        success: false,
        message: result.message
      })
    }

    // Obtener la orden actualizada con todas las relaciones
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            businessName: true,
            email: true,
            phone: true,
            address: true,
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          }
        },
        orderItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                price: true,
              }
            }
          }
        }
      }
    })

    // 🔔 TIEMPO REAL: Notificar cambio de estado
    try {
      // Obtener authId del vendedor para el canal
      const sellerAuth = await prisma.authenticated_users.findFirst({
        where: { sellers: { some: { id: order.sellerId } } },
        select: { authId: true }
      })

      if (sellerAuth) {
        await sendRealtimeEvent(
          getSellerChannel(sellerAuth.authId),
          'order:status-changed',
          {
            orderId: orderId,
            orderNumber: updatedOrder?.orderNumber,
            oldStatus: order.status,
            newStatus: status,
            timestamp: new Date().toISOString()
          }
        )
      }

      // También notificar al comprador
      const buyerAuth = await prisma.authenticated_users.findFirst({
        where: { clients: { some: { id: order.clientId } } },
        select: { authId: true }
      })

      if (buyerAuth) {
        await sendRealtimeEvent(
          getBuyerChannel(buyerAuth.authId),
          'order:status-changed',
          {
            orderId: orderId,
            orderNumber: updatedOrder?.orderNumber,
            oldStatus: order.status,
            newStatus: status,
            timestamp: new Date().toISOString()
          }
        )
      }
    } catch (realtimeError) {
      // No bloquear si falla el tiempo real
      logger.warn(LogCategory.API, 'Realtime broadcast failed', { error: realtimeError })
    }

    // 🔔 ENVIAR NOTIFICACIÓN AL COMPRADOR sobre el cambio de estado
    try {
      // Notificación genérica de cambio de estado
      await notifyOrderStatusChanged(
        order.clientId,
        orderId,
        updatedOrder?.orderNumber || 'N/A',
        order.status,
        status as OrderStatus
      )

      // Notificaciones específicas adicionales
      if (status === 'CONFIRMED') {
        await notifyOrderConfirmed(
          order.clientId,
          orderId,
          updatedOrder?.orderNumber || 'N/A',
          '2-3 días hábiles' // Estimación opcional
        )
      } else if (status === 'COMPLETED') {
        await notifyOrderCompleted(
          order.clientId,
          orderId,
          updatedOrder?.orderNumber || 'N/A'
        )
      } else if (status === 'DELIVERED' && user.role === 'CLIENT') {
        // Si el comprador marca como RECIBIDA, notificar al vendedor
        await notifyOrderReceived(
          order.sellerId,
          orderId,
          updatedOrder?.orderNumber || 'N/A',
          user.name
        )
      } else if (status === 'CANCELED' && user.role === 'CLIENT') {
        // 🚨 COMBO: Notificación + Mensaje automático al chat
        // Notificar al vendedor que la orden fue cancelada
        await notifyOrderCancelled(
          order.sellerId,
          orderId,
          updatedOrder?.orderNumber || 'N/A',
          user.name,
          notes // Razón de cancelación
        )
        
        // Enviar mensaje automático al chat
        await sendAutomaticCancellationMessage(
          order.sellerId,
          userId, // authId del cliente
          updatedOrder?.orderNumber || 'N/A',
          notes // Razón de cancelación
        )
      }

      logger.info(
        LogCategory.API,
        'Notification sent to client about order status change',
        {
          clientId: order.clientId,
          orderId,
          oldStatus: order.status,
          newStatus: status
        }
      )
    } catch (notifError) {
      // No bloquear la respuesta si falla la notificación
      logger.error(
        LogCategory.API,
        'Error sending status change notification to client',
        notifError
      )
    }

    // 🎉 Emitir evento ORDER_UPDATED para el sistema event-driven
    try {
      await eventEmitter.emit({
        type: EventType.ORDER_UPDATED,
        timestamp: new Date(),
        userId: userId,
        data: {
          orderId: orderId,
          clientId: updatedOrder?.clientId || order.clientId,
          sellerId: updatedOrder?.sellerId || order.sellerId,
          amount: updatedOrder ? Number(updatedOrder.totalAmount) : 0,
          status: status,
          oldStatus: order.status,
          changedBy: user.name,
          changedByRole: user.role,
          items: updatedOrder?.orderItems || []
        }
      })
    } catch (eventError) {
      // No bloquear la respuesta si falla el evento
      logger.error(
        LogCategory.API,
        'Error emitting ORDER_UPDATED event',
        eventError
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Estado actualizado correctamente con auditoría registrada',
      data: updatedOrder,
      history: result.auditEntry
    })

  } catch (error) {
    console.error('Error actualizando estado de orden:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al actualizar el estado',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    )
  }
}
