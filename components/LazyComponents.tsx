// components/LazyComponents.tsx
'use client'

import dynamic from 'next/dynamic'
import { Suspense, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Loading fallback genérico
interface LoadingFallbackProps {
  readonly message?: string
}

function LoadingFallback({ message = 'Cargando...' }: LoadingFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="animate-spin h-8 w-8 text-blue-600 mr-3" />
      <span className="text-gray-600">{message}</span>
    </div>
  )
}

// Lazy load componentes pesados
// NOTA: Descomentar cuando los componentes existan

/*
export const LazyAnalyticsDashboard = dynamic(
  () => import('@/components/analytics/AnalyticsDashboard'),
  {
    loading: () => <LoadingFallback message="Cargando análisis..." />,
    ssr: false, // No server-side render si tiene gráficos
  }
)

export const LazyChartComponent = dynamic(
  () => import('@/components/charts/ChartComponent'),
  {
    loading: () => <LoadingFallback message="Cargando gráfico..." />,
    ssr: false,
  }
)

export const LazyOrderDetailsModal = dynamic(
  () => import('@/components/orders/OrderDetailsModal'),
  {
    loading: () => <LoadingFallback message="Cargando detalles..." />,
  }
)

export const LazyProductForm = dynamic(
  () => import('@/components/products/ProductForm'),
  {
    loading: () => <LoadingFallback message="Cargando formulario..." />,
  }
)
*/

// Wrapper con Suspense para lazy components
interface LazyWrapperProps {
  readonly children: React.ReactNode
  readonly fallback?: React.ReactNode
}

export function LazyWrapper({ children, fallback }: LazyWrapperProps) {
  return (
    <Suspense fallback={fallback || <LoadingFallback />}>
      {children}
    </Suspense>
  )
}

// Hook para lazy loading condicional
export function useLazyLoad(shouldLoad: boolean) {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (shouldLoad && !isLoaded) {
      setIsLoaded(true)
    }
  }, [shouldLoad, isLoaded])

  return isLoaded
}

// Componente para lazy load con Intersection Observer
interface LazyLoadOnViewProps {
  readonly children: React.ReactNode
  readonly threshold?: number
  readonly fallback?: React.ReactNode
}

export function LazyLoadOnView({ 
  children, 
  threshold = 0.1,
  fallback = <LoadingFallback />
}: LazyLoadOnViewProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [ref, setRef] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    observer.observe(ref)

    return () => observer.disconnect()
  }, [ref, threshold])

  return (
    <div ref={setRef}>
      {isVisible ? children : fallback}
    </div>
  )
}

// Ejemplo de uso:
/*
// 1. Lazy load componente pesado:
import { LazyAnalyticsDashboard } from '@/components/LazyComponents'

function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <LazyAnalyticsDashboard />
    </div>
  )
}

// 2. Lazy load al hacer scroll:
<LazyLoadOnView>
  <HeavyChartComponent />
</LazyLoadOnView>

// 3. Lazy load condicional:
function MyComponent() {
  const [showChart, setShowChart] = useState(false)
  const shouldLoadChart = useLazyLoad(showChart)

  return (
    <div>
      <button onClick={() => setShowChart(true)}>
        Mostrar Gráfico
      </button>
      {shouldLoadChart && <LazyChartComponent />}
    </div>
  )
}

// 4. Lazy load con custom fallback:
<LazyWrapper fallback={<CustomSkeleton />}>
  <HeavyComponent />
</LazyWrapper>
*/
