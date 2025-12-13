/**
 * API para gestionar problemas con productos en una orden
 * POST /api/orders/[id]/issues - Reportar problema (vendedor)
 * GET /api/orders/[id]/issues - Listar problemas
 * PATCH /api/orders/[id]/issues - Responder a problema (comprador)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { sendRealtimeEvent, getBuyerChannel, getSellerChannel } from '@/lib/supabase-server'
import { sendMultichannelNotification } from '@/lib/notifications-multicanal'

/**
 * POST - Vendedor reporta un problema con un producto
 */
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
    const {
      issueType,
      description,
      productId,
      productName,
      requestedQty,
      availableQty,
      proposedSolution,
      substituteProductId,
      substituteProductName
    } = body

    // Verificar orden y permisos
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        seller: {
          include: { authenticated_users: { select: { authId: true } } }
        },
        client: {
          include: { authenticated_users: { select: { authId: true }, take: 1 } }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const isSeller = order.seller.authenticated_users.some(u => u.authId === userId)
    if (!isSeller) {
      return NextResponse.json({ error: 'Solo el vendedor puede reportar problemas' }, { status: 403 })
    }

    // Crear el issue
    const issue = await prisma.orderIssue.create({
      data: {
        orderId,
        issueType,
        description,
        productId,
        productName,
        requestedQty,
        availableQty,
        proposedSolution,
        substituteProductId,
        substituteProductName,
        status: 'BUYER_NOTIFIED',
        reportedBy: userId
      }
    })

    // Actualizar orden a ISSUE_REPORTED si no está ya
    if (order.status !== 'ISSUE_REPORTED') {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'ISSUE_REPORTED',
          hasIssues: true
        }
      })

      await prisma.orderStatusHistory.create({
        data: {
          orderId,
          previousStatus: order.status,
          newStatus: 'ISSUE_REPORTED',
          changedBy: userId,
          changedByName: order.seller.name,
          changedByRole: 'SELLER',
          notes: `Problema reportado: ${description}`
        }
      })
    }

    // Notificar al comprador
    await createNotification({
      clientId: order.clientId,
      type: 'ORDER_STATUS_CHANGED',
      title: '⚠️ Problema con tu pedido',
      message: `Hay un problema con tu orden #${order.orderNumber}: ${description}`,
      orderId,
      relatedId: issue.id
    })

    // Notificación multicanal
    try {
      await sendMultichannelNotification({
        clientId: order.client.id,
        clientName: order.client.name,
        clientEmail: order.client.email,
        clientPhone: order.client.phone,
        clientWhatsapp: order.client.whatsappNumber,
        preferredChannel: order.client.preferredChannel,
        type: 'ORDER_ISSUE',
        data: {
          orderNumber: order.orderNumber,
          productName: productName || 'Producto',
          issue: description,
          proposedSolution: proposedSolution || 'El vendedor te contactará',
          sellerName: order.seller.name
        }
      })
    } catch (notifError) {
      console.error('Error enviando notificación multicanal:', notifError)
    }

    // Realtime al comprador
    const buyerAuthId = order.client.authenticated_users?.[0]?.authId
    if (buyerAuthId) {
      await sendRealtimeEvent(
        getBuyerChannel(buyerAuthId),
        'order:issue-reported',
        {
          orderId,
          orderNumber: order.orderNumber,
          issueId: issue.id,
          issueType,
          description,
          productName
        }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Problema reportado y comprador notificado',
      issue
    })

  } catch (error) {
    console.error('Error en POST /api/orders/[id]/issues:', error)
    return NextResponse.json({ error: 'Error al reportar problema' }, { status: 500 })
  }
}

/**
 * GET - Listar problemas de una orden
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId } = await params

    const issues = await prisma.orderIssue.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      issues
    })

  } catch (error) {
    console.error('Error en GET /api/orders/[id]/issues:', error)
    return NextResponse.json({ error: 'Error al obtener problemas' }, { status: 500 })
  }
}

/**
 * PATCH - Comprador responde a un problema
 */
export async function PATCH(
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
    const { issueId, accepted, response } = body

    // Verificar orden y permisos
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: {
          include: { authenticated_users: { select: { authId: true } } }
        },
        seller: {
          include: { authenticated_users: { select: { authId: true }, take: 1 } }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    const isBuyer = order.client.authenticated_users.some(u => u.authId === userId)
    if (!isBuyer) {
      return NextResponse.json({ error: 'Solo el comprador puede responder' }, { status: 403 })
    }

    // Actualizar el issue
    const updatedIssue = await prisma.orderIssue.update({
      where: { id: issueId },
      data: {
        buyerAccepted: accepted,
        buyerResponse: response,
        status: accepted ? 'ACCEPTED' : 'REJECTED',
        resolvedAt: accepted ? new Date() : null,
        resolvedBy: accepted ? userId : null
      }
    })

    // Verificar si todos los issues están resueltos
    const pendingIssues = await prisma.orderIssue.count({
      where: {
        orderId,
        status: { notIn: ['ACCEPTED', 'RESOLVED'] }
      }
    })

    // Notificar al vendedor
    await createNotification({
      sellerId: order.sellerId,
      type: 'ORDER_STATUS_CHANGED',
      title: accepted ? '✅ Solución aceptada' : '❌ Solución rechazada',
      message: `El comprador ${accepted ? 'aceptó' : 'rechazó'} la solución para orden #${order.orderNumber}`,
      orderId,
      relatedId: issueId
    })

    // Realtime al vendedor
    const sellerAuthId = order.seller.authenticated_users?.[0]?.authId
    if (sellerAuthId) {
      await sendRealtimeEvent(
        getSellerChannel(sellerAuthId),
        'order:issue-response',
        {
          orderId,
          orderNumber: order.orderNumber,
          issueId,
          accepted,
          response,
          pendingIssues
        }
      )
    }

    return NextResponse.json({
      success: true,
      message: accepted ? 'Solución aceptada' : 'Solución rechazada',
      issue: updatedIssue,
      pendingIssues,
      canLock: pendingIssues === 0
    })

  } catch (error) {
    console.error('Error en PATCH /api/orders/[id]/issues:', error)
    return NextResponse.json({ error: 'Error al responder' }, { status: 500 })
  }
}
