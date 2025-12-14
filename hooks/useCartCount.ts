'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRealtimeSubscription, RealtimeEvents } from '@/lib/supabase-realtime'

export function useCartCount() {
  const { user } = useUser()
  const [cartCount, setCartCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchCartCount = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch('/api/buyer/cart', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        console.warn('Could not fetch cart')
        return
      }
      
      const data = await response.json()
      
      // Contar el total de items en el carrito
      if (data.cart && Array.isArray(data.cart.items)) {
        const totalItems = data.cart.items.reduce((sum: number, item: any) => {
          return sum + (item.quantity || 0)
        }, 0)
        setCartCount(totalItems)
      } else {
        setCartCount(0)
      }
    } catch (error) {
      console.debug('Cart count fetch temporarily unavailable:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // 📡 REALTIME: Escuchar actualizaciones del carrito
  const { isConnected: realtimeConnected } = useRealtimeSubscription(
    `cart-${user?.id}`,
    RealtimeEvents.CART_UPDATED,
    useCallback((payload: any) => {
      console.log('🛒 Realtime: Carrito actualizado', payload)
      
      // Actualizar el contador directamente desde el evento
      if (typeof payload.itemCount === 'number') {
        setCartCount(payload.itemCount)
      } else {
        // Si no viene itemCount, refetch
        fetchCartCount()
      }
    }, [fetchCartCount]),
    !!user?.id
  )

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    // Carga inicial con pequeño delay
    const initialTimeout = setTimeout(fetchCartCount, 500)

    // 📡 POLLING DE RESPALDO: Solo cada 60 segundos como fallback
    const backupInterval = setInterval(() => {
      if (!realtimeConnected) {
        console.log('🔄 Cart backup polling (realtime disconnected)')
        fetchCartCount()
      }
    }, 60000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(backupInterval)
    }
  }, [user?.id, fetchCartCount, realtimeConnected])

  return { cartCount, loading, refetch: fetchCartCount }
}
