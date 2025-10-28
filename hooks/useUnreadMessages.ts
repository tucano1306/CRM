'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

export function useUnreadMessages() {
  const { user } = useUser()
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/chat-messages/unread-count', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          // No lanzar error, solo registrar silenciosamente
          console.warn('Could not fetch unread messages count')
          return
        }
        
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
      } catch (error) {
        // Silenciar error de fetch - puede ser que el servidor esté iniciándose
        console.debug('Unread messages fetch temporarily unavailable')
      } finally {
        setLoading(false)
      }
    }

    // Esperar un momento antes de la primera llamada para que el servidor esté listo
    const initialTimeout = setTimeout(fetchUnreadCount, 1000)

    // Polling cada 30 segundos (reducido de 10 para menos carga)
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [user?.id])

  return { unreadCount, loading }
}
