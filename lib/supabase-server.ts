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
