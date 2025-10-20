'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  ArrowRight,
  DollarSign,
} from 'lucide-react'

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

import { v4 as uuidv4 } from 'uuid'

export default function CartPage() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [creatingOrder, setCreatingOrder] = useState(false)

  const TAX_RATE = 0.10 // 10% de impuestos

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/buyer/cart')
      const data = await response.json()

      if (response.ok && data.success) {
        setCart(data.cart)
      }
    } catch (error) {
      console.error('Error cargando carrito:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    try {
      setUpdating(itemId)
      const response = await fetch(`/api/buyer/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
      })

      if (response.ok) {
        await fetchCart()
      } else {
        const data = await response.json()
        alert(data.error || 'Error actualizando cantidad')
      }
    } catch (error) {
      console.error('Error actualizando cantidad:', error)
      alert('Error actualizando cantidad')
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este producto del carrito?')) return

    try {
      setUpdating(itemId)
      const response = await fetch(`/api/buyer/cart/items/${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error('Error eliminando item:', error)
    } finally {
      setUpdating(null)
    }
  }

  const clearCart = async () => {
    if (!confirm('¿Vaciar todo el carrito?')) return

    try {
      const response = await fetch('/api/buyer/cart', {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCart()
      }
    } catch (error) {
      console.error('Error vaciando carrito:', error)
    }
  }

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
      const response = await fetch('/api/buyer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: null,
          idempotencyKey: uuidv4()  // agregando idempotencyKey
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        alert('✅ ¡Pedido creado exitosamente!')
        router.push('/buyer/orders')
      } else {
        alert(data.error || 'Error creando el pedido')
      }
    } catch (error) {
      console.error('Error creando orden:', error)
      alert('Error creando el pedido')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando carrito...</p>
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
                {cart?.items.length === 1 ? 'producto' : 'productos'} en tu carrito
              </p>
            </div>
            {cart && cart.items.length > 0 && (
              <button
                onClick={clearCart}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Vaciar carrito
              </button>
            )}
          </div>
        </div>

        {/* Carrito vacío */}
        {!cart || cart.items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <ShoppingCart className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              Tu carrito está vacío
            </h3>
            <p className="text-gray-500 mb-6">
              Agrega productos desde el catálogo para comenzar tu pedido
            </p>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Ir al catálogo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista de productos */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100"
                >
                  <div className="flex gap-4">
                    {/* Imagen */}
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      {item.product.imageUrl ? (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Package className="text-purple-300" size={40} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">
                            {item.product.name}
                          </h3>
                          {item.product.sku && (
                            <p className="text-xs text-gray-500">
                              SKU: {item.product.sku}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            ${item.price.toFixed(2)} / {item.product.unit}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          disabled={updating === item.id}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-2">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1 || updating === item.id}
                            className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="font-semibold min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            disabled={
                              item.quantity >= item.product.stock ||
                              updating === item.id
                            }
                            className="p-1 hover:bg-white rounded transition-colors disabled:opacity-50"
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-gray-600">Subtotal</p>
                          <p className="text-xl font-bold text-purple-600">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Stock disponible */}
                      <p className="text-xs text-gray-500 mt-2">
                        Stock disponible: {item.product.stock}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 sticky top-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Resumen del Pedido
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Impuestos (10%)</span>
                    <span className="font-semibold">${tax.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-800">
                        Total
                      </span>
                      <span className="text-2xl font-bold text-purple-600">
                        ${total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={createOrder}
                  disabled={creatingOrder || !cart || cart.items.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingOrder ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      Finalizar Pedido
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.push('/buyer/catalog')}
                  className="w-full mt-3 border-2 border-purple-600 text-purple-600 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
                >
                  Continuar comprando
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}