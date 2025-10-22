'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  ArrowRight,
  DollarSign,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

type CartItem = {
  id: string
  quantity: number
  price: number
  product: {
    id: string
    name: string
    description: string | null
    price: number
    stock: number
    unit: string
    imageUrl: string | null
    sku: string | null
  }
}

type Cart = {
  id: string
  items: CartItem[]
}

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [creatingOrder, setCreatingOrder] = useState(false)

  const TAX_RATE = 0.10 // 10% de impuestos

  useEffect(() => {
    fetchCart()
  }, [])

  // ✅ fetchCart CON TIMEOUT
  const fetchCart = async () => {
    try {
      setLoading(true)
      setTimedOut(false)
      setError(null)

      const result = await apiCall('/api/buyer/cart', {
        timeout: 5000,
        onTimeout: () => setTimedOut(true)
      })

      setLoading(false)

      if (result.success) {
        setCart(result.data.cart)
      } else {
        setError(result.error || 'Error cargando carrito')
      }
    } catch (err) {
      setLoading(false)
      setError(getErrorMessage(err))
    }
  }

  // ✅ updateQuantity CON TIMEOUT
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    try {
      setUpdating(itemId)

      const result = await apiCall(`/api/buyer/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
        timeout: 5000,
      })

      if (result.success) {
        await fetchCart()
      } else {
        alert(result.error || 'Error actualizando cantidad')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setUpdating(null)
    }
  }

  // ✅ removeItem CON TIMEOUT
  const removeItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este producto del carrito?')) return

    try {
      setUpdating(itemId)

      const result = await apiCall(`/api/buyer/cart/items/${itemId}`, {
        method: 'DELETE',
        timeout: 5000,
      })

      if (result.success) {
        await fetchCart()
      } else {
        alert(result.error || 'Error eliminando item')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setUpdating(null)
    }
  }

  // ✅ clearCart CON TIMEOUT
  const clearCart = async () => {
    if (!confirm('¿Vaciar todo el carrito?')) return

    try {
      const result = await apiCall('/api/buyer/cart', {
        method: 'DELETE',
        timeout: 5000,
      })

      if (result.success) {
        await fetchCart()
      } else {
        alert(result.error || 'Error vaciando carrito')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  // ✅ createOrder CON TIMEOUT y RETRY
  const createOrder = async () => {
    if (!cart || cart.items.length === 0) {
      alert('El carrito está vacío')
      return
    }

    if (!confirm('¿Confirmar pedido por $' + total.toFixed(2) + '?')) {
      return
    }

    try {
      setCreatingOrder(true)
      
      const result = await apiCall('/api/buyer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: null,
          idempotencyKey: uuidv4()
        }),
        timeout: 8000, // ✅ 8 segundos para crear orden (operación compleja)
        retries: 2, // ✅ 2 reintentos
        retryDelay: 1500,
        onRetry: (attempt) => {
          console.log(`Reintentando crear orden... (${attempt} reintentos restantes)`)
        }
      })

      if (result.success) {
        alert('✅ ¡Pedido creado exitosamente!')
        router.push('/buyer/orders')
      } else {
        alert(result.error || 'Error creando el pedido')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    } finally {
      setCreatingOrder(false)
    }
  }

  // Cálculos
  const subtotal = cart?.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  ) || 0

  const tax = subtotal * TAX_RATE
  const total = subtotal + tax

  // ✅ ESTADO DE LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <ShoppingCart className="text-purple-600" size={32} />
              Mi Carrito
            </h1>
            <p className="text-gray-600 mt-1">Cargando productos...</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
            <div>
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <Skeleton className="h-8 w-32 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
                <Skeleton className="h-12 w-full mt-6" />
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ✅ ESTADO DE TIMEOUT
  if (timedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-lg p-8 border border-yellow-200">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-yellow-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-6">
            La carga del carrito está tardando más de lo esperado. 
            Esto puede ser temporal.
          </p>
          <button
            onClick={fetchCart}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ✅ ESTADO DE ERROR
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-lg p-8 border border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={fetchCart}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <ShoppingCart className="text-purple-600" size={32} />
                Mi Carrito
              </h1>
              <p className="text-gray-600 mt-1">
                {cart?.items.length || 0}{' '}
                {cart?.items.length === 1 ? 'producto' : 'productos'}
              </p>
            </div>
            {cart && cart.items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-red-600 hover:text-red-700 font-medium flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={18} />
                Vaciar carrito
              </button>
            )}
          </div>
        </div>

        {/* Carrito vacío */}
        {(!cart || cart.items.length === 0) && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-purple-100">
            <Package className="mx-auto text-gray-400 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Tu carrito está vacío
            </h2>
            <p className="text-gray-600 mb-6">
              Agrega productos desde el catálogo para comenzar
            </p>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold inline-flex items-center gap-2"
            >
              Ver catálogo
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Items del carrito */}
        {cart && cart.items.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Lista de items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-md p-6 border border-purple-100 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800">
                        {item.product.name}
                      </h3>
                      {item.product.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.product.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-purple-600 font-bold text-lg">
                          ${item.price.toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-sm">
                          / {item.product.unit}
                        </span>
                        {item.product.stock < 10 && (
                          <span className="text-orange-600 text-sm font-medium">
                            Solo {item.product.stock} disponibles
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Controles de cantidad */}
                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          disabled={updating === item.id || item.quantity <= 1}
                          className="bg-white rounded p-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="w-12 text-center font-bold">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={
                            updating === item.id ||
                            item.quantity >= item.product.stock
                          }
                          className="bg-white rounded p-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      {/* Subtotal y eliminar */}
                      <div className="text-right min-w-[100px]">
                        <div className="text-lg font-bold text-gray-800">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={updating === item.id}
                          className="text-red-600 hover:text-red-700 text-sm mt-1 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen del pedido */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100 sticky top-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  <DollarSign size={24} className="text-purple-600" />
                  Resumen del pedido
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Impuestos ({(TAX_RATE * 100).toFixed(0)}%):</span>
                    <span className="font-semibold">${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-800">
                    <span>Total:</span>
                    <span className="text-purple-600">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={createOrder}
                  disabled={creatingOrder}
                  className="w-full bg-purple-600 text-white py-4 rounded-lg hover:bg-purple-700 transition-colors font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingOrder ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Confirmar pedido
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Al confirmar, aceptas los términos y condiciones
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
