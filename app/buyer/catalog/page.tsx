'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import { formatPrice, formatNumber } from '@/lib/utils'
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  Search,
  Loader2,
  Clock,
  AlertCircle,
  X,
  Heart,
  Grid,
  List,
  Filter,
  Trash2,
  Info,
  CheckCircle,
} from 'lucide-react'
import { ProductCardSkeleton } from '@/components/skeletons'

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
  isNew?: boolean
  isOffer?: boolean
}

export default function CatalogPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<{ [key: string]: number }>({})
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState('relevant')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [compareList, setCompareList] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(true)
  const [showCart, setShowCart] = useState(false)
  
  // Filtros avanzados
  const [priceRange, setPriceRange] = useState([0, 10000]) // Rango amplio por defecto
  const [onlyInStock, setOnlyInStock] = useState(false)
  const [selectedUnits, setSelectedUnits] = useState<string[]>([])

  // Búsqueda con sugerencias
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Product[]>([])

  // Notificaciones Toast
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  // Mostrar toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  // Toggle favorite
  const toggleFavorite = async (productId: string) => {
    const newFavorites = new Set(favorites)
    
    try {
      if (newFavorites.has(productId)) {
        await apiCall(`/api/buyer/favorites/${productId}`, {
          method: 'DELETE',
        })
        newFavorites.delete(productId)
        showToast('Eliminado de favoritos', 'success')
      } else {
        await apiCall(`/api/buyer/favorites/${productId}`, {
          method: 'POST',
        })
        newFavorites.add(productId)
        showToast('Agregado a favoritos', 'success')
      }
      setFavorites(newFavorites)
    } catch (error) {
      showToast('Error al actualizar favoritos', 'error')
      console.error('Error toggling favorite:', error)
    }
  }

  // Add/remove from compare
  const toggleCompare = (productId: string) => {
    setCompareList(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId)
      } else {
        if (prev.length >= 4) {
          alert('⚠️ Puedes comparar hasta 4 productos a la vez')
          return prev
        }
        return [...prev, productId]
      }
    })
  }

  // Categories configuration
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

  useEffect(() => {
    fetchProducts()
    fetchFavorites()
  }, [])

  // Fetch favorites from backend
  const fetchFavorites = async () => {
    try {
      const result = await apiCall('/api/buyer/favorites', {
        method: 'GET',
      })

      console.log('📦 Favorites result:', result)

      if (result.success && result.data && Array.isArray(result.data)) {
        const favoriteIds = new Set<string>(result.data.map((fav: any) => fav.productId))
        setFavorites(favoriteIds)
        console.log('✅ Favorites loaded:', favoriteIds.size)
      } else {
        console.log('⚠️ No favorites found or invalid data')
        setFavorites(new Set<string>())
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
      setFavorites(new Set<string>())
    }
  }

  // ✅ fetchProducts CON TIMEOUT EXTENDIDO
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setTimedOut(false)
      setError(null)

      console.log('🚀 [CATALOG] Iniciando carga de productos...')
      console.log('🌐 [CATALOG] URL:', '/api/buyer/products')

      const result = await apiCall('/api/buyer/products', {
        timeout: 30000, // 30 segundos - más tiempo para queries grandes
        onTimeout: () => setTimedOut(true)
      })

      console.log('📦 [CATALOG] API Response completa:', JSON.stringify(result, null, 2))
      console.log('📦 [CATALOG] result.success:', result.success)
      console.log('📦 [CATALOG] result.status:', result.status)
      console.log('📦 [CATALOG] result.data type:', typeof result.data)
      console.log('📦 [CATALOG] result.data:', result.data)

      setLoading(false)

      if (result.success) {
        // Manejar diferentes estructuras de respuesta
        let productData = []
        
        console.log('📦 [CATALOG] result.data tipo:', typeof result.data)
        console.log('📦 [CATALOG] result.data:', result.data)
        
        // La API puede devolver doble estructura debido a apiCall wrapper
        let apiData = result.data
        
        // Si result.data tiene un campo 'success', es una doble envoltura
        if (apiData && apiData.success && apiData.data) {
          console.log('⚠️ [CATALOG] Detectada doble envoltura, extrayendo...')
          apiData = apiData.data
        }
        
        console.log('📦 [CATALOG] apiData después de unwrap:', apiData)
        
        // Ahora extraer el array de productos
        if (apiData && apiData.data && Array.isArray(apiData.data)) {
          // Estructura: { data: [...], total: X }
          console.log('✅ [CATALOG] Estructura: apiData.data (array)')
          productData = apiData.data
        } else if (Array.isArray(apiData)) {
          // Estructura: [...]
          console.log('✅ [CATALOG] Estructura: apiData (direct array)')
          productData = apiData
        }

        console.log('📦 [CATALOG] productData final:', {
          type: typeof productData,
          isArray: Array.isArray(productData),
          length: Array.isArray(productData) ? productData.length : 'N/A'
        })
        
        if (Array.isArray(productData)) {
          console.log('✅ [CATALOG] Products loaded:', productData.length)
          if (productData.length > 0) {
            console.log('📦 [CATALOG] First 3 products:', productData.slice(0, 3))
          }
          setProducts(productData)
        } else {
          console.error('❌ [CATALOG] No se encontró array de productos')
          console.error('❌ [CATALOG] apiData completo:', apiData)
          setProducts([])
        }
      } else {
        console.error('❌ [CATALOG] Error en success=false:', result.error)
        setError(result.error || 'Error cargando productos')
        setProducts([])
      }
    } catch (err) {
      console.error('❌ [CATALOG] Exception capturada:', err)
      setLoading(false)
      setError(getErrorMessage(err))
      setProducts([])
    }
  }

  // ✅ addToCart CON TIMEOUT
  const addToCart = async (productId: string, quantity: number) => {
    try {
      const result = await apiCall('/api/buyer/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
        timeout: 5000,
      })

      if (result.success) {
        setCart({ ...cart, [productId]: quantity })
        const product = products.find(p => p.id === productId)
        if (product) {
          showToast(`✅ ${product.name} agregado al carrito`, 'success')
        }
      } else {
        showToast(result.error || 'Error al agregar al carrito', 'error')
      }
    } catch (err) {
      showToast(getErrorMessage(err), 'error')
    }
  }

  const updateQuantity = async (productId: string, change: number) => {
    const current = cart[productId] || 0
    const newQuantity = Math.max(0, current + change)
    
    if (newQuantity === 0) {
      await removeFromCart(productId)
      return
    }

    try {
      // Actualizar en el backend
      const cartItems = await apiCall('/api/buyer/cart', {
        method: 'GET',
        timeout: 5000,
      })

      if (cartItems.success && cartItems.data?.items) {
        const item = cartItems.data.items.find((i: any) => i.product.id === productId)
        if (item) {
          await apiCall(`/api/buyer/cart/items/${item.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quantity: newQuantity }),
            timeout: 5000,
          })
        }
      }
      
      setCart({ ...cart, [productId]: newQuantity })
      showToast('Cantidad actualizada', 'success')
    } catch (err) {
      showToast('Error al actualizar cantidad', 'error')
    }
  }

  const removeFromCart = async (productId: string) => {
    const product = products.find(p => p.id === productId)
    
    try {
      // Obtener items del carrito para encontrar el item ID
      const cartItems = await apiCall('/api/buyer/cart', {
        method: 'GET',
        timeout: 5000,
      })

      if (cartItems.success && cartItems.data?.items) {
        const item = cartItems.data.items.find((i: any) => i.product.id === productId)
        if (item) {
          await apiCall(`/api/buyer/cart/items/${item.id}`, {
            method: 'DELETE',
            timeout: 5000,
          })
        }
      }

      const newCart = { ...cart }
      delete newCart[productId]
      setCart(newCart)
      
      if (product) {
        showToast(`${product.name} eliminado del carrito`, 'info')
      }
    } catch (err) {
      showToast('Error al eliminar del carrito', 'error')
    }
  }

  const getTotalCartPrice = () => {
    return Object.entries(cart).reduce((total, [productId, quantity]) => {
      const product = products.find(p => p.id === productId)
      return total + (product ? product.price * quantity : 0)
    }, 0)
  }

  const getCartItems = () => {
    return Object.entries(cart)
      .map(([productId, quantity]) => {
        const product = products.find(p => p.id === productId)
        return product ? { ...product, quantity } : null
      })
      .filter(item => item !== null)
  }

  // Actualizar sugerencias de búsqueda
  const handleSearchChange = (value: string) => {
    setSearch(value)
    
    if (value.trim().length >= 2 && Array.isArray(products)) {
      const filtered = products
        .filter(p => p.name.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 5)
      setSuggestions(filtered)
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectSuggestion = (product: Product) => {
    setSearch(product.name)
    setShowSuggestions(false)
    setSelectedProduct(product)
  }

  // Asegurar que products siempre sea un array antes de filtrar
  const safeProducts = Array.isArray(products) ? products : []

  console.log('🔍 [CATALOG FILTER] Total products:', safeProducts.length)
  console.log('🔍 [CATALOG FILTER] selectedCategory value:', selectedCategory)
  console.log('🔍 [CATALOG FILTER] selectedCategory type:', typeof selectedCategory)
  console.log('🔍 [CATALOG FILTER] selectedCategory === "all":', selectedCategory === 'all')
  console.log('🔍 [CATALOG FILTER] Filters:', { search, selectedCategory, priceRange, onlyInStock })

  const filteredProducts = safeProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase())
    
    // ✅ FIX: Comparación case-insensitive para categorías
    const matchesCategory = selectedCategory === 'all' || 
      (product.category && product.category.toUpperCase() === selectedCategory.toUpperCase())
    
    // Debug primera iteración
    if (product.name === 'Fresh Salmon' || product.name === 'Mi salchicha') {
      console.log(`🐟 [FILTER DEBUG] ${product.name}:`, {
        'product.category': product.category,
        'selectedCategory': selectedCategory,
        'selectedCategory === "all"': selectedCategory === 'all',
        'categories match (case-insensitive)': product.category && product.category.toUpperCase() === selectedCategory.toUpperCase(),
        'matchesCategory': matchesCategory
      })
    }
    
    // Filtros avanzados
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1]
    const matchesStock = !onlyInStock || product.stock > 0
    const matchesUnit = selectedUnits.length === 0 || selectedUnits.includes(product.unit)
    
    const matches = matchesSearch && matchesCategory && matchesPrice && matchesStock && matchesUnit
    
    if (!matches) {
      console.log(`❌ [FILTER] ${product.name} filtered out:`, {
        matchesSearch,
        matchesCategory,
        matchesPrice: `${product.price} in [${priceRange[0]}, ${priceRange[1]}]`,
        matchesStock,
        matchesUnit
      })
    }
    
    return matches
  })

  console.log('✅ [CATALOG FILTER] Filtered products:', filteredProducts.length)

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc':
        return a.price - b.price
      case 'price-desc':
        return b.price - a.price
      case 'stock':
        return b.stock - a.stock
      case 'new':
        if (a.isNew && !b.isNew) return -1
        if (!a.isNew && b.isNew) return 1
        return 0
      case 'relevant':
      default:
        // Priorizar: ofertas > nuevos > stock alto
        const scoreA = (a.isOffer ? 100 : 0) + (a.isNew ? 50 : 0) + (a.stock > 50 ? 25 : 0)
        const scoreB = (b.isOffer ? 100 : 0) + (b.isNew ? 50 : 0) + (b.stock > 50 ? 25 : 0)
        return scoreB - scoreA
    }
  })

  const getCategoryCount = (categoryId: string) => {
    if (categoryId === 'all') return products.length
    return products.filter(p => p.category && p.category.toUpperCase() === categoryId.toUpperCase()).length
  }

  // ✅ UI States
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
              <Package className="text-purple-600" size={32} />
              Catálogo de Productos
            </h1>
            <p className="text-gray-600 mt-1 font-medium">Cargando productos...</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (timedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
        <div className="max-w-md mx-auto mt-8 bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 p-6 rounded-xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-amber-500 to-yellow-600 p-2 rounded-lg">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-amber-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-4 font-medium">
            La carga del catálogo está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchProducts}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 font-semibold shadow-md transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
        <div className="max-w-md mx-auto mt-8 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-300 p-6 rounded-xl shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-gradient-to-br from-red-500 to-rose-600 p-2 rounded-lg">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-4 font-medium">{error}</p>
          <button
            onClick={fetchProducts}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 font-semibold shadow-md transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - RESPONSIVE */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-4 md:p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                <Package className="text-purple-600" size={28} />
                Catálogo de Productos
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1 font-medium">
                {sortedProducts.length} productos disponibles
              </p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center justify-center gap-2 transition-all font-semibold shadow-md"
            >
              <ShoppingCart size={20} />
              <span className="hidden sm:inline">Ver Carrito</span>
              <span className="sm:hidden">Carrito</span>
              ({Object.keys(cart).length})
            </button>
          </div>

          {/* Buscador, Ordenamiento y Vista - RESPONSIVE */}
          <div className="mt-4 md:mt-6 space-y-3">
            {/* Primera fila: Buscador */}
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10"
                size={20}
              />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => search.length >= 2 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-400 transition-all font-medium"
              />
              
              {/* Sugerencias */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-b-lg mt-1 z-20 border-2 border-purple-200 max-h-80 overflow-y-auto">
                  <div className="p-2">
                    <p className="text-xs text-purple-600 mb-2 px-2 font-semibold uppercase tracking-wide">Sugerencias</p>
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => selectSuggestion(product)}
                        className="w-full text-left px-3 py-2 hover:bg-purple-50 rounded flex items-center gap-3 transition-all"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-purple-600 font-medium">
                            {formatPrice(product.price)} / {product.unit}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Segunda fila: Controles - RESPONSIVE */}
            <div className="flex flex-wrap gap-2">
              {/* Botón de filtros */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-all font-semibold shadow-md ${
                  showFilters 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                    : 'bg-white border-2 border-purple-200 text-purple-700 hover:border-purple-400'
                }`}
              >
                <Filter size={18} />
                <span className="text-sm md:text-base">Filtros</span>
              </button>

              {/* Ordenamiento */}
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none px-3 md:px-4 py-2 border-2 border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-400 bg-white text-sm md:text-base font-medium transition-all"
              >
                <option value="relevant">Más relevantes</option>
                <option value="price-asc">Menor precio</option>
                <option value="price-desc">Mayor precio</option>
                <option value="new">Nuevos primero</option>
                <option value="stock">Stock disponible</option>
              </select>

              {/* Toggle Vista Grid/Lista */}
              <div className="flex gap-2">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all shadow-md ${
                    viewMode === 'grid' 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                      : 'bg-white border-2 border-purple-200 text-purple-600 hover:border-purple-400'
                  }`}
                  title="Vista en cuadrícula"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all shadow-md ${
                    viewMode === 'list' 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                      : 'bg-white border-2 border-purple-200 text-purple-600 hover:border-purple-400'
                  }`}
                  title="Vista en lista"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Filtros de categoría - RESPONSIVE */}
          <div className="mt-4 md:mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all font-semibold shadow-md ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                    : 'bg-white border-2 border-purple-200 text-purple-700 hover:border-purple-400'
                }`}
              >
                {category.emoji} {category.name} ({getCategoryCount(category.id)})
              </button>
            ))}
          </div>
        </div>

        {/* Layout con Sidebar de Filtros y Productos - RESPONSIVE */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Sidebar de Filtros Avanzados - RESPONSIVE */}
          {showFilters && (
            <div className="w-full lg:w-72 lg:flex-shrink-0">
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-all lg:sticky lg:top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base md:text-lg bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Filtros Avanzados</h3>
                  <button
                    onClick={() => {
                      setPriceRange([0, 100])
                      setOnlyInStock(false)
                      setSelectedUnits([])
                    }}
                    className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                  >
                    Limpiar
                  </button>
                </div>
                
                {/* Rango de precio */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Rango de Precio
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}</span>
                  </div>
                </div>
                
                {/* Stock */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Disponibilidad
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={onlyInStock}
                      onChange={(e) => setOnlyInStock(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">Solo en stock</span>
                  </label>
                </div>
                
                {/* Unidades */}
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Unidad de Medida
                  </label>
                  <div className="space-y-2">
                    {['kg', 'lb', 'pk', 'un'].map(unit => (
                      <label key={unit} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={selectedUnits.includes(unit)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUnits([...selectedUnits, unit])
                            } else {
                              setSelectedUnits(selectedUnits.filter(u => u !== unit))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {unit === 'pk' ? 'Paquete' : unit === 'un' ? 'Unidad' : unit}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Resumen de filtros activos */}
                {(onlyInStock || selectedUnits.length > 0 || priceRange[1] < 100) && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Filtros activos:</p>
                    <div className="flex flex-wrap gap-2">
                      {onlyInStock && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          En stock
                        </span>
                      )}
                      {priceRange[1] < 100 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Hasta ${priceRange[1]}
                        </span>
                      )}
                      {selectedUnits.map(unit => (
                        <span key={unit} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contenedor de productos - RESPONSIVE */}
          <div className="flex-1 min-w-0">
            {/* Grid/Lista de productos - RESPONSIVE */}
            <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6'
            : 'flex flex-col gap-4'
        }>
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group border-2 border-transparent hover:border-purple-300 ${
                viewMode === 'grid' ? 'cursor-pointer transform hover:-translate-y-1' : 'cursor-pointer flex flex-col sm:flex-row hover:bg-purple-50/30'
              } ${cart[product.id] ? 'ring-2 ring-purple-400 ring-opacity-50 border-purple-300' : ''}`}
              onClick={() => setSelectedProduct(product)}
            >
              {/* Imagen del producto con tags - RESPONSIVE + MEJORADA */}
              <div className={`relative bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden ${
                viewMode === 'grid' ? 'h-40 sm:h-48 rounded-t-lg' : 'w-32 sm:w-48 h-32 sm:h-48 flex-shrink-0'
              }`}>
                {/* Overlay de hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[5]" />
                
                {/* Checkbox de comparación - MEJORADO */}
                <div className="absolute top-2 left-2 z-20 transform transition-transform group-hover:scale-110">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={compareList.includes(product.id)}
                      onChange={(e) => {
                        e.stopPropagation()
                        toggleCompare(product.id)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 bg-white border-2 border-purple-300 rounded peer-checked:bg-gradient-to-r peer-checked:from-purple-600 peer-checked:to-indigo-600 peer-checked:border-purple-600 shadow-lg flex items-center justify-center transition-all">
                      {compareList.includes(product.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </label>
                </div>

                <div className="relative w-full h-full">
                  <Image 
                    src={product.imageUrl || '/placeholder-food.jpg'} 
                    alt={product.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br', 'from-blue-100', 'to-slate-100')
                        const packageIcon = document.createElement('div')
                        packageIcon.innerHTML = '<svg class="w-16 sm:w-20 h-16 sm:h-20 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>'
                        parent.appendChild(packageIcon.firstChild!)
                      }
                    }}
                  />
                </div>
                
                {/* Tags - MEJORADOS */}
                <div className="absolute top-2 left-12 flex flex-col gap-1.5 z-10">
                  {product.isOffer && (
                    <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg animate-pulse">
                      🔥 Oferta
                    </span>
                  )}
                  {product.isNew && (
                    <span className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                      ✨ Nuevo
                    </span>
                  )}
                  {product.stock < 10 && product.stock > 0 && (
                    <span className="bg-gradient-to-r from-yellow-400 to-amber-400 text-gray-900 text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                      ⚠️ Pocas unidades
                    </span>
                  )}
                  {product.stock === 0 && (
                    <span className="bg-gray-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg">
                      Sin stock
                    </span>
                  )}
                </div>

                {/* Botón de favoritos - MEJORADO */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(product.id)
                  }}
                  className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-md rounded-full hover:bg-white hover:scale-110 transition-all duration-200 z-10 shadow-lg group/heart"
                  title={favorites.has(product.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                >
                  <Heart 
                    className={`w-5 h-5 transition-all duration-300 ${
                      favorites.has(product.id) 
                        ? 'fill-red-500 text-red-500' 
                        : 'text-gray-600 group-hover/heart:text-red-400'
                    }`}
                  />
                </button>

                {/* Indicador de stock en hover */}
                {product.stock > 0 && (
                  <div className="absolute bottom-2 left-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        product.stock > 50 ? 'bg-emerald-500 animate-pulse' : 
                        product.stock > 10 ? 'bg-yellow-500' : 
                        'bg-red-500 animate-pulse'
                      }`} />
                      <span className="text-xs font-medium text-gray-700">
                        {product.stock > 50 ? 'Stock disponible' : 
                         product.stock > 10 ? 'Stock medio' : 
                         'Stock bajo'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Contenido del producto - RESPONSIVE */}
              <div className={viewMode === 'grid' ? 'p-4 sm:p-6' : 'flex-1 p-4 sm:p-6'}>
                <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">
                    {product.description}
                  </p>
                )}
                {/* Precio y detalles - MEJORADO */}
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex flex-col">
                      <span className="text-xl sm:text-2xl font-bold text-blue-600">
                        {formatPrice(product.price)}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        Precio por {product.unit}
                      </span>
                    </div>
                    {product.sku && (
                      <div className="bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200">
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">SKU</div>
                        <div className="text-xs font-bold text-gray-700">{product.sku}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Indicador visual de stock - MEJORADO */}
                <div className="mb-3 sm:mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                    <span className="font-medium">Disponibilidad</span>
                    <span className="font-bold text-gray-800">{product.stock} {product.unit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${
                          product.stock > 50 ? 'bg-gradient-to-r from-emerald-400 to-green-600' : 
                          product.stock > 10 ? 'bg-gradient-to-r from-amber-400 to-yellow-600' : 
                          product.stock > 0 ? 'bg-gradient-to-r from-red-400 to-rose-600' : 'bg-gray-400'
                        }`}
                        style={{ width: `${Math.min((product.stock / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Controles de cantidad - MEJORADO */}
                <div className="flex items-center gap-3 mb-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuantity(product.id, -1)
                    }}
                    disabled={(cart[product.id] || 0) === 0}
                    className="bg-white border-2 border-purple-200 p-2 rounded-lg hover:border-purple-400 hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow active:scale-95"
                  >
                    <Minus size={16} className="text-purple-600" />
                  </button>
                  <div className="flex-1 flex items-center justify-center">
                    <span className="text-2xl font-bold text-purple-600 min-w-[3rem] text-center">
                      {cart[product.id] || 0}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuantity(product.id, 1)
                    }}
                    disabled={(cart[product.id] || 0) >= product.stock || product.stock === 0}
                    className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-95"
                  >
                    <Plus size={16} className="text-white" />
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    addToCart(product.id, cart[product.id] || 1)
                  }}
                  disabled={(cart[product.id] || 0) === 0 || product.stock === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2.5 rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={18} />
                  <span>{cart[product.id] > 0 ? 'Agregar al Carrito' : 'Selecciona cantidad'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {sortedProducts.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <Package className="mx-auto text-gray-400 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No se encontraron productos
            </h2>
            <p className="text-gray-600">
              Intenta con otra búsqueda o ajusta los filtros
            </p>
          </div>
        )}
          </div>
        </div>
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
            {toast.type === 'success' && <CheckCircle className="w-5 h-5" />}
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

      {/* Botón flotante de comparación */}
      {compareList.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2">
          <button
            onClick={() => setCompareList([])}
            className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-all"
            title="Limpiar comparación"
          >
            <X className="w-5 h-5" />
          </button>
          <button 
            onClick={() => {
              const compareProducts = products.filter(p => compareList.includes(p.id))
              // Aquí podrías abrir un modal de comparación
              alert(`Comparando ${compareList.length} productos:\n${compareProducts.map(p => `• ${p.name} - $${p.price}`).join('\n')}`)
            }}
            className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 animate-bounce"
          >
            <Package className="w-5 h-5" />
            Comparar ({compareList.length})
          </button>
        </div>
      )}

      {/* Carrito Lateral (Slide-in) */}
      {showCart && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity"
            onClick={() => setShowCart(false)}
          />
          
          {/* Panel del Carrito */}
          <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 overflow-y-auto">
            <div className="p-6">
              {/* Header del carrito */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  🛒 Tu Carrito ({Object.keys(cart).length})
                </h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              
              {/* Lista de items */}
              {getCartItems().length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="mx-auto text-gray-300 mb-4" size={64} />
                  <p className="text-gray-600">Tu carrito está vacío</p>
                  <button
                    onClick={() => setShowCart(false)}
                    className="mt-4 text-blue-600 hover:text-blue-700"
                  >
                    Continuar comprando
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {getCartItems().map((item) => (
                      <div key={item.id} className="flex gap-4 border-b border-gray-200 pb-4">
                        <div className="relative w-16 h-16 bg-gradient-to-br from-blue-100 to-slate-100 rounded flex-shrink-0">
                          {item.imageUrl ? (
                            <Image 
                              src={item.imageUrl} 
                              alt={item.name}
                              fill
                              className="object-cover rounded"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatPrice(item.price)} × {item.quantity}
                          </p>
                          <p className="text-sm font-bold text-blue-600 mt-1">
                            {formatPrice(item.price * item.quantity)}
                          </p>
                          
                          {/* Controles de cantidad en carrito */}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="bg-gray-200 p-1 rounded hover:bg-gray-300"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-medium w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              disabled={item.quantity >= item.stock}
                              className="bg-gray-200 p-1 rounded hover:bg-gray-300 disabled:opacity-50"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-500 h-fit"
                          title="Eliminar del carrito"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total */}
                  <div className="border-t border-gray-200 pt-4 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium text-xs">{formatPrice(getTotalCartPrice())}</span>
                    </div>
                    <div className="flex justify-between items-center font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600 text-lg">{formatPrice(getTotalCartPrice())}</span>
                    </div>
                    
                    <button 
                      onClick={() => {
                        router.push('/buyer/cart')
                      }}
                      className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      Proceder al Pago
                    </button>
                    
                    <button
                      onClick={() => setShowCart(false)}
                      className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Continuar Comprando
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal de detalles del producto */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del modal */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedProduct.name}
              </h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Imagen del producto */}
                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-blue-100 to-slate-100 rounded-xl flex items-center justify-center">
                    <Package className="w-32 h-32 text-slate-400" />
                  </div>
                  
                  {/* Tags */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {selectedProduct.isOffer && (
                      <span className="bg-red-500 text-white text-sm px-3 py-1.5 rounded shadow-lg">
                        🔥 Oferta especial
                      </span>
                    )}
                    {selectedProduct.isNew && (
                      <span className="bg-emerald-500 text-white text-sm px-3 py-1.5 rounded shadow-lg">
                        ✨ Nuevo producto
                      </span>
                    )}
                  </div>
                </div>

                {/* Detalles del producto */}
                <div>
                  <div className="mb-6">
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-3xl font-bold text-blue-600">
                        {formatPrice(selectedProduct.price)}
                      </span>
                      <span className="text-gray-500">/ {selectedProduct.unit}</span>
                    </div>
                    
                    {/* Stock */}
                    <div className="flex items-center gap-2 mb-4">
                      {selectedProduct.stock >= 10 ? (
                        <span className="text-emerald-600 font-medium">
                          ✓ En stock ({selectedProduct.stock} {selectedProduct.unit})
                        </span>
                      ) : selectedProduct.stock > 0 ? (
                        <span className="text-amber-600 font-medium">
                          ⚠️ Últimas {selectedProduct.stock} {selectedProduct.unit}
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium">
                          ✗ Sin stock
                        </span>
                      )}
                    </div>

                    {/* SKU si existe */}
                    {selectedProduct.sku && (
                      <p className="text-sm text-gray-500 mb-4">
                        SKU: {selectedProduct.sku}
                      </p>
                    )}
                  </div>

                  {/* Descripción completa */}
                  {selectedProduct.description && (
                    <div className="mb-6">
                      <h3 className="font-bold text-gray-800 mb-2">Descripción</h3>
                      <p className="text-gray-600 leading-relaxed">
                        {selectedProduct.description}
                      </p>
                    </div>
                  )}

                  {/* Controles de cantidad */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Cantidad
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => updateQuantity(selectedProduct.id, -1)}
                        disabled={(cart[selectedProduct.id] || 0) === 0}
                        className="bg-white border-2 border-gray-300 p-3 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Minus size={20} />
                      </button>
                      <span className="w-20 text-center text-2xl font-bold">
                        {cart[selectedProduct.id] || 0}
                      </span>
                      <button
                        onClick={() => updateQuantity(selectedProduct.id, 1)}
                        disabled={(cart[selectedProduct.id] || 0) >= selectedProduct.stock}
                        className="bg-white border-2 border-gray-300 p-3 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Botón agregar al carrito */}
                  <button
                    onClick={() => {
                      addToCart(selectedProduct.id, cart[selectedProduct.id] || 1)
                      setSelectedProduct(null)
                    }}
                    disabled={(cart[selectedProduct.id] || 0) === 0}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg font-semibold"
                  >
                    Agregar al Carrito
                  </button>
                </div>
              </div>

              {/* Productos relacionados */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  Productos relacionados
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {products
                    .filter(p => 
                      p.id !== selectedProduct.id && 
                      p.category === selectedProduct.category
                    )
                    .slice(0, 4)
                    .map(product => (
                      <div
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="aspect-square bg-gradient-to-br from-blue-100 to-slate-100 rounded-lg flex items-center justify-center mb-2">
                          <Package className="w-12 h-12 text-slate-400" />
                        </div>
                        <h4 className="font-medium text-sm text-gray-800 line-clamp-2 mb-1">
                          {product.name}
                        </h4>
                        <p className="text-blue-600 font-bold text-xs">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}