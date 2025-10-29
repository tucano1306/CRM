import { PrismaClient } from '@prisma/client'
import { formatPrice } from './utils'

const prisma = new PrismaClient()

// Tipo definido manualmente para coincidir con el schema de Prisma
export type NotificationType = 
  | 'NEW_ORDER'
  | 'ORDER_MODIFIED'
  | 'ORDER_CANCELLED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_COMPLETED'
  | 'ORDER_RECEIVED'
  | 'PAYMENT_RECEIVED'
  | 'CHAT_MESSAGE'
  | 'RETURN_REQUEST'
  | 'RETURN_APPROVED'
  | 'RETURN_REJECTED'
  | 'QUOTE_CREATED'
  | 'QUOTE_UPDATED'
  | 'QUOTE_SENT'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_REJECTED'
  | 'CREDIT_NOTE_ISSUED'
  | 'LOW_STOCK_ALERT'

interface CreateNotificationParams {
  sellerId?: string    // Para notificaciones al vendedor
  clientId?: string    // Para notificaciones al comprador
  type: NotificationType
  title: string
  message: string
  orderId?: string
  relatedId?: string   // ID de cotización, devolución, etc.
  metadata?: Record<string, any>
}

/**
 * Crear una notificación (puede ser para vendedor o comprador)
 */
export async function createNotification(params: CreateNotificationParams) {
  try {
    if (!params.sellerId && !params.clientId) {
      throw new Error('Debe especificar sellerId o clientId')
    }

    const notification = await prisma.notification.create({
      data: {
        sellerId: params.sellerId,
        clientId: params.clientId,
        type: params.type,
        title: params.title,
        message: params.message,
        orderId: params.orderId,
        relatedId: params.relatedId,
        ...(params.metadata && { metadata: params.metadata }),
      },
    })

    console.log('✅ Notificación creada:', {
      id: notification.id,
      type: notification.type,
      to: params.sellerId ? `Vendedor: ${params.sellerId}` : `Comprador: ${params.clientId}`,
    })

    return notification
  } catch (error) {
    console.error('❌ Error creando notificación:', error)
    throw error
  }
}

/**
 * Crear notificación cuando se crea una nueva orden
 */
export async function notifyNewOrder(
  sellerId: string,
  orderId: string,
  orderNumber: string,
  clientName: string,
  totalAmount: number
) {
  return createNotification({
    sellerId,
    type: 'NEW_ORDER',
    title: '🛒 Nueva Orden Recibida',
    message: `${clientName} ha creado una nueva orden #${orderNumber} por ${formatPrice(totalAmount)}`,
    orderId,
    metadata: {
      orderNumber,
      clientName,
      totalAmount,
    },
  })
}

/**
 * Crear notificación para el COMPRADOR cuando crea una orden
 */
export async function notifyBuyerOrderCreated(
  clientId: string,
  orderId: string,
  orderNumber: string,
  totalAmount: number
) {
  return createNotification({
    clientId,
    type: 'ORDER_CONFIRMED',
    title: '✅ Orden Creada Exitosamente',
    message: `Tu orden #${orderNumber} ha sido creada exitosamente por ${formatPrice(totalAmount)}. El vendedor la revisará pronto.`,
    orderId,
    metadata: {
      orderNumber,
      totalAmount,
    },
  })
}

/**
 * Crear notificación cuando se modifica una orden
 */
export async function notifyOrderModified(
  sellerId: string,
  orderId: string,
  orderNumber: string,
  clientName: string,
  modifiedBy: string,
  changes: string[]
) {
  return createNotification({
    sellerId,
    type: 'ORDER_MODIFIED',
    title: '📝 Orden Modificada',
    message: `${clientName} modificó la orden #${orderNumber}. Cambios: ${changes.join(', ')}`,
    orderId,
    metadata: {
      orderNumber,
      clientName,
      modifiedBy,
      changes,
    },
  })
}

/**
 * Crear notificación cuando se cancela una orden
 */
export async function notifyOrderCancelled(
  sellerId: string,
  orderId: string,
  orderNumber: string,
  clientName: string,
  reason?: string
) {
  return createNotification({
    sellerId,
    type: 'ORDER_CANCELLED',
    title: '❌ Orden Cancelada',
    message: `${clientName} canceló la orden #${orderNumber}${reason ? `. Razón: ${reason}` : ''}`,
    orderId,
    metadata: {
      orderNumber,
      clientName,
      reason,
    },
  })
}

/**
 * Crear notificación para mensaje de chat
 */
export async function notifyChatMessage(
  sellerId: string,
  clientName: string,
  message: string
) {
  return createNotification({
    sellerId,
    type: 'CHAT_MESSAGE',
    title: '💬 Nuevo Mensaje',
    message: `${clientName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`,
    metadata: {
      clientName,
      messagePreview: message.substring(0, 100),
    },
  })
}

/**
 * Crear notificación para solicitud de devolución
 */
export async function notifyReturnRequest(
  sellerId: string,
  orderId: string,
  orderNumber: string,
  clientName: string,
  reason: string
) {
  return createNotification({
    sellerId,
    type: 'RETURN_REQUEST',
    title: '↩️ Solicitud de Devolución',
    message: `${clientName} solicitó devolución para orden #${orderNumber}. Razón: ${reason}`,
    orderId,
    metadata: {
      orderNumber,
      clientName,
      reason,
    },
  })
}

/**
 * Obtener contador de notificaciones no leídas
 */
export async function getUnreadCount(sellerId?: string, clientId?: string): Promise<number> {
  try {
    const where: any = { isRead: false }
    
    if (sellerId) where.sellerId = sellerId
    if (clientId) where.clientId = clientId
    
    const count = await prisma.notification.count({ where })
    return count
  } catch (error) {
    console.error('Error getting unread count:', error)
    return 0
  }
}

// ============================================================================
// NOTIFICACIONES AL COMPRADOR (Vendedor → Comprador)
// ============================================================================

/**
 * Notificar al comprador que su orden cambió de estado
 */
export async function notifyOrderStatusChanged(
  clientId: string,
  orderId: string,
  orderNumber: string,
  oldStatus: string,
  newStatus: string
) {
  const statusMessages: Record<string, { title: string; emoji: string }> = {
    CONFIRMED: { title: '✅ Orden Confirmada', emoji: '✅' },
    IN_PROGRESS: { title: '🔄 Orden en Preparación', emoji: '🔄' },
    READY: { title: '📦 Orden Lista', emoji: '📦' },
    DELIVERED: { title: '🚚 Orden Entregada', emoji: '🚚' },
    COMPLETED: { title: '🎉 Orden Completada', emoji: '🎉' },
    CANCELLED: { title: '❌ Orden Cancelada', emoji: '❌' },
  }

  const statusInfo = statusMessages[newStatus] || { title: '📋 Estado Actualizado', emoji: '📋' }

  return createNotification({
    clientId,
    type: 'ORDER_STATUS_CHANGED',
    title: statusInfo.title,
    message: `Tu orden #${orderNumber} cambió de estado: ${oldStatus} → ${newStatus}`,
    orderId,
    metadata: {
      orderNumber,
      oldStatus,
      newStatus,
    },
  })
}

/**
 * Notificar al comprador que su orden fue confirmada
 */
export async function notifyOrderConfirmed(
  clientId: string,
  orderId: string,
  orderNumber: string,
  estimatedDelivery?: string
) {
  return createNotification({
    clientId,
    type: 'ORDER_CONFIRMED',
    title: '✅ Orden Confirmada',
    message: `Tu orden #${orderNumber} ha sido confirmada${estimatedDelivery ? `. Entrega estimada: ${estimatedDelivery}` : ''}`,
    orderId,
    metadata: {
      orderNumber,
      estimatedDelivery,
    },
  })
}

/**
 * Notificar al comprador que su orden está completada
 */
export async function notifyOrderCompleted(
  clientId: string,
  orderId: string,
  orderNumber: string
) {
  return createNotification({
    clientId,
    type: 'ORDER_COMPLETED',
    title: '🎉 Orden Completada',
    message: `Tu orden #${orderNumber} ha sido completada. ¡Gracias por tu compra!`,
    orderId,
    metadata: {
      orderNumber,
    },
  })
}

/**
 * Notificar al vendedor que el comprador recibió la orden
 */
export async function notifyOrderReceived(
  sellerId: string,
  orderId: string,
  orderNumber: string,
  clientName: string
) {
  return createNotification({
    clientId: sellerId, // Notificar al vendedor
    type: 'ORDER_RECEIVED',
    title: '✅ Mercancía Recibida',
    message: `${clientName} confirmó que recibió la orden #${orderNumber}`,
    orderId,
    metadata: {
      orderNumber,
      clientName,
      receivedAt: new Date().toISOString(),
    },
  })
}

/**
 * Notificar al comprador que se creó una cotización
 */
export async function notifyQuoteCreated(
  clientId: string,
  quoteId: string,
  quoteNumber: string,
  totalAmount: number
) {
  return createNotification({
    clientId,
    type: 'QUOTE_CREATED',
    title: '📋 Nueva Cotización',
    message: `Se ha creado una cotización #${quoteNumber} por ${formatPrice(totalAmount)}`,
    relatedId: quoteId,
    metadata: {
      quoteNumber,
      totalAmount,
    },
  })
}

/**
 * Notificar al comprador que se actualizó una cotización
 */
export async function notifyQuoteUpdated(
  clientId: string,
  quoteId: string,
  quoteNumber: string,
  changes: string[]
) {
  return createNotification({
    clientId,
    type: 'QUOTE_UPDATED',
    title: '📝 Cotización Actualizada',
    message: `La cotización #${quoteNumber} fue actualizada. Cambios: ${changes.join(', ')}`,
    relatedId: quoteId,
    metadata: {
      quoteNumber,
      changes,
    },
  })
}

/**
 * Notificar al comprador sobre aprobación de devolución
 */
export async function notifyReturnApproved(
  clientId: string,
  returnId: string,
  returnNumber: string,
  refundAmount: number
) {
  return createNotification({
    clientId,
    type: 'RETURN_APPROVED',
    title: '✅ Devolución Aprobada',
    message: `Tu devolución #${returnNumber} fue aprobada. Reembolso: ${formatPrice(refundAmount)}`,
    relatedId: returnId,
    metadata: {
      returnNumber,
      amount: refundAmount, // Usar 'amount' para consistencia con el modal
    },
  })
}

/**
 * Notificar al comprador sobre rechazo de devolución
 */
export async function notifyReturnRejected(
  clientId: string,
  returnId: string,
  returnNumber: string,
  reason: string
) {
  return createNotification({
    clientId,
    type: 'RETURN_REJECTED',
    title: '❌ Devolución Rechazada',
    message: `Tu devolución #${returnNumber} fue rechazada. Razón: ${reason}`,
    relatedId: returnId,
    metadata: {
      returnNumber,
      reason,
    },
  })
}

/**
 * Notificar al comprador sobre nota de crédito
 */
export async function notifyCreditNoteIssued(
  clientId: string,
  creditNoteId: string,
  creditNoteNumber: string,
  amount: number
) {
  return createNotification({
    clientId,
    type: 'CREDIT_NOTE_ISSUED',
    title: '💳 Nota de Crédito Emitida',
    message: `Se emitió una nota de crédito #${creditNoteNumber} por ${formatPrice(amount)}`,
    relatedId: creditNoteId,
    metadata: {
      creditNoteNumber,
      amount,
    },
  })
}

/**
 * Enviar mensaje automático al chat cuando se cancela una orden
 */
export async function sendAutomaticCancellationMessage(
  sellerId: string,
  clientAuthId: string,
  orderNumber: string,
  reason?: string
) {
  try {
    console.log('🔍 Iniciando envío de mensaje automático de cancelación:', {
      sellerId,
      clientAuthId,
      orderNumber,
      reason
    })

    const now = new Date()
    const formattedDate = now.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const formattedTime = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const message = `🤖 ═══════════════════════════════\n` +
      `   MENSAJE AUTOMÁTICO DEL SISTEMA\n` +
      `═══════════════════════════════\n\n` +
      `❌ ORDEN CANCELADA\n\n` +
      `📦 Orden: #${orderNumber}\n` +
      `📅 Fecha: ${formattedDate}\n` +
      `🕒 Hora: ${formattedTime}\n` +
      `${reason ? `\n📝 Motivo de cancelación:\n"${reason}"\n` : '\n⚠️ Sin motivo especificado\n'}` +
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⚡ Acción requerida: Por favor, toma las medidas necesarias para procesar esta cancelación.`

    // Verificar que el cliente existe en authenticated_users
    const clientUser = await prisma.authenticated_users.findUnique({
      where: { authId: clientAuthId },
      select: { id: true, authId: true, role: true }
    })

    if (!clientUser) {
      console.error('❌ Cliente no encontrado en authenticated_users:', clientAuthId)
      return
    }

    console.log('✅ Cliente encontrado:', clientUser)

    // Buscar el usuario autenticado del vendedor a través de la relación many-to-many
    // Filtrar usuarios reales de Clerk (authId empieza con "user_")
    const sellerUser = await prisma.authenticated_users.findFirst({
      where: { 
        sellers: {
          some: {
            id: sellerId
          }
        },
        authId: {
          startsWith: 'user_' // Solo usuarios reales de Clerk
        }
      },
      select: { id: true, authId: true }
    })

    if (!sellerUser?.authId) {
      console.error('❌ Vendedor no encontrado en authenticated_users para sellerId:', sellerId)
      return
    }

    console.log('✅ Vendedor encontrado:', sellerUser)

    // Crear el mensaje en el chat usando el ID interno de authenticated_users
    const chatMessage = await prisma.chatMessage.create({
      data: {
        senderId: clientAuthId, // Clerk authId del cliente
        receiverId: sellerUser.authId, // Clerk authId del vendedor
        userId: clientUser.id, // ID interno de authenticated_users
        sellerId: sellerId, // ID del vendedor
        message,
        isRead: false,
        messageType: 'text',
        idempotencyKey: `cancel-${orderNumber}-${now.getTime()}`,
      },
    })

    console.log('✅ Mensaje automático de cancelación enviado al chat:', chatMessage.id)
  } catch (error) {
    console.error('❌ Error enviando mensaje automático al chat:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A')
    // No lanzar error para no bloquear la cancelación
  }
}
