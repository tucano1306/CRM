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
  Bookmark,
  Tag,
  Info,
  X,
  Calendar,
  Truck,
  Store,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

type ToastMessage = {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

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
  const [savedForLater, setSavedForLater] = useState<string[]>([])
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null)
  const [suggestedProducts, setSuggestedProducts] = useState<any[]>([])
  const [popularProducts, setPopularProducts] = useState<any[]>([])

  const TAX_RATE = 0.10 // 10% de impuestos
  const DELIVERY_FEE = 5.00 // Costo de envío

  // Mostrar toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  useEffect(() => {
    fetchCart()
    loadSuggestedProducts()
    loadPopularProducts()
  }, [])

  // Cargar productos sugeridos
  const loadSuggestedProducts = async () => {
    const products = await getSuggestedProducts()
    setSuggestedProducts(products)
  }

  // Cargar productos populares
  const loadPopularProducts = async () => {
    const products = await getPopularProducts()
    setPopularProducts(products)
  }

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
        showToast('✓ Cantidad actualizada', 'success')
        await fetchCart()
      } else {
        showToast(result.error || 'Error actualizando cantidad', 'error')
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setUpdating(null)
    }
  }

  // Abrir modal de confirmación de eliminación
  const confirmRemoveItem = (itemId: string, productName: string) => {
    setItemToDelete({ id: itemId, name: productName })
    setShowDeleteModal(true)
  }

  // ✅ removeItem CON TIMEOUT
  const removeItem = async () => {
    if (!itemToDelete) return

    try {
      setUpdating(itemToDelete.id)
      setShowDeleteModal(false)

      const result = await apiCall(`/api/buyer/cart/items/${itemToDelete.id}`, {
        method: 'DELETE',
        timeout: 5000,
      })

      if (result.success) {
        showToast('Producto eliminado del carrito', 'info')
        await fetchCart()
      } else {
        showToast(result.error || 'Error eliminando item', 'error')
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setUpdating(null)
      setItemToDelete(null)
    }
  }

  // Guardar para después
  const saveForLater = (itemId: string) => {
    setSavedForLater(prev => {
      if (prev.includes(itemId)) {
        showToast('Producto quitado de guardados', 'info')
        return prev.filter(id => id !== itemId)
      } else {
        showToast('Producto guardado para después', 'success')
        return [...prev, itemId]
      }
    })
  }

  // Aplicar cupón
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      showToast('Por favor ingresa un cupón', 'error')
      return
    }

    try {
      const result = await apiCall('/api/buyer/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.toUpperCase(),
          cartTotal: calculateSubtotal()
        }),
      })

      if (result.success && result.data) {
        setAppliedCoupon({
          code: result.data.code,
          discount: result.data.discountAmount
        })
        showToast(`¡Cupón aplicado! Descuento: $${result.data.discountAmount.toFixed(2)}`, 'success')
        setCouponCode('')
      }
    } catch (error: any) {
      showToast(error.message || 'Cupón inválido o expirado', 'error')
      setAppliedCoupon(null)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode('')
    showToast('Cupón eliminado', 'info')
  }

  const calculateSubtotal = () => {
    if (!cart) return 0
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const calculateDiscount = () => {
    if (!appliedCoupon) return 0
    // El descuento ya viene calculado del backend
    return appliedCoupon.discount
  }

  const calculateTax = () => {
    const subtotalAfterDiscount = calculateSubtotal() - calculateDiscount()
    return subtotalAfterDiscount * TAX_RATE
  }

  const calculateDeliveryFee = () => {
    return deliveryMethod === 'delivery' ? DELIVERY_FEE : 0
  }

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount() + calculateTax() + calculateDeliveryFee()
  }

  const getEstimatedDeliveryDate = () => {
    const today = new Date()
    if (deliveryMethod === 'pickup') {
      return 'Hoy'
    } else {
      const startDate = new Date(today)
      startDate.setDate(today.getDate() + 2)
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 3)
      return `${startDate.getDate()}-${endDate.getDate()} ${startDate.toLocaleDateString('es', { month: 'short' })}`
    }
  }

  const getSuggestedProducts = async () => {
    try {
      const result = await apiCall('/api/products/suggested', {
        method: 'GET',
      })
      
      console.log('Suggested products result:', result)
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log('Suggested products count:', result.data.length)
        return result.data.slice(0, 3) // Limitar a 3
      }
    } catch (error) {
      console.error('Error loading suggested products:', error)
    }
    
    return []
  }

  const getPopularProducts = async () => {
    try {
      const result = await apiCall('/api/products/popular', {
        method: 'GET',
      })
      
      console.log('Popular products result:', result)
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log('Popular products count:', result.data.length)
        return result.data.slice(0, 4) // Limitar a 4
      }
    } catch (error) {
      console.error('Error loading popular products:', error)
    }
    
    return []
  }

  const saveCartForLater = async () => {
    try {
      const result = await apiCall('/api/buyer/cart/save-for-later', {
        method: 'POST',
      })

      if (result.success) {
        showToast('Carrito guardado exitosamente', 'success')
      }
    } catch (error) {
      showToast('Error al guardar el carrito', 'error')
      console.error('Error saving cart:', error)
    }
  }

  // Agregar producto al carrito
  const addToCart = async (productId: string, quantity: number = 1) => {
    try {
      console.log('Adding to cart:', { productId, quantity })
      
      const result = await apiCall('/api/buyer/cart/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })

      console.log('Add to cart result:', result)

      if (result.success) {
        showToast('✅ Producto agregado al carrito', 'success')
        await fetchCart() // Recargar el carrito
      } else {
        showToast(result.error || '❌ Error al agregar producto', 'error')
      }
    } catch (error: any) {
      const errorMsg = error?.message || 'Error al agregar producto'
      showToast(`❌ ${errorMsg}`, 'error')
      console.error('Error adding to cart:', error)
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

    if (!confirm('¿Confirmar pedido por $' + calculateTotal().toFixed(2) + '?')) {
      return
    }

    try {
      setCreatingOrder(true)
      
      const result = await apiCall('/api/buyer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: orderNotes || null,
          deliveryMethod: deliveryMethod,
          couponCode: appliedCoupon?.code || null,
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

  // Los cálculos ahora se hacen en las funciones calculate*()
  // para incluir descuentos de cupones

  // ✅ ESTADO DE LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <ShoppingCart className="text-blue-600" size={32} />
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50 p-6 flex items-center justify-center">
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
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-lg p-8 border border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={fetchCart}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-teal-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Stepper de progreso */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-md">
                ✓
              </div>
              <span className="text-sm font-semibold text-blue-600">Carrito</span>
            </div>
            
            <div className="flex-1 h-1 bg-gray-200 mx-4 rounded"></div>
            
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <span className="text-sm text-gray-500">Confirmación</span>
            </div>
            
            <div className="flex-1 h-1 bg-gray-200 mx-4 rounded"></div>
            
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-200 text-gray-500 rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <span className="text-sm text-gray-500">Pago</span>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <ShoppingCart className="text-blue-600" size={32} />
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
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-blue-100">
            <ShoppingCart className="mx-auto text-gray-300 mb-4" size={96} strokeWidth={1.5} />
            <h3 className="text-3xl font-bold text-gray-700 mb-3">
              Tu carrito está vacío
            </h3>
            <p className="text-gray-500 mb-8 text-lg">
              ¡Agrega productos desde el catálogo!
            </p>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold inline-flex items-center gap-2 shadow-md"
            >
              <Package size={20} />
              Ir al Catálogo
            </button>

            {/* Productos más vendidos */}
            {popularProducts.length > 0 && (
              <div className="mt-12">
                <h4 className="text-xl font-bold text-gray-800 mb-6 flex items-center justify-center gap-2">
                  🔥 Los más vendidos
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {popularProducts.map(product => (
                    <div key={product.id} className="bg-gradient-to-br from-blue-50 to-slate-50 p-4 rounded-xl border border-blue-100 hover:shadow-lg transition-shadow cursor-pointer group">
                      <div className="aspect-square bg-white rounded-lg flex items-center justify-center mb-3 shadow-sm">
                        <Package className="w-12 h-12 text-blue-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                      <p className="font-semibold text-gray-800 text-sm line-clamp-2 mb-2">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-blue-600 font-bold text-lg">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                      <button 
                        onClick={() => router.push('/buyer/catalog')}
                        className="w-full mt-3 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Ver producto
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items del carrito */}
        {cart && cart.items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda: Items (2/3) */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-md border border-blue-100 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] overflow-hidden ${
                    updating === item.id ? 'opacity-75 pointer-events-none' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-4 p-4 sm:p-6">
                    {/* IMAGEN DEL PRODUCTO */}
                    <div className="flex-shrink-0 mx-auto sm:mx-0">
                      <img 
                        src={item.product.imageUrl || '/placeholder-food.jpg'}
                        alt={item.product.name}
                        className="w-24 h-24 object-cover rounded-lg shadow-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent) {
                            parent.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br', 'from-blue-100', 'to-slate-100', 'w-24', 'h-24', 'rounded-lg')
                            const packageIcon = document.createElement('div')
                            packageIcon.innerHTML = '<svg class="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>'
                            parent.appendChild(packageIcon.firstChild!)
                          }
                        }}
                      />
                    </div>

                    {/* INFORMACIÓN DEL PRODUCTO */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-800">
                            {item.product.name}
                          </h3>
                          {item.product.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {item.product.description}
                            </p>
                          )}
                          {item.product.sku && (
                            <p className="text-xs text-gray-400 mt-1">
                              SKU: {item.product.sku}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* PRECIO Y STOCK */}
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-blue-600 font-bold text-lg">
                          ${item.price.toFixed(2)}
                        </span>
                        <span className="text-gray-500 text-sm">
                          / {item.product.unit}
                        </span>
                        {item.product.stock < 10 && (
                          <span className="text-orange-600 text-sm font-medium flex items-center gap-1">
                            <Info className="w-4 h-4" />
                            Solo {item.product.stock} disponibles
                          </span>
                        )}
                      </div>

                      {/* CONTROLES Y ACCIONES */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between">
                          {/* Controles de cantidad */}
                          <div className="flex items-center gap-2">
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
                              <span className="w-12 text-center font-bold text-gray-800">
                                {updating === item.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                                ) : (
                                  item.quantity
                                )}
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

                            {/* QUICK ADD BUTTONS */}
                            <div className="flex gap-1 ml-2">
                              <button 
                                onClick={() => updateQuantity(item.id, 10)}
                                disabled={updating === item.id || item.product.stock < 10}
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              >
                                10
                              </button>
                              <button 
                                onClick={() => updateQuantity(item.id, 25)}
                                disabled={updating === item.id || item.product.stock < 25}
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              >
                                25
                              </button>
                              <button 
                                onClick={() => updateQuantity(item.id, 50)}
                                disabled={updating === item.id || item.product.stock < 50}
                                className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-blue-100 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                              >
                                50
                              </button>
                            </div>
                          </div>

                          {/* Subtotal del item */}
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Subtotal</p>
                            <p className="text-xl font-bold text-gray-800 transition-all duration-300">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* DESCUENTO POR VOLUMEN */}
                        {item.quantity >= 10 && (
                          <div className="bg-green-50 border border-green-200 p-2 rounded-lg mt-3 animate-fade-in-up">
                            <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                              🎉 ¡10% de descuento por compra al mayor! Ahorraste ${(item.price * item.quantity * 0.10).toFixed(2)}
                            </p>
                          </div>
                        )}

                        {item.quantity < 10 && item.quantity > 5 && (
                          <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-lg mt-3 animate-fade-in-up">
                            <p className="text-xs text-yellow-700 font-medium flex items-center gap-1">
                              💡 Agrega {10 - item.quantity} más para obtener 10% de descuento
                            </p>
                          </div>
                        )}
                      </div>

                      {/* BOTONES DE ACCIÓN */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        {/* Guardar para después */}
                        <button 
                          onClick={() => saveForLater(item.id)}
                          className={`text-sm flex items-center gap-1 transition-colors ${
                            savedForLater.includes(item.id)
                              ? 'text-blue-600 font-medium'
                              : 'text-gray-600 hover:text-blue-600'
                          }`}
                        >
                          <Bookmark className={`w-4 h-4 ${savedForLater.includes(item.id) ? 'fill-current' : ''}`} />
                          {savedForLater.includes(item.id) ? 'Guardado' : 'Guardar para después'}
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => confirmRemoveItem(item.id, item.product.name)}
                          disabled={updating === item.id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 flex items-center gap-1 transition-colors"
                        >
                          <Trash2 size={16} />
                          <span className="text-sm">Eliminar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* PRODUCTOS SUGERIDOS */}
              {suggestedProducts.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-slate-50 p-6 rounded-xl mt-6 border border-blue-100">
                  <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
                    💡 Productos que podrían interesarte
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {suggestedProducts.map(product => (
                      <div key={product.id} className="bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                        <div className="aspect-square bg-gradient-to-br from-blue-100 to-slate-100 rounded flex items-center justify-center mb-2">
                          <Package className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-2">{product.name}</p>
                        <p className="text-blue-600 font-bold mt-1">${product.price.toFixed(2)}</p>
                        <button 
                          onClick={() => addToCart(product.id)}
                          className="w-full bg-blue-100 text-blue-600 py-1.5 rounded mt-2 text-sm hover:bg-blue-200 transition-colors font-medium"
                        >
                          + Agregar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Columna derecha: Resumen (1/3) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-blue-100 sticky top-4">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <DollarSign size={24} className="text-blue-600" />
                    Resumen del pedido
                  </h2>
                </div>

                {/* Notas del pedido */}
                <div className="p-6 border-b border-gray-100">
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    📝 Notas especiales (opcional)
                  </label>
                  <textarea 
                    placeholder="Ej: Sin cebolla, bien cocido, empaque especial..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Método de entrega/retiro */}
                <div className="p-6 border-b border-gray-100">
                  <h4 className="font-bold mb-3 text-gray-800 flex items-center gap-2">
                    🚚 Método de recepción
                  </h4>
                  
                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg mb-3 cursor-pointer hover:bg-blue-50 transition-colors" 
                    style={{ borderColor: deliveryMethod === 'delivery' ? '#3b82f6' : '#e5e7eb' }}>
                    <input 
                      type="radio" 
                      name="delivery" 
                      value="delivery"
                      checked={deliveryMethod === 'delivery'}
                      onChange={(e) => setDeliveryMethod(e.target.value as 'delivery' | 'pickup')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Truck className={`w-5 h-5 ${deliveryMethod === 'delivery' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${deliveryMethod === 'delivery' ? 'text-blue-600' : 'text-gray-700'}`}>
                        Entrega a domicilio
                      </p>
                      <p className="text-sm text-gray-500">2-3 días hábiles - ${DELIVERY_FEE.toFixed(2)}</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors"
                    style={{ borderColor: deliveryMethod === 'pickup' ? '#3b82f6' : '#e5e7eb' }}>
                    <input 
                      type="radio" 
                      name="delivery" 
                      value="pickup"
                      checked={deliveryMethod === 'pickup'}
                      onChange={(e) => setDeliveryMethod(e.target.value as 'delivery' | 'pickup')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Store className={`w-5 h-5 ${deliveryMethod === 'pickup' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="flex-1">
                      <p className={`font-medium ${deliveryMethod === 'pickup' ? 'text-blue-600' : 'text-gray-700'}`}>
                        Recoger en tienda
                      </p>
                      <p className="text-sm text-gray-500">Disponible hoy - Gratis</p>
                    </div>
                  </label>

                  {/* Fecha de entrega estimada */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>
                      <strong className="text-blue-600">
                        {deliveryMethod === 'pickup' ? 'Disponible:' : 'Entrega estimada:'}
                      </strong>{' '}
                      {getEstimatedDeliveryDate()}
                    </span>
                  </div>
                </div>

                {/* Cupón de descuento */}
                <div className="p-6 border-b border-gray-100">
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    ¿Tienes un cupón?
                  </label>
                  {!appliedCoupon ? (
                    <div className="flex gap-2">
                      <input 
                        type="text"
                        placeholder="Código de descuento"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button 
                        onClick={applyCoupon}
                        disabled={!couponCode.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        Aplicar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 font-medium">
                          {appliedCoupon.code}
                        </span>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Cupones válidos: DESCUENTO10, PRIMERACOMPRA, ENVIOGRATIS
                  </p>
                </div>

                {/* Desglose de precios */}
                <div className="p-6 space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold">
                      ${calculateSubtotal().toFixed(2)}
                    </span>
                  </div>

                  {appliedCoupon && (
                    <div className="flex justify-between text-green-600">
                      <span>Descuento ({(appliedCoupon.discount * 100).toFixed(0)}%):</span>
                      <span className="font-semibold">
                        -${calculateDiscount().toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span>Impuestos ({(TAX_RATE * 100).toFixed(0)}%):</span>
                    <span className="font-semibold">${calculateTax().toFixed(2)}</span>
                  </div>

                  {deliveryMethod === 'delivery' && (
                    <div className="flex justify-between text-gray-600">
                      <span className="flex items-center gap-1">
                        <Truck className="w-4 h-4" />
                        Envío:
                      </span>
                      <span className="font-semibold">${DELIVERY_FEE.toFixed(2)}</span>
                    </div>
                  )}

                  {deliveryMethod === 'pickup' && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-1">
                        <Store className="w-4 h-4" />
                        Retiro en tienda:
                      </span>
                      <span className="font-semibold">Gratis</span>
                    </div>
                  )}

                  {/* Indicador de ahorro */}
                  {appliedCoupon && (
                    <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                      <p className="text-green-700 font-medium flex items-center gap-2 text-sm">
                        <Tag className="w-4 h-4" />
                        ¡Ahorraste ${calculateDiscount().toFixed(2)} en este pedido!
                      </p>
                    </div>
                  )}

                  <div className="border-t pt-3 flex justify-between text-lg font-bold text-gray-800">
                    <span>Total:</span>
                    <span className="text-blue-600">
                      ${calculateTotal().toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Botón de confirmar */}
                <div className="p-6 border-t border-gray-100">
                  {/* Botón guardar carrito */}
                  <button
                    onClick={saveCartForLater}
                    className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg mb-3 hover:bg-blue-50 transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    <Bookmark size={20} />
                    💾 Guardar carrito para después
                  </button>

                  {/* Botón confirmar pedido */}
                  <button
                    onClick={createOrder}
                    disabled={creatingOrder}
                    className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-colors font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
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
          </div>
        )}
      </div>

      {/* Notificaciones Toast */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in min-w-[300px] ${
              toast.type === 'success' 
                ? 'bg-emerald-500 text-white' 
                : toast.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            {toast.type === 'success' && <Tag className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            {toast.type === 'info' && <Info className="w-5 h-5" />}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="hover:bg-white/20 rounded p-1 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && itemToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  ¿Eliminar producto?
                </h3>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Estás seguro de eliminar <strong className="text-gray-800">"{itemToDelete.name}"</strong> del carrito?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setShowDeleteModal(false)
                  setItemToDelete(null)
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button 
                onClick={removeItem}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
