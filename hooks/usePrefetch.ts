// hooks/usePrefetch.ts
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Hook para prefetch de rutas probables
export function usePrefetchRoutes(routes: string[]) {
  const router = useRouter()

  useEffect(() => {
    routes.forEach((route) => {
      router.prefetch(route)
    })
  }, [routes, router])
}

// Hook para prefetch de datos
export function usePrefetchData(
  fetchFn: () => Promise<any>,
  condition: boolean = true
) {
  useEffect(() => {
    if (condition) {
      fetchFn()
    }
  }, [fetchFn, condition])
}

// Ejemplo de uso:
/*
// Prefetch rutas específicas:
function OrdersPage() {
  usePrefetchRoutes(['/clients', '/products'])
  // ...
}

// Prefetch proactivo de datos:
function Dashboard() {
  usePrefetchData(
    () => fetch('/api/orders').then(r => r.json()),
    true
  )
  
  return <DashboardContent />
}
*/

