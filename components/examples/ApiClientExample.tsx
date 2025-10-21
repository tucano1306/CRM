'use client'

import { useApiCall, apiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useState } from 'react'

/**
 * Componente de ejemplo: Crear Order Schedule con timeout y retry
 */
export function CreateScheduleExample() {
  const { loading, error, timedOut, execute } = useApiCall()
  const [success, setSuccess] = useState(false)

  const handleCreateSchedule = async () => {
    const result = await execute('/api/order-schedules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sellerId: '550e8400-e29b-41d4-a716-446655440000',
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '17:00',
      }),
      timeout: 5000, // 5 segundos
      retries: 2, // 2 reintentos
      retryDelay: 1000, // 1 segundo entre reintentos
      onRetry: (attempt, error) => {
        console.log(`Reintentando... (${attempt} intentos restantes)`)
        console.error('Error:', error.message)
      },
    })

    if (result.success) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }

  return (
    <div className="space-y-4">
      <Button 
        onClick={handleCreateSchedule} 
        disabled={loading}
      >
        {loading ? 'Creando...' : 'Crear Horario'}
      </Button>

      {loading && <p className="text-sm text-gray-600">⏳ Procesando...</p>}
      
      {timedOut && (
        <Alert variant="warning">
          ⏱️ La operación está tardando más de lo esperado...
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          ❌ {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          ✅ Horario creado exitosamente
        </Alert>
      )}
    </div>
  )
}

/**
 * Componente de ejemplo: Fetch con timeout directo
 */
export function FetchSchedulesExample() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFetch = async () => {
    setLoading(true)
    setError(null)

    const result = await apiCall('/api/order-schedules?sellerId=550e8400-e29b-41d4-a716-446655440000', {
      timeout: 3000,
      retries: 1,
    })

    setLoading(false)

    if (result.success) {
      setSchedules(result.data?.schedules || [])
    } else {
      setError(result.error || 'Error al cargar horarios')
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleFetch} disabled={loading}>
        {loading ? 'Cargando...' : 'Cargar Horarios'}
      </Button>

      {error && <Alert variant="destructive">{error}</Alert>}

      {schedules.length > 0 && (
        <div className="space-y-2">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="p-4 border rounded">
              <p><strong>{schedule.dayOfWeek}</strong></p>
              <p>{schedule.startTime} - {schedule.endTime}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
