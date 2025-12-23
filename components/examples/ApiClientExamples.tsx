'use client'

import { useState, useEffect } from 'react'
import { fetchWithTimeout, apiCall, getErrorMessage } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, AlertCircle, Clock } from 'lucide-react'

/**
 * EJEMPLO 1: Uso básico con fetchWithTimeout
 */
export function ExampleBasicFetch() {
  const [_data, setData] = useState(null) // NOSONAR - example component, data can be displayed in future
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // ✅ Fetch con timeout de 5 segundos
      const response = await fetchWithTimeout('/api/products', {
        timeout: 5000,
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Error cargando productos')
      }

      const result = await response.json()
      setData(result)
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Button onClick={loadData} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : 'Cargar Productos'}
      </Button>
      {error && <div className="text-red-500 mt-2">{error}</div>}
    </div>
  )
}

/**
 * EJEMPLO 2: Uso con apiCall (más simple)
 */
export function ExampleApiCall() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [timedOut, setTimedOut] = useState(false)

  const loadProducts = async () => {
    setLoading(true)
    setTimedOut(false)

    // ✅ apiCall maneja timeout automáticamente
    const result = await apiCall('/api/products', {
      timeout: 5000,
      onTimeout: () => {
        setTimedOut(true)
      },
    })

    setLoading(false)

    if (result.success) {
      setProducts(result.data.products || [])
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={loadProducts} disabled={loading}>
        Cargar Productos
      </Button>

      {loading && (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="animate-spin h-4 w-4" />
          <span>Cargando...</span>
        </div>
      )}

      {timedOut && (
        <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 p-3 rounded">
          <Clock className="h-5 w-5" />
          <span>La operación está tardando más de lo esperado...</span>
        </div>
      )}

      <div className="grid gap-2">
        {products.map((product) => (
          <Card key={product.id} className="p-4">
            {product.name}
          </Card>
        ))}
      </div>
    </div>
  )
}

/**
 * EJEMPLO 3: Uso con retry logic
 */
export function ExampleWithRetry() {
  const [_data, setData] = useState(null) // NOSONAR - example component, data can be displayed in future
  const [loading, setLoading] = useState(false)
  const [retries, setRetries] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const loadDataWithRetry = async () => {
    setLoading(true)
    setError(null)
    setRetries(0)

    try {
      // ✅ Fetch con timeout y 3 reintentos
      const response = await fetchWithTimeout('/api/orders', {
        timeout: 5000,
        retries: 3,
        retryDelay: 1000,
        onRetry: (attempt) => {
          setRetries(4 - attempt) // Mostrar intento actual
        },
      })

      const result = await response.json()
      setData(result)
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={loadDataWithRetry} disabled={loading}>
        Cargar con Retry
      </Button>

      {loading && retries > 0 && (
        <div className="flex items-center gap-2 text-orange-600">
          <Loader2 className="animate-spin h-4 w-4" />
          <span>Reintentando... (Intento {retries} de 3)</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

/**
 * EJEMPLO 4: POST request con timeout
 */
export function ExamplePostWithTimeout() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const createOrder = async (orderData: any) => {
    setLoading(true)
    setSuccess(false)

    // ✅ POST con timeout
    const result = await apiCall('/api/buyer/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
      timeout: 5000,
    })

    setLoading(false)

    if (result.success) {
      setSuccess(true)
    } else {
      alert(result.error)
    }
  }

  const buttonText = (() => {
    if (loading) return 'Creando orden...';
    if (success) return '✅ Creado';
    return 'Crear Orden';
  })();

  return (
    <Button onClick={() => createOrder({ notes: 'Test' })} disabled={loading}>
      {buttonText}
    </Button>
  )
}

/**
 * EJEMPLO 5: Componente completo con manejo de estados
 */
export function OrdersListWithTimeout() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    setTimedOut(false)
    setError(null)

    const result = await apiCall('/api/orders', {
      timeout: 5000,
      onTimeout: () => setTimedOut(true),
    })

    setLoading(false)

    if (result.success) {
      setOrders(result.data.orders || [])
    } else {
      setError(result.error || 'Error desconocido')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
      </div>
    )
  }

  if (timedOut) {
    return (
      <Card className="p-6 border-yellow-300 bg-yellow-50">
        <div className="flex items-center gap-3">
          <Clock className="h-6 w-6 text-yellow-600" />
          <div>
            <h3 className="font-semibold text-yellow-900">
              La carga está tardando más de lo esperado
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              El servidor puede estar ocupado. Intenta de nuevo.
            </p>
            <Button onClick={loadOrders} className="mt-3" variant="outline">
              Reintentar
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6 border-red-300 bg-red-50">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Error cargando órdenes</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <Button onClick={loadOrders} className="mt-3" variant="outline">
              Reintentar
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Órdenes ({orders.length})</h2>
        <Button onClick={loadOrders} variant="outline" size="sm">
          Actualizar
        </Button>
      </div>

      <div className="grid gap-3">
        {orders.map((order) => (
          <Card key={order.id} className="p-4">
            <div className="font-semibold">{order.orderNumber}</div>
            <div className="text-sm text-gray-600">${order.totalAmount}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
