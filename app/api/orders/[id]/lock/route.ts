/**
 * POST /api/orders/[id]/lock
 * Vendedor bloquea/confirma el pedido (todos los productos disponibles)
 * Envía notificación multicanal al comprador
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { sendMultichannelNotification } from '@/lib/notifications-multicanal'
import { sendRealtimeEvent, getBuyerChannel } from '@/lib/supabase-server'
import { createNotification } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = await request.json()
    const { message } = body // Mensaje opcional del vendedor

    // Obtener la orden con cliente y vendedor
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: {
          include: {
            authenticated_users: { select: { authId: true }, take: 1 }
          }
        },
        seller: true,
        orderItems: {
          include: { product: true }
        },
        issues: {
          where: { status: { not: 'RESOLVED' } }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario es el vendedor
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: { some: { authId: userId } }
      }
    })

    if (!seller || seller.id !== order.sellerId) {
      return NextResponse.json({ error: 'No tienes permiso para bloquear esta orden' }, { status: 403 })
    }

    // Verificar que no hay issues pendientes
    if (order.issues.length > 0) {
      return NextResponse.json({
        error: 'No puedes bloquear la orden mientras hay problemas pendientes',
        pendingIssues: order.issues.length
      }, { status: 400 })
    }

    // Verificar estado válido para lock
    const validStates = ['PENDING', 'REVIEWING', 'ISSUE_REPORTED']
    if (!validStates.includes(order.status)) {
      return NextResponse.json({
        error: `No se puede bloquear una orden en estado ${order.status}`,
      }, { status: 400 })
    }

    // Actualizar la orden a LOCKED
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'LOCKED',
        lockedAt: new Date(),
        lockedBy: userId,
        confirmedAt: new Date(),
        generalMessage: message || null,
        hasIssues: false
      },
      include: {
        client: true,
        orderItems: true
      }
    })

    // Crear historial de estado
    await prisma.orderStatusHistory.create({
      data: {
        orderId: orderId,
        previousStatus: order.status,
        newStatus: 'LOCKED',
        changedBy: userId,
        changedByName: seller.name,
        changedByRole: 'SELLER',
        notes: message || 'Pedido confirmado y bloqueado por el vendedor'
      }
    })

    // Crear notificación en DB
    await createNotification({
      clientId: order.clientId,
      type: 'ORDER_CONFIRMED',
      title: '✅ Pedido Confirmado',
      message: `Tu orden #${order.orderNumber} ha sido confirmada. ${message || 'Todos los productos están disponibles.'}`,
      orderId: orderId
    })

    // 📡 Enviar notificación multicanal (SMS, Email, WhatsApp)
    const client = order.client
    try {
      await sendMultichannelNotification({
        clientId: client.id,
        clientName: client.name,
        clientEmail: client.email,
        clientPhone: client.phone,
        clientWhatsapp: client.whatsappNumber,
        preferredChannel: client.preferredChannel,
        type: 'ORDER_LOCKED',
        data: {
          orderNumber: order.orderNumber,
          totalAmount: Number(order.totalAmount),
          itemCount: order.orderItems.length,
          message: message || 'Todos los productos están disponibles.',
          sellerName: seller.name
        }
      })
    } catch (notifError) {
      console.error('Error enviando notificación multicanal:', notifError)
      // No fallar si la notificación falla
    }

    // 📡 Enviar evento realtime
    const buyerAuthId = order.client.authenticated_users?.[0]?.authId
    if (buyerAuthId) {
      await sendRealtimeEvent(
        getBuyerChannel(buyerAuthId),
        'order:locked',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: 'LOCKED',
          message: message || 'Tu pedido ha sido confirmado'
        }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Orden bloqueada exitosamente',
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        status: updatedOrder.status,
        lockedAt: updatedOrder.lockedAt
      }
    })

  } catch (error) {
    console.error('Error en POST /api/orders/[id]/lock:', error)
    return NextResponse.json(
      { error: 'Error al bloquear la orden' },
      { status: 500 }
    )
  }
}
