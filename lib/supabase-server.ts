/**
 * Supabase Realtime Server Helper
 * Para enviar eventos desde API routes (server-side)
 */

import { createClient } from '@supabase/supabase-js'

let serverClient: ReturnType<typeof createClient> | null = null

function getServerClient() {
  if (!serverClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      return null
    }

    serverClient = createClient(url, key)
  }

  return serverClient
}

/**
 * Enviar evento de tiempo real desde el servidor
 */
export async function sendRealtimeEvent(
  channelName: string,
  eventName: string,
  payload: any
) {
  const client = getServerClient()
  
  if (!client) {
    console.warn('⚠️ Realtime not configured, event not sent:', eventName)
    return false
  }

  try {
    const channel = client.channel(channelName)
    
    await channel.send({
      type: 'broadcast',
      event: eventName,
      payload
    })
    
    console.log('✅ Realtime event sent:', { channelName, eventName })
    
    // Cleanup
    await client.removeChannel(channel)
    
    return true
  } catch (error) {
    console.error('❌ Failed to send realtime event:', error)
    return false
  }
}

/**
 * Canales por tipo de usuario
 */
export function getSellerChannel(sellerId: string) {
  return `seller-${sellerId}`
}

export function getBuyerChannel(buyerId: string) {
  return `buyer-${buyerId}`
}

export function getOrderChannel(orderId: string) {
  return `order-${orderId}`
}

/**
 * Canales para chat
 */
export function getChatChannel(userId1: string, userId2: string) {
  // Ordenar IDs para que el canal sea consistente sin importar quién envía
  const sorted = [userId1, userId2].sort()
  return `chat-${sorted[0]}-${sorted[1]}`
}

export function getUserChatChannel(userId: string) {
  return `user-chat-${userId}`
}

/**
 * Canal para carrito
 */
export function getCartChannel(userId: string) {
  return `cart-${userId}`
}

/**
 * Canal para notificaciones
 */
export function getNotificationChannel(userId: string) {
  return `notifications-${userId}`
}

// ==========================================
// FUNCIONES HELPER PARA ENVIAR EVENTOS ESPECÍFICOS
// ==========================================

/**
 * Enviar evento de nuevo mensaje de chat
 */
export async function sendChatMessageEvent(
  senderId: string,
  receiverId: string,
  messageData: {
    messageId: string
    message: string
    senderName?: string
    attachmentUrl?: string | null
    attachmentType?: string | null
    orderId?: string | null
    createdAt: string
  }
) {
  // Enviar al canal del receptor
  await sendRealtimeEvent(
    getUserChatChannel(receiverId),
    'chat:message-new',
    {
      ...messageData,
      senderId,
      receiverId
    }
  )
  
  return true
}

/**
 * Enviar evento de mensaje leído
 */
export async function sendChatReadEvent(
  senderId: string,
  receiverId: string,
  messageIds: string[]
) {
  await sendRealtimeEvent(
    getUserChatChannel(senderId),
    'chat:message-read',
    {
      messageIds,
      readBy: receiverId,
      readAt: new Date().toISOString()
    }
  )
  
  return true
}

/**
 * Enviar evento de typing
 */
export async function sendTypingEvent(
  senderId: string,
  receiverId: string,
  isTyping: boolean
) {
  await sendRealtimeEvent(
    getUserChatChannel(receiverId),
    'chat:typing',
    {
      senderId,
      isTyping,
      timestamp: new Date().toISOString()
    }
  )
  
  return true
}

/**
 * Enviar evento de actualización de carrito
 */
export async function sendCartUpdateEvent(
  userId: string,
  cartData: {
    action: 'add' | 'remove' | 'update' | 'clear'
    itemCount: number
    totalAmount?: number
    productId?: string
    productName?: string
  }
) {
  await sendRealtimeEvent(
    getCartChannel(userId),
    'cart:updated',
    {
      ...cartData,
      timestamp: new Date().toISOString()
    }
  )
  
  return true
}

/**
 * Enviar evento de nueva notificación
 */
export async function sendNotificationEvent(
  userId: string,
  notification: {
    id: string
    type: string
    title: string
    message: string
    createdAt: string
    relatedId?: string | null
    orderId?: string | null
  }
) {
  await sendRealtimeEvent(
    getNotificationChannel(userId),
    'notification:new',
    notification
  )
  
  return true
}
