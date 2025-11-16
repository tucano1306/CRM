/**
 * 🚀 SWR Hooks Complementarios
 * 
 * Hooks SWR para casos específicos que requieren background revalidation
 * Complementa la implementación de React Query existente sin reemplazarla
 */

import useSWR, { mutate } from 'swr'
import { useAuth } from '@clerk/nextjs'

// Fetcher genérico con auth
const createFetcher = (getToken: () => Promise<string | null>) => {
  return async (url: string) => {
    const token = await getToken()
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    
    const response = await fetch(url, { headers })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return response.json()
  }
}

// Fetcher para APIs públicas sin auth
const publicFetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    }
  })
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  
  return response.json()
}

/**
 * Hook SWR para productos con background sync
 * Ideal para catálogos que necesitan estar siempre actualizados
 */
export function useSwrProducts(options?: {
  refreshInterval?: number
  revalidateOnFocus?: boolean
}) {
  const { getToken } = useAuth()
  const fetcher = createFetcher(getToken)
  
  return useSWR(
    '/api/products',
    fetcher,
    {
      // Revalidar cada 5 minutos en background
      refreshInterval: options?.refreshInterval ?? 5 * 60 * 1000,
      // Revalidar cuando el usuario vuelve a la pestaña
      revalidateOnFocus: options?.revalidateOnFocus ?? true,
      // Mantener datos anteriores mientras carga nuevos
      keepPreviousData: true,
      // Cache por 30 minutos
      dedupingInterval: 30 * 60 * 1000,
      // Revalidar cuando se detecta conexión
      revalidateOnReconnect: true,
      // Políticas de error
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  )
}

/**
 * Hook SWR para órdenes con polling suave
 * Para dashboards que necesitan updates frecuentes pero no en tiempo real
 */
export function useSwrOrders(sellerId: string, options?: {
  status?: string
  pollingInterval?: number
}) {
  const { getToken } = useAuth()
  const fetcher = createFetcher(getToken)
  
  const url = `/api/sellers/${sellerId}/orders${
    options?.status ? `?status=${options.status}` : ''
  }`
  
  return useSWR(
    url,
    fetcher,
    {
      // Polling cada 2 minutos (más suave que tiempo real)
      refreshInterval: options?.pollingInterval ?? 2 * 60 * 1000,
      // No revalidar en focus para órdenes (pueden ser muchas)
      revalidateOnFocus: false,
      // Cache por 1 minuto
      dedupingInterval: 60 * 1000,
      // Revalidar en reconexión
      revalidateOnReconnect: true,
    }
  )
}

/**
 * Hook SWR para estadísticas de dashboard
 * Background sync para métricas que cambian lentamente
 */
export function useSwrDashboardStats(sellerId: string) {
  const { getToken } = useAuth()
  const fetcher = createFetcher(getToken)
  
  return useSWR(
    `/api/sellers/${sellerId}/stats`,
    fetcher,
    {
      // Actualizar estadísticas cada 10 minutos
      refreshInterval: 10 * 60 * 1000,
      // Revalidar en focus para estadísticas importantes
      revalidateOnFocus: true,
      // Cache por 5 minutos
      dedupingInterval: 5 * 60 * 1000,
      // Mantener datos anteriores
      keepPreviousData: true,
    }
  )
}

/**
 * Hook SWR para clientes con sync inteligente
 * Actualiza cuando es necesario, no constantemente
 */
export function useSwrClients(sellerId: string) {
  const { getToken } = useAuth()
  const fetcher = createFetcher(getToken)
  
  return useSWR(
    `/api/sellers/${sellerId}/clients`,
    fetcher,
    {
      // Clientes cambian menos, sync cada 15 minutos
      refreshInterval: 15 * 60 * 1000,
      // Sí revalidar en focus (importante ver clientes actualizados)
      revalidateOnFocus: true,
      // Cache largo - 10 minutos
      dedupingInterval: 10 * 60 * 1000,
      // Mantener datos anteriores
      keepPreviousData: true,
    }
  )
}

/**
 * Hook SWR para notificaciones en tiempo real
 * Polling agresivo solo para notificaciones
 */
export function useSwrNotifications(userId: string) {
  const { getToken } = useAuth()
  const fetcher = createFetcher(getToken)
  
  return useSWR(
    `/api/notifications?userId=${userId}`,
    fetcher,
    {
      // Notificaciones cada 30 segundos
      refreshInterval: 30 * 1000,
      // Siempre revalidar en focus
      revalidateOnFocus: true,
      // Cache muy corto - 15 segundos
      dedupingInterval: 15 * 1000,
      // Revalidar en reconexión
      revalidateOnReconnect: true,
      // No mantener datos anteriores (queremos lo más fresco)
      keepPreviousData: false,
    }
  )
}

/**
 * Hook SWR para datos públicos con cache agresivo
 * Para datos que casi nunca cambian
 */
export function useSwrPublicData(endpoint: string) {
  return useSWR(
    `/api/public/${endpoint}`,
    publicFetcher,
    {
      // Datos públicos - sync muy espaciado (1 hora)
      refreshInterval: 60 * 60 * 1000,
      // No revalidar en focus (datos públicos estables)
      revalidateOnFocus: false,
      // Cache muy largo - 30 minutos
      dedupingInterval: 30 * 60 * 1000,
      // Mantener datos anteriores
      keepPreviousData: true,
      // Pocos reintentos para datos públicos
      errorRetryCount: 1,
    }
  )
}

/**
 * Hook SWR condicional - solo hace fetch cuando se necesita
 * Útil para datos que dependen de interacciones del usuario
 */
export function useSwrConditional<T>(
  key: string | null,
  shouldFetch: boolean,
  options?: {
    refreshInterval?: number
    revalidateOnFocus?: boolean
  }
) {
  const { getToken } = useAuth()
  const fetcher = createFetcher(getToken)
  
  return useSWR(
    shouldFetch ? key : null,
    key ? fetcher : null,
    {
      refreshInterval: options?.refreshInterval ?? 5 * 60 * 1000,
      revalidateOnFocus: options?.revalidateOnFocus ?? false,
      dedupingInterval: 2 * 60 * 1000,
    }
  )
}

/**
 * Utilidad para mutación optimista con SWR
 * Permite updates inmediatos con rollback en caso de error
 */
export function useSwrMutation<T>(key: string) {
  const { mutate } = useSWR(key)
  
  const optimisticUpdate = async (
    updateFn: (data: T) => T,
    remoteFn: () => Promise<T>
  ) => {
    try {
      // Update optimista inmediato
      await mutate(updateFn, false)
      
      // Ejecutar actualización remota
      const result = await remoteFn()
      
      // Confirmar con datos del servidor
      await mutate(result, false)
      
      return result
    } catch (error) {
      // Rollback en caso de error
      await mutate()
      throw error
    }
  }
  
  return { optimisticUpdate, mutate }
}

/**
 * Hook para prefetch de datos relacionados
 * Precarga datos que probablemente se necesitarán
 */
export function useSwrPrefetch() {
  const { getToken } = useAuth()
  const fetcher = createFetcher(getToken)
  
  const prefetch = (url: string) => {
    // Usar mutate para poblar cache sin triggering
    return mutate(url, fetcher(url), false)
  }
  
  return { prefetch }
}

// Re-exportar mutate para casos avanzados
export { mutate as swrMutate }