'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRealtimeSubscription, RealtimeEvents } from '@/lib/supabase-realtime'

export function useUnreadMessages() {
  const { user } = useUser()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch('/api/chat-messages/unread-count', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        console.warn('Could not fetch unread messages count')
        return
      }
      
      const data = await response.json()
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.debug('Unread messages fetch temporarily unavailable:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // 📡 REALTIME: Escuchar nuevos mensajes
  const { isConnected: realtimeConnected } = useRealtimeSubscription(
    `user-chat-${user?.id}`,
    RealtimeEvents.CHAT_MESSAGE_NEW,
    useCallback(() => {
      // Incrementar contador cuando llega un mensaje nuevo
      setUnreadCount(prev => prev + 1)
    }, []),
    !!user?.id
  )

  // 📡 REALTIME: Escuchar cuando se marcan como leídos
  useRealtimeSubscription(
    `user-chat-${user?.id}`,
    RealtimeEvents.CHAT_MESSAGE_READ,
    useCallback((payload: any) => {
      // Decrementar contador cuando se leen mensajes
      if (payload.messageIds && Array.isArray(payload.messageIds)) {
        setUnreadCount(prev => Math.max(0, prev - payload.messageIds.length))
      }
    }, []),
    !!user?.id
  )

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    // Carga inicial con delay
    const initialTimeout = setTimeout(fetchUnreadCount, 1000)

    // 📡 POLLING DE RESPALDO: Solo cada 60 segundos como fallback
    const backupInterval = setInterval(() => {
      if (!realtimeConnected) {
        console.log('🔄 Unread messages backup polling (realtime disconnected)')
        fetchUnreadCount()
      }
    }, 60000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(backupInterval)
    }
  }, [user?.id, fetchUnreadCount, realtimeConnected])

  return { unreadCount, loading, refetch: fetchUnreadCount }
}
