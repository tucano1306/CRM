// components/LazyComponents.tsx
'use client'

import { Suspense, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Loading fallback genérico
interface LoadingFallbackProps {
  readonly message?: string
}

function LoadingFallback({ message = 'Cargando...' }: LoadingFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="animate-spin h-8 w-8 text-pastel-blue mr-3" />
      <span className="text-gray-600">{message}</span>
    </div>
  )
}

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
