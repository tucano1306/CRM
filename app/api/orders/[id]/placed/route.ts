import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withPrismaTimeout } from '@/lib/timeout'
import logger, { LogCategory } from '@/lib/logger'
import { notifyOrderStatusChanged } from '@/lib/notifications'

/**
 * PATCH /api/orders/[id]/placed
 * Cambiar orden de PENDING a PLACED (solo para método MANUAL)
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
    const idempotencyKey = body.idempotencyKey as string | undefined

    // ✅ Verificar idempotencia
    if (idempotencyKey) {
      const existing = await withPrismaTimeout(
        () => prisma.orderStatusChange.findFirst({
          where: { idempotencyKey }
        })
      )
      
      if (existing) {
        logger.info(LogCategory.API, 'Order placement already processed (idempotent)', { 
          orderId, 
          idempotencyKey 
        })
        
        // Retornar orden actualizada
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
          message: 'Order placement already processed (idempotent)' 
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
          }
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
      logger.warn(LogCategory.SECURITY, 'Unauthorized order placement attempt', {
        userId,
        orderId,
        clientId: order.clientId
      })
      
      return NextResponse.json({ 
        error: 'No autorizado para confirmar esta orden' 
      }, { status: 403 })
    }

    // Verificar que la orden está PENDING
    if (order.status !== 'PENDING') {
      return NextResponse.json({ 
        error: `No se puede confirmar una orden con estado ${order.status}` 
      }, { status: 400 })
    }

    // TODO: Verificar que el método de confirmación es MANUAL
    // (requiere campo en Client model: orderConfirmationMethod)

    // Actualizar orden a PLACED
    const updatedOrder = await withPrismaTimeout(
      () => prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED', // O 'PLACED' si tienes ese estado
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
          newStatus: updatedOrder.status,
          changedBy: userId,
          idempotencyKey,
          reason: 'Confirmación manual del comprador'
        }
      })
    }

    // Notificar al vendedor
    try {
      await notifyOrderStatusChanged(
        order.clientId,
        orderId,
        order.orderNumber,
        order.status,
        updatedOrder.status
      )
    } catch (notifError) {
      logger.error(LogCategory.API, 'Failed to send notification', notifError)
    }

    logger.info(LogCategory.API, 'Order placed successfully', {
      orderId,
      oldStatus: order.status,
      newStatus: updatedOrder.status,
      userId
    })

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Orden confirmada exitosamente'
    })

  } catch (error) {
    logger.error(LogCategory.API, 'Error placing order', error)
    
    return NextResponse.json({
      success: false,
      error: 'Error al confirmar la orden'
    }, { status: 500 })
  }
}
