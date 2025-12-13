/**
 * Servicio de notificaciones multicanal
 * Soporta: Email (Mailersend), SMS (Twilio), WhatsApp (Twilio), Notificaciones App
 * 
 * Configuración requerida en .env:
 * - MAILERSEND_API_KEY: Para envío de emails via Mailersend
 * - TWILIO_ACCOUNT_SID: Para SMS y WhatsApp
 * - TWILIO_AUTH_TOKEN: Token de autenticación Twilio
 * - TWILIO_PHONE_NUMBER: Número de teléfono Twilio para SMS
 * - TWILIO_WHATSAPP_NUMBER: Número de WhatsApp Business (ej: +14155238886)
 * - NEXT_PUBLIC_APP_URL: URL base de la aplicación
 */

import { prisma } from '@/lib/prisma'

// Tipos de notificación
export type NotificationType = 
  | 'ORDER_CREATED'
  | 'ORDER_LOCKED'
  | 'ORDER_ISSUE'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_DELIVERED'
  | 'PAYMENT_RECEIVED'
  | 'PRODUCT_ADDED'
  | 'CUSTOM'

// Canal de notificación
export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'ALL'

// Datos para las notificaciones
export interface NotificationData {
  orderNumber?: string
  productName?: string
  issue?: string
  proposedSolution?: string
  sellerName?: string
  buyerName?: string
  status?: string
  total?: number
  quantity?: number
  note?: string
  deliveryDate?: string
  customMessage?: string
  [key: string]: string | number | undefined
}

// Parámetros para enviar notificación
export interface SendNotificationParams {
  clientId: string
  clientName?: string | null
  clientEmail?: string | null
  clientPhone?: string | null
  clientWhatsapp?: string | null
  preferredChannel?: NotificationChannel | null
  type: NotificationType
  data: NotificationData
  forceChannel?: NotificationChannel
}

// Resultado del envío
export interface NotificationResult {
  success: boolean
  channel: NotificationChannel
  messageId?: string
  error?: string
}

// Templates de mensajes
const MESSAGE_TEMPLATES: Record<NotificationType, {
  subject: string
  body: (data: NotificationData) => string
  shortBody: (data: NotificationData) => string
}> = {
  ORDER_CREATED: {
    subject: 'Nuevo pedido recibido',
    body: (data) => `
      <h2>🛒 Nuevo Pedido #${data.orderNumber}</h2>
      <p>Has recibido un nuevo pedido de <strong>${data.buyerName}</strong>.</p>
      <p>Por favor, revisa los productos y confirma la disponibilidad.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${data.orderNumber}">Ver pedido</a></p>
    `,
    shortBody: (data) => `🛒 Nuevo pedido #${data.orderNumber} de ${data.buyerName}. Revisa y confirma disponibilidad.`
  },
  ORDER_LOCKED: {
    subject: 'Tu pedido ha sido confirmado',
    body: (data) => `
      <h2>✅ Pedido #${data.orderNumber} Confirmado</h2>
      <p>Hola ${data.buyerName},</p>
      <p>Tu pedido ha sido revisado y confirmado por <strong>${data.sellerName}</strong>.</p>
      <p>Todos los productos están disponibles y tu pedido está siendo procesado.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${data.orderNumber}">Ver detalles</a></p>
    `,
    shortBody: (data) => `✅ Tu pedido #${data.orderNumber} ha sido confirmado por ${data.sellerName}. Todos los productos disponibles.`
  },
  ORDER_ISSUE: {
    subject: 'Hay un problema con tu pedido',
    body: (data) => `
      <h2>⚠️ Problema con Pedido #${data.orderNumber}</h2>
      <p>Hola ${data.buyerName},</p>
      <p>El vendedor <strong>${data.sellerName}</strong> ha reportado un problema:</p>
      <p><strong>Producto:</strong> ${data.productName}</p>
      <p><strong>Problema:</strong> ${data.issue}</p>
      <p><strong>Solución propuesta:</strong> ${data.proposedSolution}</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${data.orderNumber}">Responder al vendedor</a></p>
    `,
    shortBody: (data) => `⚠️ Problema con pedido #${data.orderNumber}: ${data.issue}. Propuesta: ${data.proposedSolution}. Responde al vendedor.`
  },
  ORDER_STATUS_CHANGED: {
    subject: 'Actualización de tu pedido',
    body: (data) => `
      <h2>📦 Pedido #${data.orderNumber} - Estado Actualizado</h2>
      <p>Hola ${data.buyerName},</p>
      <p>Tu pedido ahora está en estado: <strong>${data.status}</strong></p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/orders/${data.orderNumber}">Ver detalles</a></p>
    `,
    shortBody: (data) => `📦 Tu pedido #${data.orderNumber} está ${data.status}.`
  },
  ORDER_DELIVERED: {
    subject: '¡Tu pedido ha sido entregado!',
    body: (data) => `
      <h2>🎉 Pedido #${data.orderNumber} Entregado</h2>
      <p>Hola ${data.buyerName},</p>
      <p>Tu pedido ha sido entregado exitosamente.</p>
      <p>¡Gracias por tu compra!</p>
    `,
    shortBody: (data) => `🎉 Tu pedido #${data.orderNumber} ha sido entregado. ¡Gracias!`
  },
  PRODUCT_ADDED: {
    subject: 'Producto agregado a tu pedido',
    body: (data) => `
      <h2>📦 Pedido #${data.orderNumber} - Producto Agregado</h2>
      <p>Hola ${data.buyerName},</p>
      <p>${data.sellerName} ha agregado <strong>${data.productName}</strong> (${data.quantity} unid.) a tu pedido.</p>
      ${data.note ? `<p><strong>Nota:</strong> ${data.note}</p>` : ''}
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/buyer/orders">Ver tu pedido</a></p>
    `,
    shortBody: (data) => `📦 ${data.sellerName} agregó "${data.productName}" (${data.quantity}) a tu pedido #${data.orderNumber}. Revisa tu orden.`
  },
  PAYMENT_RECEIVED: {
    subject: 'Pago recibido',
    body: (data) => `
      <h2>💰 Pago Recibido - Pedido #${data.orderNumber}</h2>
      <p>Hemos recibido tu pago por $${data.total}.</p>
      <p>¡Gracias!</p>
    `,
    shortBody: (data) => `💰 Pago de $${data.total} recibido para pedido #${data.orderNumber}.`
  },
  CUSTOM: {
    subject: 'Notificación',
    body: (data) => data.customMessage || '',
    shortBody: (data) => data.customMessage || ''
  }
}

/**
 * Envía notificación por Email usando Mailersend
 */
async function sendEmailNotification(
  to: string,
  subject: string,
  htmlBody: string
): Promise<NotificationResult> {
  try {
    // Importar dinámicamente para evitar problemas de circular dependency
    const { sendEmail } = await import('@/lib/mailersend')
    
    const result = await sendEmail({
      to,
      subject,
      html: htmlBody
    })

    if (result.success) {
      return { success: true, channel: 'EMAIL', messageId: result.messageId }
    } else {
      console.error('Error enviando email:', result.error)
      return { success: false, channel: 'EMAIL', error: result.error }
    }

  } catch (error) {
    console.error('Error en sendEmailNotification:', error)
    return { success: false, channel: 'EMAIL', error: String(error) }
  }
}

/**
 * Envía SMS usando Twilio
 */
async function sendSMS(
  to: string,
  message: string
): Promise<NotificationResult> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      console.log('📱 [SMS] Twilio no configurado. Destinatario:', to)
      console.log('📱 [SMS] Mensaje:', message.substring(0, 100) + '...')
      return { success: false, channel: 'SMS', error: 'Twilio no configurado' }
    }

    // Formatear número si es necesario
    const formattedTo = to.startsWith('+') ? to : `+${to}`

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: fromNumber,
          Body: message
        })
      }
    )

    if (response.ok) {
      const data = await response.json()
      console.log('✅ [SMS] Enviado a', formattedTo, '- SID:', data.sid)
      return { success: true, channel: 'SMS', messageId: data.sid }
    } else {
      const error = await response.text()
      console.error('❌ [SMS] Error:', error)
      return { success: false, channel: 'SMS', error }
    }

  } catch (error) {
    console.error('❌ [SMS] Error de conexión:', error)
    return { success: false, channel: 'SMS', error: String(error) }
  }
}

/**
 * Envía mensaje de WhatsApp usando Twilio
 */
async function sendWhatsApp(
  to: string,
  message: string
): Promise<NotificationResult> {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER

    if (!accountSid || !authToken || !fromNumber) {
      console.log('💬 [WHATSAPP] Twilio no configurado. Destinatario:', to)
      console.log('💬 [WHATSAPP] Mensaje:', message.substring(0, 150) + '...')
      return { success: false, channel: 'WHATSAPP', error: 'Twilio no configurado' }
    }

    // Formatear número WhatsApp
    const formattedTo = to.startsWith('+') ? `whatsapp:${to}` : `whatsapp:+${to}`
    const formattedFrom = `whatsapp:${fromNumber}`

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64')
        },
        body: new URLSearchParams({
          To: formattedTo,
          From: formattedFrom,
          Body: message
        })
      }
    )

    if (response.ok) {
      const data = await response.json()
      console.log('✅ [WHATSAPP] Enviado a', formattedTo, '- SID:', data.sid)
      return { success: true, channel: 'WHATSAPP', messageId: data.sid }
    } else {
      const error = await response.text()
      console.error('❌ [WHATSAPP] Error:', error)
      return { success: false, channel: 'WHATSAPP', error }
    }

  } catch (error) {
    console.error('❌ [WHATSAPP] Error de conexión:', error)
    return { success: false, channel: 'WHATSAPP', error: String(error) }
  }
}

/**
 * Función principal para enviar notificación multicanal
 */
export async function sendMultichannelNotification(
  params: SendNotificationParams
): Promise<NotificationResult[]> {
  const {
    clientId,
    clientName,
    clientEmail,
    clientPhone,
    clientWhatsapp,
    preferredChannel,
    type,
    data,
    forceChannel
  } = params

  const results: NotificationResult[] = []
  const template = MESSAGE_TEMPLATES[type]
  
  // Agregar nombre del cliente a los datos
  const enrichedData: NotificationData = {
    ...data,
    buyerName: clientName || 'Cliente'
  }

  const subject = template.subject
  const htmlBody = template.body(enrichedData)
  const shortMessage = template.shortBody(enrichedData)

  // Determinar qué canales usar
  const channel = forceChannel || preferredChannel || 'EMAIL'

  // Para mensajes CUSTOM, usar el mensaje completo en WhatsApp/SMS si existe
  const whatsappMessage = type === 'CUSTOM' && data.customMessage 
    ? data.customMessage 
    : shortMessage
  
  // Enviar según el canal preferido o todos
  if (channel === 'ALL') {
    // Enviar por todos los canales disponibles
    if (clientEmail) {
      results.push(await sendEmailNotification(clientEmail, subject, htmlBody))
    }
    // NOTA: SMS desactivado - el número Twilio sandbox es solo para WhatsApp
    // Para activar SMS necesitas comprar un número de teléfono en Twilio
    // if (clientPhone) {
    //   results.push(await sendSMS(clientPhone, shortMessage.substring(0, 160)))
    // }
    if (clientWhatsapp || clientPhone) {
      // WhatsApp usa mensaje completo para CUSTOM
      results.push(await sendWhatsApp(clientWhatsapp || clientPhone!, whatsappMessage))
    }
  } else if (channel === 'EMAIL' && clientEmail) {
    results.push(await sendEmailNotification(clientEmail, subject, htmlBody))
  } else if (channel === 'SMS' && clientPhone) {
    results.push(await sendSMS(clientPhone, shortMessage.substring(0, 160)))
  } else if (channel === 'WHATSAPP' && (clientWhatsapp || clientPhone)) {
    results.push(await sendWhatsApp(clientWhatsapp || clientPhone!, whatsappMessage))
  } else {
    // Fallback a email si el canal preferido no está disponible
    if (clientEmail) {
      results.push(await sendEmailNotification(clientEmail, subject, htmlBody))
    }
  }

  // Log para auditoría
  console.log(`[MULTICANAL] Notificación ${type} enviada a cliente ${clientId}:`, 
    results.map(r => `${r.channel}: ${r.success ? 'OK' : 'FAIL'}`).join(', ')
  )

  return results
}

/**
 * Envía notificación a un vendedor
 */
export async function notifySeller(
  sellerId: string,
  type: NotificationType,
  data: NotificationData
): Promise<NotificationResult[]> {
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    })

    if (!seller) {
      console.error('Vendedor no encontrado:', sellerId)
      return [{ success: false, channel: 'EMAIL', error: 'Vendedor no encontrado' }]
    }

    return sendMultichannelNotification({
      clientId: seller.id,
      clientName: seller.name,
      clientEmail: seller.email,
      clientPhone: seller.phone,
      preferredChannel: 'EMAIL', // Vendedores por defecto email
      type,
      data: { ...data, sellerName: seller.name }
    })
  } catch (error) {
    console.error('Error notificando vendedor:', error)
    return [{ success: false, channel: 'EMAIL', error: String(error) }]
  }
}

/**
 * Notifica al comprador sobre una nueva orden (para uso del vendedor)
 */
export async function notifyBuyerOrderCreated(
  orderId: string,
  sellerId: string
): Promise<NotificationResult[]> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        seller: { select: { name: true } }
      }
    })

    if (!order) {
      return [{ success: false, channel: 'EMAIL', error: 'Orden no encontrada' }]
    }

    // Notificar al vendedor que llegó una nueva orden
    return notifySeller(sellerId, 'ORDER_CREATED', {
      orderNumber: order.orderNumber,
      buyerName: order.client.name
    })
  } catch (error) {
    console.error('Error en notifyBuyerOrderCreated:', error)
    return [{ success: false, channel: 'EMAIL', error: String(error) }]
  }
}

/**
 * Envía notificación a un comprador (cliente)
 */
export async function notifyBuyer(
  clientId: string,
  type: NotificationType,
  data: NotificationData
): Promise<NotificationResult[]> {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    })

    if (!client) {
      console.error('Cliente no encontrado:', clientId)
      return [{ success: false, channel: 'EMAIL', error: 'Cliente no encontrado' }]
    }

    return sendMultichannelNotification({
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      preferredChannel: 'WHATSAPP', // Compradores prefieren WhatsApp
      type,
      data: { ...data, buyerName: client.name }
    })
  } catch (error) {
    console.error('Error notificando comprador:', error)
    return [{ success: false, channel: 'EMAIL', error: String(error) }]
  }
}
