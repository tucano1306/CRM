'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import { formatPrice } from '@/lib/utils'
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Search,
  Loader2,
  AlertCircle,
  X,
  CheckCircle,
  ArrowUpDown,
  Check,
  Trash2,
} from 'lucide-react'

type ToastMessage = {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
}

type Product = {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  unit: string
  imageUrl: string | null
  sku: string | null
  category?: string
}

type SelectedProduct = {
  product: Product
  quantity: number
}

export default function CatalogPage() {
  const _router = useRouter() // Required for navigation context
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Productos seleccionados con cantidades
  const [selectedProducts, setSelectedProducts] = useState<Map<string, number>>(new Map())
  
  // Enviando al carrito
  const [submitting, setSubmitting] = useState(false)

  // Notificaciones Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Categories
  const categories = [
    { id: 'all', name: 'Todos', emoji: '📦' },
    { id: 'carnes', name: 'Carnes', emoji: '🥩' },
    { id: 'embutidos', name: 'Embutidos', emoji: '🌭' },
    { id: 'salsas', name: 'Salsas', emoji: '🍯' },
    { id: 'vegetales', name: 'Vegetales', emoji: '🥬' },
    { id: 'granos', name: 'Granos', emoji: '🌾' },
    { id: 'condimentos', name: 'Condimentos', emoji: '🧂' },
    { id: 'bebidas', name: 'Bebidas', emoji: '🥤' },
    { id: 'lacteos', name: 'Lácteos', emoji: '🥛' },
    { id: 'panaderia', name: 'Panadería', emoji: '🍞' },
    { id: 'frutas', name: 'Frutas', emoji: '🍎' },
    { id: 'congelados', name: 'Congelados', emoji: '🧊' },
    { id: 'otros', name: 'Otros', emoji: '📦' },
  ]

  // Helper para eliminar toast por ID
  const removeToastById = useCallback((toastId: string) => {
    setToasts(prev => prev.filter(t => t.id !== toastId))
  }, [])

  // Mostrar toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => removeToastById(id), 3000)
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      const result = await apiCall('/api/buyer/products', {
        timeout: 30000,
      })

      if (result.success) {
        let productData = []
        let apiData = result.data
        
        if (apiData?.success && apiData.data) {
          apiData = apiData.data
        }
        
        if (apiData?.data && Array.isArray(apiData.data)) {
          productData = apiData.data
        } else if (Array.isArray(apiData)) {
          productData = apiData
        }
        
        setProducts(productData)
      } else {
        setError(result.error || 'Error cargando productos')
        setProducts([])
      }
    } catch (err) {
      setError(getErrorMessage(err))
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  // Filtrar y ordenar productos
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...products]

    // Filtrar por búsqueda
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        (p.description?.toLowerCase().includes(searchLower)) ||
        (p.sku?.toLowerCase().includes(searchLower))
      )
    }

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => 
        p.category?.toLowerCase() === selectedCategory.toLowerCase()
      )
    }

    // Ordenar
    filtered.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'price':
          comparison = a.price - b.price
          break
        case 'stock':
          comparison = a.stock - b.stock
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [products, search, selectedCategory, sortBy, sortDirection])

  // Toggle selección de producto
  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const newMap = new Map(prev)
      if (newMap.has(productId)) {
        newMap.delete(productId)
      } else {
        newMap.set(productId, 1)
      }
      return newMap
    })
  }

  // Actualizar cantidad
  const updateQuantity = (productId: string, quantity: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    setSelectedProducts(prev => {
      const newMap = new Map(prev)
      if (quantity <= 0) {
        newMap.delete(productId)
      } else if (quantity <= product.stock) {
        newMap.set(productId, quantity)
      } else {
        newMap.set(productId, product.stock)
        showToast(`Stock máximo: ${product.stock} ${product.unit}`, 'info')
      }
      return newMap
    })
  }

  // Calcular total
  const calculateTotal = () => {
    let total = 0
    selectedProducts.forEach((quantity, productId) => {
      const product = products.find(p => p.id === productId)
      if (product) {
        total += product.price * quantity
      }
    })
    return total
  }

  // Limpiar selección
  const clearSelection = () => {
    setSelectedProducts(new Map())
    showToast('Selección limpiada', 'info')
  }

  // Agregar al carrito (OPTIMIZADO - una sola llamada API)
  const addToCart = async () => {
    if (selectedProducts.size === 0) {
      showToast('Selecciona al menos un producto', 'error')
      return
    }

    setSubmitting(true)
    try {
      // Preparar items para batch
      const items = Array.from(selectedProducts.entries()).map(([productId, quantity]) => ({
        productId,
        quantity
      }))

      // Una sola llamada API para todos los productos
      const result = await apiCall('/api/buyer/cart/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
        timeout: 15000,
      })

      if (result.success && result.data) {
        const { summary, results } = result.data
        
        // Mostrar productos con error de stock
        const stockErrors = results?.filter((r: { success: boolean; error?: string }) => 
          !r.success && r.error?.includes('stock')
        ) || []
        
        if (stockErrors.length > 0) {
          const errorNames = stockErrors.map((e: { productName?: string; error?: string }) => 
            `${e.productName || 'Producto'}: ${e.error}`
          ).join('\n')
          showToast(`⚠️ Algunos productos sin stock:\n${errorNames}`, 'error')
        }
        
        if (summary?.success > 0) {
          showToast(`✅ ${summary.success} producto(s) agregado(s) al carrito`, 'success')
          
          // Limpiar solo los productos agregados exitosamente
          setSelectedProducts(prev => {
            const newMap = new Map(prev)
            results?.forEach((r: { success: boolean; productId: string }) => {
              if (r.success) {
                newMap.delete(r.productId)
              }
            })
            return newMap
          })
        }
        
        if (summary?.failed > 0 && summary?.success === 0) {
          showToast('❌ No se pudieron agregar los productos', 'error')
        }
      } else {
        showToast(result.error || 'Error al agregar productos', 'error')
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle ordenamiento
  const handleSort = (field: 'name' | 'price' | 'stock') => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDirection('asc')
    }
  }

  // Contar productos por categoría
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return products.length
    return products.filter(p => p.category?.toLowerCase() === categoryId.toLowerCase()).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center page-fade">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando catálogo...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center p-4 page-fade">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error al cargar</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchProducts}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                📦 Catálogo de Productos
              </h1>
              <p className="text-gray-500 text-sm">
                {filteredAndSortedProducts.length} productos disponibles
              </p>
            </div>

            {/* Búsqueda */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtro de categoría */}
          <div className="mt-4 flex flex-wrap gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white font-medium"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name} ({getCategoryCount(cat.id)})
                </option>
              ))}
            </select>
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
                  <span className="text-purple-600">✓</span>
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
                <div className="col-span-2 hidden md:flex items-center gap-2">
                  <button 
                    onClick={() => handleSort('stock')}
                    className="flex items-center gap-1 hover:text-purple-600 transition-colors"
                  >
                    Stock
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="col-span-6 md:col-span-3 text-center">
                  Cantidad
                </div>
              </div>
            </div>

            {/* Lista de productos */}
            <div className="bg-white rounded-b-xl shadow-md divide-y divide-gray-100 max-h-[calc(100vh-350px)] overflow-y-auto">
              {filteredAndSortedProducts.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No se encontraron productos</p>
                </div>
              ) : (
                filteredAndSortedProducts.map((product, index) => {
                  const isSelected = selectedProducts.has(product.id)
                  const quantity = selectedProducts.get(product.id) || 0
                  const isOutOfStock = product.stock === 0

                  return (
                    <div
                      key={product.id}
                      style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s` }}
                      className={`grid grid-cols-12 gap-4 px-4 py-4 hover:bg-purple-50/50 transition-all stagger-item ${
                        isSelected ? 'bg-purple-100/60 border-l-4 border-purple-500' : ''
                      } ${isOutOfStock ? 'opacity-50' : ''}`}
                    >
                      {/* Checkbox */}
                      <div className="col-span-1 flex items-center">
                        <button
                          onClick={() => !isOutOfStock && toggleProduct(product.id)}
                          disabled={isOutOfStock}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-purple-600 text-white'
                              : 'border-gray-300 hover:border-purple-400'
                          } ${isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {isSelected && <Check className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Producto */}
                      <div className="col-span-5 md:col-span-4 flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-indigo-100 flex-shrink-0">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
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
                            {product.name}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {product.sku || product.unit}
                          </p>
                          {/* Precio móvil */}
                          <p className="text-sm font-bold text-purple-600 md:hidden">
                            {formatPrice(product.price)}
                          </p>
                        </div>
                      </div>

                      {/* Precio desktop */}
                      <div className="col-span-2 hidden md:flex items-center">
                        <span className="font-bold text-purple-600">
                          {formatPrice(product.price)}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">/{product.unit}</span>
                      </div>

                      {/* Stock desktop */}
                      <div className="col-span-2 hidden md:flex items-center">
                        {isOutOfStock ? (
                          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-500 text-white flex items-center gap-1 animate-pulse">
                            <AlertCircle className="w-3 h-3" />
                            SIN STOCK
                          </span>
                        ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${(() => {
                            if (product.stock > 50) return 'bg-green-100 text-green-700';
                            if (product.stock > 10) return 'bg-yellow-100 text-yellow-700';
                            return 'bg-red-100 text-red-700';
                          })()}`}>
                            {product.stock} {product.unit}
                          </span>
                        )}
                      </div>

                      {/* Cantidad */}
                      <div className="col-span-6 md:col-span-3 flex items-center justify-center gap-2">
                        {(() => {
                          if (isOutOfStock) {
                            return (
                              <div className="flex flex-col items-center">
                                <span className="text-red-500 text-xs font-bold flex items-center gap-1 bg-red-50 px-3 py-1.5 rounded-lg">
                                  <AlertCircle className="w-4 h-4" />
                                  No disponible
                                </span>
                                <span className="text-gray-400 text-[10px] mt-1">Sin stock</span>
                              </div>
                            );
                          }
                          if (isSelected) {
                            return (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(product.id, quantity - 1)}
                                  className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <input
                                  type="number"
                                  value={quantity}
                                  onChange={(e) => updateQuantity(product.id, Number.parseInt(e.target.value, 10) || 0)}
                                  className="w-16 text-center border-2 border-purple-200 rounded-lg py-1 font-semibold focus:ring-2 focus:ring-purple-500"
                                  min="1"
                                  max={product.stock}
                                />
                                <button
                                  onClick={() => updateQuantity(product.id, quantity + 1)}
                                  className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center hover:bg-purple-200 transition-colors"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          }
                          return (
                            <span className="text-gray-400 text-sm">
                              Seleccionar
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Panel de Selección */}
          <div className="lg:w-80 lg:flex-shrink-0">
            <div className="bg-white rounded-xl shadow-lg p-6 lg:sticky lg:top-32">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                Selección Actual
              </h2>

              {selectedProducts.size === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No hay productos seleccionados</p>
                  <p className="text-gray-400 text-xs mt-1">Marca los productos que deseas agregar</p>
                </div>
              ) : (
                <>
                  {/* Lista de seleccionados */}
                  <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                    {Array.from(selectedProducts).map(([productId, quantity]) => {
                      const product = products.find(p => p.id === productId)
                      if (!product) return null
                      return (
                        <div key={productId} className="flex items-center justify-between bg-purple-50 rounded-lg p-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 text-sm truncate">{product.name}</p>
                            <p className="text-xs text-purple-600">
                              {quantity} x {formatPrice(product.price)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-purple-600 text-sm">
                              {formatPrice(product.price * quantity)}
                            </p>
                            <button
                              onClick={() => toggleProduct(productId)}
                              className="text-red-500 hover:text-red-600 text-xs"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Total y acciones */}
                  <div className="border-t-2 border-purple-100 pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-gray-600 font-medium">Total:</span>
                      <span className="text-2xl font-bold text-purple-600">
                        {formatPrice(calculateTotal())}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 text-center">
                      {selectedProducts.size} producto(s) seleccionado(s)
                    </p>
                    
                    <div className="space-y-2">
                      <button
                        onClick={addToCart}
                        disabled={submitting}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <ShoppingCart className="w-5 h-5" />
                        )}
                        {submitting ? 'Agregando...' : 'Agregar al Carrito'}
                      </button>
                      
                      <button
                        onClick={clearSelection}
                        className="w-full py-2 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Limpiar Selección
                      </button>
                    </div>
                  </div>
                </>
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
