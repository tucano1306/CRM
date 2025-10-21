# 🌐 Frontend API Client

## Descripción General

Cliente API robusto para el frontend con soporte para:
- ⏱️ **Timeouts configurables**
- 🔄 **Retry automático**
- ✅ **Manejo de errores consistente**
- 🎣 **React Hook para estados de carga**
- 📱 **Compatible con React 18+ y Next.js 14+**

---

## Instalación y Setup

**Archivo**: `lib/api-client.ts`

Ya está listo para usar, no requiere instalación adicional.

---

## API Reference

### Classes

#### FetchTimeoutError

Error personalizado para timeouts.

```typescript
class FetchTimeoutError extends Error {
  name: 'FetchTimeoutError'
}
```

#### FetchRetryError

Error para cuando fallan todos los reintentos.

```typescript
class FetchRetryError extends Error {
  name: 'FetchRetryError'
}
```

---

### Functions

#### fetchWithTimeout

Fetch con timeout usando AbortController.

```typescript
async function fetchWithTimeout(
  url: string,
  options?: FetchWithTimeoutOptions
): Promise<Response>
```

**Options**:
```typescript
interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number        // Default: 5000ms
  retries?: number        // Default: 0
  retryDelay?: number     // Default: 1000ms
  onTimeout?: () => void
  onRetry?: (attempt: number, error: Error) => void
}
```

**Ejemplo**:
```typescript
import { fetchWithTimeout } from '@/lib/api-client'

const response = await fetchWithTimeout('/api/data', {
  method: 'GET',
  timeout: 3000,
  retries: 2,
  onTimeout: () => console.log('Request timing out...'),
  onRetry: (attempt, error) => {
    console.log(`Retry ${attempt}`, error.message)
  }
})
```

---

#### apiCall

Wrapper de alto nivel con parsing JSON automático y manejo de errores.

```typescript
async function apiCall<T = any>(
  url: string,
  options?: FetchWithTimeoutOptions
): Promise<{
  success: boolean
  data?: T
  error?: string
  status: number
}>
```

**Ejemplo**:
```typescript
import { apiCall } from '@/lib/api-client'

// GET request
const result = await apiCall('/api/products')

if (result.success) {
  console.log('Productos:', result.data)
} else {
  console.error('Error:', result.error)
}

// POST request con retry
const createResult = await apiCall('/api/orders', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ items: [...] }),
  timeout: 10000,
  retries: 3,
  retryDelay: 2000
})
```

---

#### useApiCall (React Hook)

Hook para manejar estados de loading, error y timeout en componentes React.

```typescript
function useApiCall(): {
  loading: boolean
  error: string | null
  timedOut: boolean
  execute: <T>(url: string, options?: FetchWithTimeoutOptions) => Promise<ApiCallResult<T>>
}
```

**Ejemplo**:
```typescript
'use client'

import { useApiCall } from '@/lib/api-client'
import { Button } from '@/components/ui/button'

export function MyComponent() {
  const { loading, error, timedOut, execute } = useApiCall()

  const handleClick = async () => {
    const result = await execute('/api/data', {
      timeout: 5000,
      retries: 2
    })

    if (result.success) {
      console.log('Success!', result.data)
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={loading}>
        {loading ? 'Cargando...' : 'Cargar Datos'}
      </Button>
      
      {timedOut && <p>⏱️ Tardando más de lo esperado...</p>}
      {error && <p className="text-red-500">❌ {error}</p>}
    </div>
  )
}
```

---

#### getErrorMessage

Convierte errores a mensajes amigables para el usuario.

```typescript
function getErrorMessage(error: unknown): string
```

**Ejemplo**:
```typescript
import { getErrorMessage } from '@/lib/api-client'

try {
  await fetchWithTimeout('/api/data')
} catch (error) {
  const message = getErrorMessage(error)
  // "⏱️ La operación está tardando más de lo esperado..."
  alert(message)
}
```

---

## Ejemplos de Uso

### Ejemplo 1: GET Simple con Timeout

```typescript
'use client'

import { apiCall } from '@/lib/api-client'
import { useEffect, useState } from 'react'

export function ProductList() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    const result = await apiCall('/api/products', {
      timeout: 3000
    })

    if (result.success) {
      setProducts(result.data.products)
    }
    
    setLoading(false)
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  )
}
```

---

### Ejemplo 2: POST con Retry

```typescript
'use client'

import { useApiCall } from '@/lib/api-client'

export function CreateOrderButton() {
  const { loading, error, execute } = useApiCall()
  const [retryCount, setRetryCount] = useState(0)

  const handleCreate = async () => {
    setRetryCount(0)

    const result = await execute('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: '123', quantity: 2 }]
      }),
      timeout: 10000,
      retries: 3,
      retryDelay: 2000,
      onRetry: (attempt) => {
        setRetryCount(prev => prev + 1)
        console.log(`Reintento ${attempt}...`)
      }
    })

    if (result.success) {
      alert('Orden creada!')
    }
  }

  return (
    <div>
      <button onClick={handleCreate} disabled={loading}>
        {loading ? 'Creando...' : 'Crear Orden'}
      </button>
      
      {retryCount > 0 && (
        <p>🔄 Reintentando... ({retryCount} intentos)</p>
      )}
      
      {error && <p className="text-red-500">{error}</p>}
    </div>
  )
}
```

---

### Ejemplo 3: Upload con Progress

```typescript
'use client'

import { fetchWithTimeout } from '@/lib/api-client'
import { useState } from 'react'

export function FileUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleUpload = async (file: File) => {
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetchWithTimeout('/api/upload', {
        method: 'POST',
        body: formData,
        timeout: 60000, // 1 minuto para archivos grandes
        onTimeout: () => {
          setProgress(99)
          console.log('Upload tomando más tiempo...')
        }
      })

      if (response.ok) {
        setProgress(100)
        alert('Archivo subido!')
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input 
        type="file" 
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
        disabled={uploading}
      />
      {uploading && <progress value={progress} max={100} />}
    </div>
  )
}
```

---

### Ejemplo 4: Polling con Timeout

```typescript
'use client'

import { apiCall } from '@/lib/api-client'
import { useEffect, useState } from 'react'

export function OrderStatus({ orderId }: { orderId: string }) {
  const [status, setStatus] = useState('PENDING')
  const [polling, setPolling] = useState(true)

  useEffect(() => {
    if (!polling) return

    const interval = setInterval(async () => {
      const result = await apiCall(`/api/orders/${orderId}`, {
        timeout: 3000,
        retries: 1
      })

      if (result.success) {
        setStatus(result.data.status)
        
        // Stop polling si orden completada
        if (['COMPLETED', 'CANCELED'].includes(result.data.status)) {
          setPolling(false)
        }
      }
    }, 5000) // Poll cada 5 segundos

    return () => clearInterval(interval)
  }, [orderId, polling])

  return <div>Estado: {status}</div>
}
```

---

### Ejemplo 5: Formulario Completo

```typescript
'use client'

import { useApiCall, getErrorMessage } from '@/lib/api-client'
import { useState } from 'react'

export function ScheduleForm() {
  const { loading, error, timedOut, execute } = useApiCall()
  const [formData, setFormData] = useState({
    dayOfWeek: 'MONDAY',
    startTime: '08:00',
    endTime: '17:00'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const result = await execute('/api/order-schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sellerId: 'seller-id',
        ...formData
      }),
      timeout: 5000,
      retries: 2,
      retryDelay: 1500
    })

    if (result.success) {
      alert('Horario guardado!')
      // Reset form
      setFormData({
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '17:00'
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Día de la semana</label>
        <select 
          value={formData.dayOfWeek}
          onChange={(e) => setFormData(prev => ({ ...prev, dayOfWeek: e.target.value }))}
        >
          <option value="MONDAY">Lunes</option>
          <option value="TUESDAY">Martes</option>
          {/* ... */}
        </select>
      </div>

      <div>
        <label>Hora inicio</label>
        <input 
          type="time"
          value={formData.startTime}
          onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
        />
      </div>

      <div>
        <label>Hora fin</label>
        <input 
          type="time"
          value={formData.endTime}
          onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar Horario'}
      </button>

      {timedOut && (
        <div className="text-yellow-600">
          ⏱️ La operación está tardando más de lo esperado...
        </div>
      )}

      {error && (
        <div className="text-red-600">
          ❌ {error}
        </div>
      )}
    </form>
  )
}
```

---

## Configuración Recomendada

### Timeouts por Tipo de Operación

| Operación | Timeout Recomendado | Retries |
|-----------|---------------------|---------|
| GET simple | 3-5 segundos | 1-2 |
| GET complejo | 5-10 segundos | 2 |
| POST/PUT/PATCH | 5-10 segundos | 2-3 |
| DELETE | 3-5 segundos | 1 |
| Upload pequeño | 15-30 segundos | 1 |
| Upload grande | 60-120 segundos | 0 |
| Streaming | Sin timeout | 0 |

---

### Configuración Global

Crear un wrapper personalizado con defaults:

```typescript
// lib/api-config.ts
import { apiCall, FetchWithTimeoutOptions } from '@/lib/api-client'

const DEFAULT_OPTIONS: FetchWithTimeoutOptions = {
  timeout: 5000,
  retries: 2,
  retryDelay: 1000,
  headers: {
    'Content-Type': 'application/json'
  }
}

export async function api<T>(
  url: string, 
  options?: FetchWithTimeoutOptions
) {
  return apiCall<T>(url, {
    ...DEFAULT_OPTIONS,
    ...options,
    headers: {
      ...DEFAULT_OPTIONS.headers,
      ...options?.headers
    }
  })
}

// Uso
import { api } from '@/lib/api-config'
const result = await api('/api/products')
```

---

## Manejo de Errores

### Tipos de Errores

1. **TimeoutError** (504):
   ```typescript
   {
     success: false,
     error: 'La solicitud tardó demasiado. Por favor, intenta de nuevo.',
     status: 504
   }
   ```

2. **Network Error** (500):
   ```typescript
   {
     success: false,
     error: 'Failed to fetch',
     status: 500
   }
   ```

3. **HTTP Error** (400, 401, 403, etc):
   ```typescript
   {
     success: false,
     error: 'Error del servidor',
     status: 400
   }
   ```

### UI de Errores

```typescript
'use client'

import { useApiCall, getErrorMessage } from '@/lib/api-client'

export function ErrorHandlingExample() {
  const { error, timedOut, execute } = useApiCall()

  const handleAction = async () => {
    try {
      const result = await execute('/api/action')
      if (!result.success) {
        // Manejo específico por status
        if (result.status === 401) {
          window.location.href = '/login'
        } else if (result.status === 403) {
          alert('No tienes permisos para esta acción')
        }
      }
    } catch (err) {
      const message = getErrorMessage(err)
      console.error(message)
    }
  }

  return (
    <div>
      <button onClick={handleAction}>Ejecutar</button>
      
      {timedOut && (
        <div className="bg-yellow-100 p-4">
          ⏱️ La operación está tardando más de lo esperado. 
          El sistema sigue intentando...
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 p-4">
          ❌ {error}
          <button onClick={handleAction}>Reintentar</button>
        </div>
      )}
    </div>
  )
}
```

---

## Testing

### Unit Tests

```typescript
// __tests__/lib/api-client.test.ts
import { fetchWithTimeout, apiCall, FetchTimeoutError } from '@/lib/api-client'

describe('API Client', () => {
  it('should timeout after specified time', async () => {
    const slowUrl = 'https://httpstat.us/200?sleep=3000'
    
    await expect(
      fetchWithTimeout(slowUrl, { timeout: 1000 })
    ).rejects.toThrow(FetchTimeoutError)
  })

  it('should retry on failure', async () => {
    let attempts = 0
    const mockFetch = jest.fn(() => {
      attempts++
      if (attempts < 3) {
        throw new Error('Network error')
      }
      return Promise.resolve(new Response('OK'))
    })

    global.fetch = mockFetch

    await fetchWithTimeout('/api/test', { retries: 3 })
    
    expect(attempts).toBe(3)
  })

  it('should parse JSON response', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(new Response(
        JSON.stringify({ data: 'test' }),
        { status: 200 }
      ))
    )

    const result = await apiCall('/api/test')
    
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ data: 'test' })
  })
})
```

---

## Best Practices

### ✅ DO

```typescript
// ✅ Usar timeout apropiado según operación
await apiCall('/api/quick', { timeout: 3000 })
await apiCall('/api/slow', { timeout: 10000 })

// ✅ Usar retry para operaciones críticas
await apiCall('/api/payment', { 
  retries: 3,
  retryDelay: 2000 
})

// ✅ Manejar timeout en UI
const { timedOut } = useApiCall()
{timedOut && <p>⏱️ Procesando...</p>}

// ✅ Usar getErrorMessage para usuarios
catch (error) {
  alert(getErrorMessage(error))
}
```

### ❌ DON'T

```typescript
// ❌ No usar timeout muy corto
await apiCall('/api/data', { timeout: 100 }) // Muy corto!

// ❌ No usar muchos retries en operaciones no idempotentes
await apiCall('/api/payment', { retries: 10 }) // Peligroso!

// ❌ No ignorar errores
await execute('/api/data') // Sin manejo de error

// ❌ No mostrar errores técnicos al usuario
alert(error.stack) // Muy técnico
```

---

## Troubleshooting

### Problema: Timeouts Frecuentes

**Solución**:
1. Aumentar timeout: `timeout: 10000`
2. Verificar conexión red
3. Optimizar endpoint del servidor
4. Usar retry: `retries: 2`

### Problema: Retry Loops Infinitos

**Solución**:
```typescript
await apiCall('/api/data', {
  retries: 3, // Limitar intentos
  retryDelay: 2000, // Dar tiempo entre retries
  onRetry: (attempt) => {
    if (attempt === 0) {
      // Último intento, hacer algo especial
      console.error('Último intento fallido')
    }
  }
})
```

### Problema: Memory Leaks en useApiCall

**Solución**: Cancelar requests al desmontar

```typescript
useEffect(() => {
  const controller = new AbortController()
  
  execute('/api/data', {
    signal: controller.signal
  })
  
  return () => controller.abort()
}, [])
```

---

## Próximos Pasos

### Mejoras Futuras

1. **Queue System**: Cola de requests con prioridad
2. **Caching**: Cache de respuestas con TTL
3. **Offline Support**: Retry automático cuando vuelve conexión
4. **Request Deduplication**: Evitar requests duplicados
5. **Progress Tracking**: Track upload/download progress

---

**Última actualización**: 2024-01-15  
**Versión**: 1.0.0  
**Compatibilidad**: React 18+, Next.js 14+
