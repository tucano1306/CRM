/**
 * POST /api/orders/[id]/report-stock-issues
 * Reporta múltiples problemas de stock y envía notificación consolidada
 * por todos los canales: WhatsApp, Email, SMS, y App
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { sendRealtimeEvent, getBuyerChannel } from '@/lib/supabase-server'
import { sendMultichannelNotification } from '@/lib/notifications-multicanal'

interface StockIssue {
  productId: string
  productName: string
  issueType: 'OUT_OF_STOCK' | 'PARTIAL_STOCK'
  requestedQty: number
  availableQty: number
}

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
    const { issues } = body as { issues: StockIssue[] }

    if (!issues || issues.length === 0) {
      return NextResponse.json({ error: 'No hay problemas para reportar' }, { status: 400 })
    }

    // Obtener la orden con cliente y vendedor
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        seller: {
          include: { authenticated_users: { select: { id: true, authId: true }, take: 1 } }
        },
        client: {
          include: { authenticated_users: { select: { id: true, authId: true }, take: 1 } }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Verificar que el usuario es el vendedor
    const isSeller = order.seller.authenticated_users.some(u => u.authId === userId)
    if (!isSeller) {
      return NextResponse.json({ error: 'Solo el vendedor puede reportar problemas' }, { status: 403 })
    }

    // Separar productos sin stock y con stock parcial
    const outOfStock = issues.filter(i => i.issueType === 'OUT_OF_STOCK')
    const partialStock = issues.filter(i => i.issueType === 'PARTIAL_STOCK')

    // Crear issues en la base de datos
    const createdIssues = await Promise.all(
      issues.map(issue => 
        prisma.orderIssue.create({
          data: {
            orderId,
            issueType: issue.issueType,
            description: issue.issueType === 'OUT_OF_STOCK' 
              ? `Producto "${issue.productName}" sin stock disponible`
              : `Producto "${issue.productName}" con stock parcial: ${issue.availableQty} de ${issue.requestedQty} disponibles`,
            productId: issue.productId,
            productName: issue.productName,
            requestedQty: issue.requestedQty,
            availableQty: issue.availableQty,
            proposedSolution: issue.issueType === 'OUT_OF_STOCK'
              ? 'El vendedor te contactará para ofrecer alternativas'
              : `Se pueden enviar ${issue.availableQty} unidades. El vendedor te contactará para confirmar.`,
            status: 'BUYER_NOTIFIED',
            reportedBy: userId
          }
        })
      )
    )

    // Actualizar orden a ISSUE_REPORTED
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'ISSUE_REPORTED',
        hasIssues: true
      }
    })

    // Crear historial
    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        previousStatus: order.status,
        newStatus: 'ISSUE_REPORTED',
        changedBy: userId,
        changedByName: order.seller.name,
        changedByRole: 'SELLER',
        notes: `Problemas de stock reportados: ${issues.length} producto(s)`
      }
    })

    // ===============================================
    // GENERAR MENSAJE AUTOMÁTICO INTELIGENTE
    // ===============================================
    
    let messageLines: string[] = []
    messageLines.push(`⚠️ *Problemas con tu Pedido #${order.orderNumber}*`)
    messageLines.push('')
    messageLines.push(`Hola ${order.client.name},`)
    messageLines.push('')
    messageLines.push(`El vendedor *${order.seller.name}* ha revisado tu pedido y encontró los siguientes problemas:`)
    messageLines.push('')

    // Productos SIN STOCK
    if (outOfStock.length > 0) {
      messageLines.push('❌ *PRODUCTOS SIN STOCK:*')
      outOfStock.forEach(item => {
        messageLines.push(`   • ${item.productName} (solicitaste ${item.requestedQty})`)
      })
      messageLines.push('')
    }

    // Productos con STOCK PARCIAL
    if (partialStock.length > 0) {
      messageLines.push('⚠️ *PRODUCTOS CON STOCK PARCIAL:*')
      partialStock.forEach(item => {
        messageLines.push(`   • ${item.productName}: solo hay ${item.availableQty} de ${item.requestedQty} solicitados`)
      })
      messageLines.push('')
    }

    messageLines.push('📞 *El vendedor te contactará para resolver esto.*')
    messageLines.push('También puedes responder a este mensaje o usar el chat de la app.')
    messageLines.push('')
    messageLines.push(`🔗 Ver pedido: ${process.env.NEXT_PUBLIC_APP_URL || 'https://tuapp.com'}/buyer/orders`)

    const fullMessage = messageLines.join('\n')
    
    // Mensaje corto para SMS
    const issuesParts: string[] = []
    if (outOfStock.length > 0) {
      issuesParts.push(`${outOfStock.length} producto(s) sin stock`)
    }
    if (partialStock.length > 0) {
      issuesParts.push(`${partialStock.length} con stock parcial`)
    }
    const shortMessage = `⚠️ Pedido #${order.orderNumber}: ${issuesParts.join(', ')}. El vendedor te contactará.`

    // ===============================================
    // ENVIAR NOTIFICACIONES POR TODOS LOS CANALES
    // ===============================================

    console.log('🔔 [NOTIFICACIONES] Iniciando envío de notificaciones...')
    console.log('🔔 [NOTIFICACIONES] Cliente:', {
      id: order.client.id,
      name: order.client.name,
      email: order.client.email,
      phone: order.client.phone,
      whatsappNumber: order.client.whatsappNumber
    })

    // 1. Notificación en la APP
    console.log('📱 [APP] Creando notificación in-app...')
    try {
      await createNotification({
        clientId: order.clientId,
        type: 'ORDER_STATUS_CHANGED',
        title: '⚠️ Problemas con tu pedido',
        message: `Tu orden #${order.orderNumber} tiene ${issues.length} producto(s) con problemas de stock. El vendedor te contactará.`,
        orderId,
        relatedId: createdIssues[0]?.id
      })
      console.log('✅ [APP] Notificación in-app creada')
    } catch (appError) {
      console.error('❌ [APP] Error creando notificación:', appError)
    }

    // 2. Notificación Multicanal (Email, SMS, WhatsApp)
    const notificationResults = []
    
    console.log('📤 [MULTICANAL] Enviando notificaciones multicanal...')
    console.log('📤 [MULTICANAL] Mensaje:', fullMessage.substring(0, 200) + '...')
    
    try {
      // Enviar por el canal preferido y adicionales
      const results = await sendMultichannelNotification({
        clientId: order.client.id,
        clientName: order.client.name,
        clientEmail: order.client.email,
        clientPhone: order.client.phone,
        clientWhatsapp: order.client.whatsappNumber,
        preferredChannel: 'ALL', // Forzar TODOS los canales
        type: 'CUSTOM',
        data: {
          customMessage: fullMessage
        }
      })
      console.log('📤 [MULTICANAL] Resultados:', JSON.stringify(results, null, 2))
      notificationResults.push(...results)
    } catch (notifError) {
      console.error('❌ [MULTICANAL] Error enviando notificaciones:', notifError)
    }

    // 3. Evento Realtime al comprador
    const buyerAuthId = order.client.authenticated_users?.[0]?.authId
    if (buyerAuthId) {
      await sendRealtimeEvent(
        getBuyerChannel(buyerAuthId),
        'order:stock-issues',
        {
          orderId,
          orderNumber: order.orderNumber,
          issuesCount: issues.length,
          outOfStockCount: outOfStock.length,
          partialStockCount: partialStock.length,
          issues: issues.map(i => ({
            productName: i.productName,
            issueType: i.issueType,
            requestedQty: i.requestedQty,
            availableQty: i.availableQty
          }))
        }
      )
    }

    // 4. Enviar mensaje automático al CHAT de la app
    const sellerAuthId = order.seller.authenticated_users?.[0]?.authId
    const sellerUserId = order.seller.authenticated_users?.[0]?.id
    if (sellerAuthId && buyerAuthId && sellerUserId) {
      try {
        // Mensaje más corto para el chat
        let chatMessage = `⚠️ *Aviso sobre tu Pedido #${order.orderNumber}*\n\n`
        if (outOfStock.length > 0) {
          chatMessage += `❌ Sin stock: ${outOfStock.map(i => i.productName).join(', ')}\n`
        }
        if (partialStock.length > 0) {
          chatMessage += `⚠️ Stock parcial: ${partialStock.map(i => `${i.productName} (${i.availableQty}/${i.requestedQty})`).join(', ')}\n`
        }
        chatMessage += `\n📞 Te contactaré para resolver esto.`

        await prisma.chatMessage.create({
          data: {
            senderId: sellerAuthId,
            receiverId: buyerAuthId,
            message: chatMessage,
            messageType: 'STOCK_ISSUE',
            userId: sellerUserId,
            sellerId: order.sellerId,
            orderId: orderId
          }
        })
        console.log('✅ [CHAT] Mensaje enviado al chat de la app')
      } catch (chatError) {
        console.error('❌ [CHAT] Error enviando mensaje al chat:', chatError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Problemas reportados y notificaciones enviadas`,
      summary: {
        totalIssues: issues.length,
        outOfStock: outOfStock.length,
        partialStock: partialStock.length,
        issueIds: createdIssues.map(i => i.id)
      },
      notifications: notificationResults
    })

  } catch (error) {
    console.error('Error en POST /api/orders/[id]/report-stock-issues:', error)
    return NextResponse.json({ error: 'Error al reportar problemas de stock' }, { status: 500 })
  }
}
