import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withPrismaTimeout } from '@/lib/timeout'
import logger, { LogCategory } from '@/lib/logger'
import { notifyOrderCancelled, sendAutomaticCancellationMessage } from '@/lib/notifications'

/**
 * PATCH /api/orders/[id]/cancel
 * Cancelar una orden PENDING antes del deadline
 * Solo accesible por el comprador dueño de la orden
 * ✅ IDEMPOTENTE
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params
  
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { reason, idempotencyKey } = body

    // ✅ Verificar idempotencia
    if (idempotencyKey) {
      const existing = await withPrismaTimeout(
        () => prisma.orderStatusChange.findFirst({
          where: { idempotencyKey }
        })
      )
      
      if (existing) {
        logger.info(LogCategory.API, 'Order cancellation already processed (idempotent)', { 
          orderId, 
          idempotencyKey 
        })
        
        const order = await prisma.order.findUnique({
          where: { id: orderId },
          include: {
            client: true,
            seller: true,
            orderItems: {
              include: { product: true }
            }
          }
        })
        
        return NextResponse.json({ 
          success: true, 
          order,
          message: 'Order cancellation already processed (idempotent)' 
        })
      }
    }

    // Obtener orden con cliente
    const order = await withPrismaTimeout(
      () => prisma.order.findUnique({
        where: { id: orderId },
        include: {
          client: {
            include: {
              authenticated_users: true
            }
          },
          seller: true
        }
      })
    )

    if (!order) {
      return NextResponse.json({ 
        error: 'Orden no encontrada' 
      }, { status: 404 })
    }

    // 🔒 SEGURIDAD: Verificar que el usuario es dueño de la orden
    const isOwner = order.client.authenticated_users.some(
      (auth) => auth.authId === userId
    )

    if (!isOwner) {
      logger.warn(LogCategory.SECURITY, 'Unauthorized order cancellation attempt', {
        userId,
        orderId,
        clientId: order.clientId
      })
      
      return NextResponse.json({ 
        error: 'No autorizado para cancelar esta orden' 
      }, { status: 403 })
    }

    // Verificar que la orden está PENDING
    if (order.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `No se puede cancelar una orden con estado ${order.status}` 
      }, { status: 400 })
    }

    // Verificar que no se pasó el deadline
    if (order.confirmationDeadline) {
      const now = new Date()
      const deadline = new Date(order.confirmationDeadline)
      
      if (now > deadline) {
        return NextResponse.json({ 
          error: 'El tiempo para cancelar esta orden ha expirado' 
        }, { status: 400 })
      }
    }

    // Cancelar orden y restaurar stock
    const updatedOrder = await withPrismaTimeout(
      () => prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELED', // ✅ Corregido: CANCELED no CANCELLED
          notes: reason ? `${order.notes || ''}\n\nMotivo cancelación: ${reason}`.trim() : order.notes,
          updatedAt: new Date()
        },
        include: {
          client: true,
          seller: true,
          orderItems: {
            include: { product: true }
          }
        }
      })
    )

    // Registrar cambio de estado para idempotencia
    if (idempotencyKey) {
      await prisma.orderStatusChange.create({
        data: {
          orderId,
          oldStatus: order.status,
          newStatus: 'CANCELED',
          changedBy: userId,
          idempotencyKey,
          reason: reason || 'Cancelación por el comprador'
        }
      })
    }

    // Restaurar stock de productos
    for (const item of updatedOrder.orderItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            increment: item.quantity
          }
        }
      })
    }

    // Notificar al vendedor
    try {
      await notifyOrderCancelled(
        order.sellerId,
        orderId,
        order.orderNumber,
        order.client.name,
        reason
      )

      // Enviar mensaje automático al chat
      await sendAutomaticCancellationMessage(
        order.sellerId,
        userId,
        order.orderNumber,
        reason
      )
    } catch (notifError) {
      logger.error(LogCategory.API, 'Failed to send cancellation notification', notifError)
    }

    logger.info(LogCategory.API, 'Order cancelled successfully', {
      orderId,
      userId,
      reason
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Orden cancelada exitosamente'
    })

  } catch (error) {
    logger.error(LogCategory.API, 'Error cancelling order', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error al cancelar la orden'
    }, { status: 500 })
  }
}
