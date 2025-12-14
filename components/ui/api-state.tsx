'use client'

import { ReactNode } from 'react'
import { Alert } from '@/components/ui/alert'

/**
 * Componente para mostrar estados de API (loading, timeout, error)
 */
interface ApiStateProps {
  readonly loading?: boolean
  readonly error?: string | null
  readonly timedOut?: boolean
  readonly loadingText?: string
  readonly timeoutText?: string
  readonly children?: ReactNode
  readonly onRetry?: () => void
}

export function ApiState({
  loading,
  error,
  timedOut,
  loadingText = 'Cargando...',
  timeoutText = 'La operación está tardando más de lo esperado...',
  children,
  onRetry
}: ApiStateProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        <span>{loadingText}</span>
      </div>
    )
  }

  if (timedOut) {
    return (
      <Alert variant="warning">
        <div className="flex items-center gap-2">
          <span>⏱️</span>
          <span>{timeoutText}</span>
        </div>
      </Alert>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <span>{error}</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm underline hover:no-underline"
            >
              Intentar de nuevo
            </button>
          )}
        </div>
      </Alert>
    )
  }

  return <>{children}</>
}

/**
 * Wrapper para datos con estados de API
 */
interface ApiDataWrapperProps<T> {
  readonly loading: boolean
  readonly error: string | null
  readonly timedOut: boolean
  readonly data: T | null
  readonly loadingComponent?: ReactNode
  readonly errorComponent?: (error: string, onRetry?: () => void) => ReactNode
  readonly timeoutComponent?: ReactNode
  readonly emptyComponent?: ReactNode
  readonly onRetry?: () => void
  readonly children: (data: T) => ReactNode
}

export function ApiDataWrapper<T>({
  loading,
  error,
  timedOut,
  data,
  loadingComponent,
  errorComponent,
  timeoutComponent,
  emptyComponent,
  onRetry,
  children
}: ApiDataWrapperProps<T>) {
  if (loading) {
    return loadingComponent || (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (timedOut) {
    return timeoutComponent || (
      <Alert variant="warning">
        ⏱️ La operación está tardando más de lo esperado...
      </Alert>
    )
  }

  if (error) {
    return errorComponent ? (
      <>{errorComponent(error, onRetry)}</>
    ) : (
      <Alert variant="destructive">
        <div className="flex flex-col gap-2">
          <p>❌ {error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm underline hover:no-underline"
            >
              Reintentar
            </button>
          )}
        </div>
      </Alert>
    )
  }

  if (!data) {
    return emptyComponent || (
      <div className="text-center text-gray-500 p-8">
        No hay datos disponibles
      </div>
    )
  }

  return <>{children(data)}</>
}

/**
 * Hook de ejemplo de uso completo
 * Descomentar imports si se va a usar
 */
/*
import { useApiCall } from '@/lib/api-client'
import { useState } from 'react'

export function ExampleUsage() {
  const { loading, error, timedOut, execute } = useApiCall()
  const [schedules, setSchedules] = useState<any[] | null>(null)

  const loadData = async () => {
    const result = await execute('/api/order-schedules?sellerId=123')
    if (result.success) {
      setSchedules(result.data?.schedules || [])
    }
  }

  return (
    <div>
      <button onClick={loadData}>Cargar Datos</button>

      {/* Opción 1: ApiState simple *\/}
      <ApiState 
        loading={loading}
        error={error}
        timedOut={timedOut}
        onRetry={loadData}
      >
        {schedules && schedules.map(s => (
          <div key={s.id}>{s.dayOfWeek}</div>
        ))}
      </ApiState>

      {/* Opción 2: ApiDataWrapper con render props *\/}
      <ApiDataWrapper
        loading={loading}
        error={error}
        timedOut={timedOut}
        data={schedules}
        onRetry={loadData}
      >
        {(data) => (
          <div>
            {data.map(s => (
              <div key={s.id}>{s.dayOfWeek}</div>
            ))}
          </div>
        )}
      </ApiDataWrapper>
    </div>
  )
}
*/
