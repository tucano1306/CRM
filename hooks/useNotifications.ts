'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRealtimeSubscription, RealtimeEvents } from '@/lib/supabase-realtime'

/**
 * Hook para obtener el conteo de órdenes pendientes
 */
export function usePendingOrders() {
  const { user } = useUser()
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchPendingCount = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch('/api/orders/pending-count', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        console.warn('Could not fetch pending orders count')
        return
      }
      
      const data = await response.json()
      setPendingCount(data.pendingCount || 0)
    } catch (error) {
      console.debug('Pending orders fetch temporarily unavailable:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // 📡 REALTIME: Escuchar nuevas órdenes
  const { isConnected: realtimeConnected } = useRealtimeSubscription(
    `user-orders-${user?.id}`,
    RealtimeEvents.ORDER_CREATED,
    useCallback(() => {
      setPendingCount(prev => prev + 1)
    }, []),
    !!user?.id
  )

  // 📡 REALTIME: Escuchar cuando se actualizan órdenes
  useRealtimeSubscription(
    `user-orders-${user?.id}`,
    RealtimeEvents.ORDER_STATUS_CHANGED,
    useCallback((payload: any) => {
      if (payload.newStatus !== 'PENDING') {
        setPendingCount(prev => Math.max(0, prev - 1))
      } else if (payload.oldStatus !== 'PENDING') {
        setPendingCount(prev => prev + 1)
      }
    }, []),
    !!user?.id
  )

  useEffect(() => {
    fetchPendingCount()
    
    const interval = setInterval(fetchPendingCount, 60000)
    return () => clearInterval(interval)
  }, [fetchPendingCount])

  return { 
    pendingCount, 
    loading, 
    realtimeConnected, 
    refresh: fetchPendingCount 
  }
}

/**
 * Hook para obtener el conteo de solicitudes de clientes pendientes
 */
export function usePendingClientRequests() {
  const { user } = useUser()
  const [requestsCount, setRequestsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchRequestsCount = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch('/api/clients/pending-requests-count', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        console.warn('Could not fetch pending client requests count')
        return
      }
      
      const data = await response.json()
      setRequestsCount(data.requestsCount || 0)
    } catch (error) {
      console.debug('Pending client requests fetch temporarily unavailable:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchRequestsCount()
    
    // Polling cada 30 segundos para solicitudes de clientes
    const interval = setInterval(fetchRequestsCount, 30000)
    return () => clearInterval(interval)
  }, [fetchRequestsCount])

  return { 
    requestsCount, 
    loading, 
    refresh: fetchRequestsCount 
  }
}
