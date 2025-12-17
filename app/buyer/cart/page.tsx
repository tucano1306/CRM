'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { v4 as uuidv4 } from 'uuid'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import { formatPrice } from '@/lib/utils'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  ArrowRight,
  Loader2,
  AlertCircle,
  Check,
  CheckCircle,
  ArrowUpDown,
  FileText,
} from 'lucide-react'

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

function CartPageContent() {
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [orderNotes, setOrderNotes] = useState('')
  
  // Checkboxes para selección
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll] = useState(false)

  // Ordenamiento
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'quantity'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')



  // Mostrar toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    const removeToast = () => setToasts(prev => prev.filter(t => t.id !== id))
    setTimeout(removeToast, 3000)
  }

  // Fetch cart
  const fetchCart = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await apiCall('/api/buyer/cart', {
        timeout: 5000,
      })

      if (result.success) {
        setCart(result.data.cart)
        // Seleccionar todos por defecto
        if (result.data.cart?.items) {
          setSelectedItems(new Set(result.data.cart.items.map((item: CartItem) => item.id)))
          setSelectAll(true)
        }
      } else {
        setError(result.error || 'Error cargando carrito')
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  // Toggle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(cart?.items.map(item => item.id) || []))
    }
    setSelectAll(!selectAll)
  }

  // Toggle individual item
  const toggleItemSelection = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
    }
    setSelectedItems(newSelected)
    setSelectAll(newSelected.size === cart?.items.length)
  }

  // Sort items
  const getSortedItems = () => {
    if (!cart?.items) return []
    
    return [...cart.items].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.product.name.localeCompare(b.product.name)
          break
        case 'price':
          comparison = (a.price * a.quantity) - (b.price * b.quantity)
          break
        case 'quantity':
          comparison = a.quantity - b.quantity
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }

  const handleSort = (field: 'name' | 'price' | 'quantity') => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDirection('asc')
    }
  }

  // Update quantity
  const updateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return

    const item = cart?.items.find(i => i.id === itemId)
    if (item && newQuantity > item.product.stock) {
      showToast(`Stock máximo: ${item.product.stock} ${item.product.unit}`, 'info')
      return
    }

    // Optimistic update - actualizar estado local inmediatamente
    setCart(prevCart => {
      if (!prevCart) return prevCart
      return {
        ...prevCart,
        items: prevCart.items.map(i => 
          i.id === itemId ? { ...i, quantity: newQuantity } : i
        )
      }
    })

    try {
      setUpdating(itemId)

      const result = await apiCall(`/api/buyer/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity }),
        timeout: 5000,
      })

      if (!result.success) {
        // Revertir si falla
        await fetchCart()
        showToast(result.error || 'Error actualizando cantidad', 'error')
      }
    } catch (err) {
      // Revertir si falla
      await fetchCart()
      showToast(getErrorMessage(err), 'error')
    } finally {
      setUpdating(null)
    }
  }

  // Remove item
  const removeItem = async (itemId: string) => {
    try {
      setUpdating(itemId)

      const result = await apiCall(`/api/buyer/cart/items/${itemId}`, {
        method: 'DELETE',
        timeout: 5000,
      })

      if (result.success) {
        showToast('Producto eliminado', 'info')
        await fetchCart()
      } else {
        showToast(result.error || 'Error eliminando item', 'error')
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setUpdating(null)
    }
  }

  // Remove selected items (OPTIMIZADO - una sola llamada API)
  const removeSelectedItems = async () => {
    if (selectedItems.size === 0) {
      showToast('Selecciona productos para eliminar', 'info')
      return
    }

    if (!confirm(`¿Eliminar ${selectedItems.size} producto(s)?`)) return

    try {
      const itemIds = Array.from(selectedItems)
      
      // Una sola llamada API para eliminar todos
      const result = await apiCall('/api/buyer/cart/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
        timeout: 10000,
      })

      if (result.success) {
        const deletedCount = result.data?.deletedCount || selectedItems.size
        showToast(`${deletedCount} producto(s) eliminado(s)`, 'info')
        setSelectedItems(new Set())
        
        // Actualizar carrito con los datos devueltos o refetch
        if (result.data?.cart) {
          setCart(result.data.cart)
        } else {
          await fetchCart()
        }
      } else {
        showToast(result.error || 'Error eliminando productos', 'error')
        await fetchCart()
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
      await fetchCart()
    }
  }

  // Calculations
  const calculateSubtotal = () => {
    if (!cart) return 0
    return cart.items
      .filter(item => selectedItems.has(item.id))
      .reduce((sum, item) => sum + item.price * item.quantity, 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal()
  }

  // Create order
  const createOrder = async () => {
    if (selectedItems.size === 0) {
      showToast('Selecciona productos para tu pedido', 'error')
      return
    }

    try {
      setCreatingOrder(true)

      const result = await apiCall('/api/buyer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: orderNotes || null,
          idempotencyKey: uuidv4(),
          // Solo enviar items seleccionados
          selectedItemIds: Array.from(selectedItems)
        }),
        timeout: 8000,
      })

      if (result.success) {
        showToast('✅ ¡Pedido creado exitosamente!', 'success')
        router.push('/buyer/orders')
      } else {
        showToast(result.error || 'Error creando el pedido', 'error')
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setCreatingOrder(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando carrito...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error al cargar</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchCart}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // Empty cart
  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <ShoppingCart className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Carrito vacío</h2>
          <p className="text-gray-600 mb-6">No tienes productos en tu carrito</p>
          <button 
            onClick={() => router.push('/buyer/catalog')}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center gap-2 mx-auto"
          >
            <Package className="w-5 h-5" />
            Ir al Catálogo
          </button>
        </div>
      </div>
    )
  }

  const sortedItems = getSortedItems()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 page-transition">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => {
          const getToastStyle = () => {
            if (toast.type === 'success') return 'bg-green-500 text-white';
            if (toast.type === 'error') return 'bg-red-500 text-white';
            return 'bg-blue-500 text-white';
          };
          return (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in ${getToastStyle()}`}
          >
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        )})}
      </div>

      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                <ShoppingCart className="w-7 h-7 text-purple-600" />
                Mi Carrito
              </h1>
              <p className="text-gray-500 text-sm">
                {cart.items.length} productos • {selectedItems.size} seleccionados
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => router.push('/buyer/catalog')}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar más
              </button>
              {selectedItems.size > 0 && (
                <button
                  onClick={removeSelectedItems}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200 transition-all flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar ({selectedItems.size})
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Lista de Productos */}
          <div className="flex-1">
            {/* Header de la tabla */}
            <div className="bg-white rounded-t-xl shadow-md">
              <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b-2 border-purple-100 text-sm font-semibold text-gray-600">
                <div className="col-span-1 flex items-center">
                  <button
                    onClick={handleSelectAll}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      selectAll
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-600 text-white'
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {selectAll && <Check className="w-4 h-4" />}
                  </button>
                </div>
                <div className="col-span-5 md:col-span-4 flex items-center gap-2">
                  <button 
                    onClick={() => handleSort('name')}
                    className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                  >
                    Producto
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="col-span-2 hidden md:flex items-center gap-2">
                  <button 
                    onClick={() => handleSort('price')}
                    className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                  >
                    Precio
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="col-span-3 md:col-span-3 flex items-center justify-center gap-2">
                  <button 
                    onClick={() => handleSort('quantity')}
                    className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                  >
                    Cantidad
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="col-span-3 md:col-span-2 text-right">
                  Subtotal
                </div>
              </div>
            </div>

            {/* Lista de items */}
            <div className="bg-white rounded-b-xl shadow-md divide-y divide-gray-100 max-h-[calc(100vh-400px)] overflow-y-auto">
              {sortedItems.map((item) => {
                const isSelected = selectedItems.has(item.id)
                const isUpdating = updating === item.id

                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-12 gap-4 px-4 py-4 hover:bg-purple-50/50 transition-all ${
                      isSelected ? 'bg-purple-100/60 border-l-4 border-purple-500' : ''
                    } ${isUpdating ? 'opacity-50' : ''}`}
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center">
                      <button
                        onClick={() => toggleItemSelection(item.id)}
                        disabled={isUpdating}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-600 text-white'
                            : 'border-gray-300 hover:border-purple-400'
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Producto */}
                    <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-indigo-100 flex-shrink-0">
                        {item.product.imageUrl ? (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-purple-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-800 truncate text-sm md:text-base">
                          {item.product.name}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {item.product.sku || item.product.unit}
                        </p>
                        {/* Stock warning */}
                        {(() => {
                          if (item.product.stock === 0) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                                <AlertCircle className="w-3 h-3" />
                                SIN STOCK
                              </span>
                            );
                          }
                          if (item.product.stock <= item.quantity) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
                                <AlertCircle className="w-3 h-3" />
                                Último(s) {item.product.stock}
                              </span>
                            );
                          }
                          if (item.product.stock <= 10) {
                            return (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded">
                                Stock bajo: {item.product.stock}
                              </span>
                            );
                          }
                          return null;
                        })()}
                        {/* Precio móvil */}
                        <p className="text-sm font-bold text-purple-600 md:hidden">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>

                    {/* Precio desktop */}
                    <div className="col-span-2 hidden md:flex items-center">
                      <span className="font-bold text-purple-600">
                        {formatPrice(item.price)}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">/{item.product.unit}</span>
                    </div>

                    {/* Cantidad */}
                    <div className="col-span-3 md:col-span-3 flex items-center justify-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={isUpdating || item.quantity <= 1}
                        className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors disabled:opacity-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = Number.parseInt(e.target.value, 10) || 1
                          updateQuantity(item.id, val)
                        }}
                        className="w-14 text-center border-2 border-purple-200 rounded-lg py-1 font-semibold focus:ring-2 focus:ring-purple-500"
                        min="1"
                        max={item.product.stock}
                      />
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isUpdating || item.quantity >= item.product.stock}
                        className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={isUpdating}
                        className="w-8 h-8 rounded-lg bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors ml-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Subtotal */}
                    <div className="col-span-3 md:col-span-2 flex items-center justify-end">
                      <span className={`font-bold ${isSelected ? 'text-purple-700' : 'text-gray-400'}`}>
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Panel de Resumen */}
          <div className="lg:w-96 lg:flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg p-6 lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Resumen del Pedido
              </h2>

              {/* Notas */}
              <div className="mb-4">
                <label htmlFor="order-notes-textarea" className="text-sm font-medium text-gray-600 mb-2 block">
                  Notas del pedido (opcional):
                </label>
                <textarea
                  id="order-notes-textarea"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Instrucciones especiales..."
                  className="w-full px-3 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={2}
                />
              </div>

              {/* Totales */}
              <div className="space-y-3 border-t-2 border-purple-100 pt-4">
                <div className="flex justify-between text-xl font-bold">
                  <span className="text-gray-800">Total ({selectedItems.size} items):</span>
                  <span className="text-purple-600">{formatPrice(calculateTotal())}</span>
                </div>
              </div>

              {/* Botón de enviar */}
              <button
                onClick={createOrder}
                disabled={creatingOrder || selectedItems.size === 0}
                className="w-full mt-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {creatingOrder ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <ArrowRight className="w-6 h-6" />
                    Enviar Pedido
                  </>
                )}
              </button>

              {selectedItems.size === 0 && (
                <p className="text-center text-sm text-red-500 mt-2">
                  Selecciona productos para continuar
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Estilos para animaciones */}
      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando carrito...</p>
        </div>
      </div>
    }>
      <CartPageContent />
    </Suspense>
  )
}
