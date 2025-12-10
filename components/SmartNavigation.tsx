// components/SmartNavigation.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Prefetch inteligente basado en la ruta actual
export function SmartNavigation() {
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    // Prefetch rutas relacionadas según contexto
    const prefetchMap: Record<string, string[]> = {
      '/dashboard': ['/orders', '/products', '/clients'],
      '/orders': ['/orders/[id]', '/clients'],
      '/products': ['/products/[id]', '/orders'],
      '/clients': ['/clients/[id]', '/orders'],
      '/buyer/catalog': ['/buyer/cart', '/buyer/orders'],
      '/buyer/cart': ['/buyer/orders', '/buyer/catalog'],
    }

    const routesToPrefetch = prefetchMap[pathname] || []
    routesToPrefetch.forEach((route) => router.prefetch(route))
  }, [pathname, router])

  return null
}

// Prefetch de datos en el componente
interface DataPrefetcherProps<T> {
  fetchFn: () => Promise<T>
  cacheKey: string
  onDataFetched?: (data: T) => void
}

let dataCache = new Map<string, any>()

export function DataPrefetcher<T>({ 
  fetchFn, 
  cacheKey, 
  onDataFetched 
}: DataPrefetcherProps<T>) {
  useEffect(() => {
    // Si ya está en cache, usar cache
    if (dataCache.has(cacheKey)) {
      onDataFetched?.(dataCache.get(cacheKey))
      return
    }

    // Fetch y cache
    fetchFn()
      .then((data) => {
        dataCache.set(cacheKey, data)
        onDataFetched?.(data)
      })
      .catch((err) => {
        console.error('Prefetch failed:', err)
      })
  }, [fetchFn, cacheKey, onDataFetched])

  return null
}

// Hook para cache simple
export function useDataCache<T>(key: string, fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check cache primero
    if (dataCache.has(key)) {
      setData(dataCache.get(key))
      setLoading(false)
      return
    }

    // Fetch si no está en cache
    fetchFn()
      .then((result) => {
        dataCache.set(key, result)
        setData(result)
      })
      .catch((err) => {
        console.error('Data fetch failed:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [key, fetchFn])

  return { data, loading }
}

// Limpiar cache manualmente si es necesario
export function clearDataCache(key?: string) {
  if (key) {
    dataCache.delete(key)
  } else {
    dataCache.clear()
  }
}

// Ejemplo de uso:
/*
// 1. Prefetch rutas en layout principal:
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SmartNavigation />
        {children}
      </body>
    </html>
  )
}

// 2. Prefetch de datos con cache:
function ProductList() {
  const { data, loading } = useDataCache(
    'products',
    () => fetch('/api/products').then(r => r.json())
  )
  
  return loading ? <Loading /> : <List data={data} />
}

// 3. Prefetch proactivo con DataPrefetcher:
function Dashboard() {
  return (
    <>
      <DataPrefetcher
        fetchFn={() => fetch('/api/orders').then(r => r.json())}
        cacheKey="orders"
        onDataFetched={(data) => console.log('Orders prefetched:', data)}
      />
      <DashboardContent />
    </>
  )
}

// 4. Limpiar cache cuando sea necesario:
function handleLogout() {
  clearDataCache() // Limpia todo
  // o
  clearDataCache('products') // Limpia solo productos
}
*/
