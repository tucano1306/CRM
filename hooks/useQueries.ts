/**
 * 🎣 Custom Hooks con React Query
 * 
 * Hooks optimizados con caching automático para queries frecuentes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// ==================== ORDERS ====================

export function useOrders(status?: string) {
  return useQuery({
    queryKey: ['orders', status],
    queryFn: async () => {
      const url = status 
        ? `/api/orders?status=${status}` 
        : '/api/orders'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch orders')
      return res.json()
    },
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
  })
}

export function useRecentOrders(limit = 5) {
  return useQuery({
    queryKey: ['orders', 'recent', limit],
    queryFn: async () => {
      const res = await fetch(`/api/orders?recent=true&limit=${limit}`)
      if (!res.ok) throw new Error('Failed to fetch recent orders')
      return res.json()
    },
    staleTime: 1 * 60 * 1000, // Cache por 1 minuto
  })
}

// ==================== PRODUCTS ====================

export function useProducts(search?: string) {
  return useQuery({
    queryKey: ['products', search],
    queryFn: async () => {
      const url = search 
        ? `/api/products?search=${search}` 
        : '/api/products'
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch products')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos (productos cambian poco)
  })
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: async () => {
      const res = await fetch('/api/products?lowStock=true')
      if (!res.ok) throw new Error('Failed to fetch low stock products')
      return res.json()
    },
    staleTime: 3 * 60 * 1000, // Cache por 3 minutos
  })
}

// ==================== CLIENTS ====================

export function useClients(page = 1, search?: string) {
  return useQuery({
    queryKey: ['clients', page, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      if (search) params.set('search', search)
      
      const res = await fetch(`/api/clients?${params}`)
      if (!res.ok) throw new Error('Failed to fetch clients')
      return res.json()
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  })
}

// ==================== STATS ====================

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/api/stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
    staleTime: 2 * 60 * 1000, // Cache por 2 minutos
    refetchInterval: 5 * 60 * 1000, // Refetch cada 5 minutos automáticamente
  })
}

export function useDashboardAnalytics() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/dashboard')
      if (!res.ok) throw new Error('Failed to fetch dashboard analytics')
      return res.json()
    },
    staleTime: 3 * 60 * 1000, // Cache por 3 minutos
    refetchInterval: 10 * 60 * 1000, // Refetch cada 10 minutos
  })
}

// ==================== MUTATIONS (para crear/actualizar) ====================

export function useCreateOrder() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (orderData: any) => {
      const res = await fetch('/api/buyer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create order')
      }
      return res.json()
    },
    onSuccess: () => {
      // Invalidar cache de órdenes para forzar refetch
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ orderId, action }: { orderId: string; action: string }) => {
      const res = await fetch(`/api/orders/${orderId}/${action}`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to update order')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (productData: any) => {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create product')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })
}

// ==================== OPTIMISTIC UPDATES ====================

/**
 * Ejemplo de update optimista (actualiza UI antes de confirmar con servidor)
 */
export function useOptimisticOrderUpdate() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update order')
      return res.json()
    },
    // Update optimista: actualiza cache ANTES de esperar respuesta
    onMutate: async ({ orderId, status }) => {
      // Cancelar queries en progreso
      await queryClient.cancelQueries({ queryKey: ['orders'] })
      
      // Guardar snapshot del estado anterior
      const previousOrders = queryClient.getQueryData(['orders'])
      
      // Actualizar cache optimistamente
      queryClient.setQueryData(['orders'], (old: any) => {
        if (!old) return old
        return {
          ...old,
          orders: old.orders.map((order: any) =>
            order.id === orderId ? { ...order, status } : order
          ),
        }
      })
      
      // Retornar contexto con snapshot para rollback
      return { previousOrders }
    },
    // Si falla, hacer rollback
    onError: (err, variables, context) => {
      if (context?.previousOrders) {
        queryClient.setQueryData(['orders'], context.previousOrders)
      }
    },
    // Siempre refetch al final para sincronizar con servidor
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
