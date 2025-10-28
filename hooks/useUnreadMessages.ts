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
        const response = await fetch('/api/chat-messages/unread-count')
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.unreadCount || 0)
        }
      } catch (error) {
        console.error('Error fetching unread messages count:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUnreadCount()

    // Polling cada 10 segundos
    const interval = setInterval(fetchUnreadCount, 10000)

    return () => clearInterval(interval)
  }, [user?.id])

  return { unreadCount, loading }
}
