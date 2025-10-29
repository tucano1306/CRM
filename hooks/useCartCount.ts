'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'

export function useCartCount() {
  const { user } = useUser()
  const [cartCount, setCartCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const fetchCartCount = async () => {
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
        console.debug('Cart count fetch temporarily unavailable')
      } finally {
        setLoading(false)
      }
    }

    // Esperar un momento antes de la primera llamada
    const initialTimeout = setTimeout(fetchCartCount, 500)

    // Polling cada 10 segundos para mantener el contador actualizado
    const interval = setInterval(fetchCartCount, 10000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(interval)
    }
  }, [user?.id])

  return { cartCount, loading }
}
