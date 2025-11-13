/**
 * Supabase Realtime Client
 * IMPORTANTE: Solo usamos Realtime Channels (broadcast)
 * NO usamos la base de datos de Supabase - todos los datos siguen en Neon Postgres
 */

'use client'

import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'

let supabaseClient: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
      console.warn('⚠️ Supabase Realtime not configured')
      return null
    }

    supabaseClient = createClient(url, key, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  }

  return supabaseClient
}

/**
 * Eventos de tiempo real
 */
export const RealtimeEvents = {
  ORDER_UPDATED: 'order:updated',
  ORDER_STATUS_CHANGED: 'order:status-changed',
  NOTIFICATION_NEW: 'notification:new',
  MESSAGE_NEW: 'message:new',
  PRODUCT_UPDATED: 'product:updated',
} as const

/**
 * Hook para suscribirse a un canal de broadcast
 */
export function useRealtimeSubscription(
  channelName: string,
  eventName: string,
  callback: (payload: any) => void,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled || !channelName || !eventName) {
      return
    }

    const client = getSupabaseClient()
    if (!client) {
      console.warn('⚠️ Supabase client not available')
      return
    }

    // Crear canal de broadcast (no usa la DB de Supabase)
    const channel = client.channel(channelName)

    channel
      .on('broadcast', { event: eventName }, (payload) => {
        console.log('✅ Realtime event received:', eventName, payload)
        callback(payload.payload)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscribed:', channelName)
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime error:', channelName)
          setIsConnected(false)
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        client.removeChannel(channelRef.current)
        channelRef.current = null
        setIsConnected(false)
      }
    }
  }, [channelName, eventName, enabled])

  return { isConnected }
}

/**
 * Hook para múltiples eventos en un canal
 */
export function useRealtimeChannel(
  channelName: string,
  events: Record<string, (payload: any) => void>,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!enabled || !channelName) {
      return
    }

    const client = getSupabaseClient()
    if (!client) {
      return
    }

    const channel = client.channel(channelName)

    // Suscribirse a todos los eventos
    Object.entries(events).forEach(([eventName, callback]) => {
      channel.on('broadcast', { event: eventName }, (payload) => {
        console.log('✅ Realtime event:', eventName)
        callback(payload.payload)
      })
    })

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime channel subscribed:', channelName)
        setIsConnected(true)
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime channel error:', channelName)
        setIsConnected(false)
      }
    })

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        client.removeChannel(channelRef.current)
        channelRef.current = null
        setIsConnected(false)
      }
    }
  }, [channelName, enabled])

  return { isConnected }
}

/**
 * Helper para broadcast desde el servidor
 * NOTA: Esto debe llamarse desde un API route
 */
export async function broadcastRealtimeEvent(
  channelName: string,
  eventName: string,
  payload: any
) {
  const client = getSupabaseClient()
  
  if (!client) {
    console.warn('⚠️ Supabase not available, skipping broadcast')
    return false
  }

  try {
    const channel = client.channel(channelName)
    await channel.send({
      type: 'broadcast',
      event: eventName,
      payload
    })
    console.log('✅ Realtime broadcast sent:', { channelName, eventName })
    return true
  } catch (error) {
    console.error('❌ Realtime broadcast error:', error)
    return false
  }
}
