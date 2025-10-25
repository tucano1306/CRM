'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiCall, getErrorMessage } from '@/lib/api-client'
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
  const [priceRange, setPriceRange] = useState([0, 100])
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
  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId)
      } else {
        newFavorites.add(productId)
      }
      return newFavorites
    })
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
  ]

  useEffect(() => {
    fetchProducts()
  }, [])

  // ✅ fetchProducts CON TIMEOUT
  const fetchProducts = async () => {
    try {
      setLoading(true)
      setTimedOut(false)
      setError(null)

      const result = await apiCall('/api/buyer/products', {
        timeout: 5000,
        onTimeout: () => setTimedOut(true)
      })

      setLoading(false)

      if (result.success) {
        setProducts(result.data.data || [])
      } else {
        setError(result.error || 'Error cargando productos')
      }
    } catch (err) {
      setLoading(false)
      setError(getErrorMessage(err))
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

  const updateQuantity = (productId: string, change: number) => {
    const current = cart[productId] || 0
    const newQuantity = Math.max(0, current + change)
    setCart({ ...cart, [productId]: newQuantity })
  }

  const removeFromCart = (productId: string) => {
    const product = products.find(p => p.id === productId)
    const newCart = { ...cart }
    delete newCart[productId]
    setCart(newCart)
    if (product) {
      showToast(`${product.name} eliminado del carrito`, 'info')
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
    
    if (value.trim().length >= 2) {
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

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    
    // Filtros avanzados
    const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1]
    const matchesStock = !onlyInStock || product.stock > 0
    const matchesUnit = selectedUnits.length === 0 || selectedUnits.includes(product.unit)
    
    return matchesSearch && matchesCategory && matchesPrice && matchesStock && matchesUnit
  })

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
    return products.filter(p => p.category === categoryId).length
  }

  // ✅ UI States
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <Package className="text-blue-600" size={32} />
              Catálogo de Productos
            </h1>
            <p className="text-gray-600 mt-1">Cargando productos...</p>
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
        <div className="max-w-md mx-auto mt-8 bg-amber-50 border border-amber-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-amber-600" />
            <h2 className="text-xl font-bold text-amber-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-4">
            La carga del catálogo está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchProducts}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
        <div className="max-w-md mx-auto mt-8 bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchProducts}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Package className="text-blue-600" size={32} />
                Catálogo de Productos
              </h1>
              <p className="text-gray-600 mt-1">
                {sortedProducts.length} productos disponibles
              </p>
            </div>
            <button
              onClick={() => setShowCart(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <ShoppingCart size={20} />
              Ver Carrito ({Object.keys(cart).length})
            </button>
          </div>

          {/* Buscador, Ordenamiento y Vista */}
          <div className="mt-6 flex flex-col md:flex-row gap-4">
            {/* Buscador con sugerencias */}
            <div className="flex-1 relative">
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              
              {/* Sugerencias */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-b-lg mt-1 z-20 border border-gray-200">
                  <div className="p-2">
                    <p className="text-xs text-gray-500 mb-2 px-2">Sugerencias</p>
                    {suggestions.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => selectSuggestion(product)}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 rounded flex items-center gap-3 transition-colors"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-slate-100 rounded flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            ${product.price.toFixed(2)} / {product.unit}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Botón de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                showFilters 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={20} />
              Filtros
            </button>

            {/* Ordenamiento */}
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Vista en cuadrícula"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="Vista en lista"
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filtros de categoría */}
          <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.emoji} {category.name} ({getCategoryCount(category.id)})
              </button>
            ))}
          </div>
        </div>

        {/* Layout con Sidebar de Filtros y Productos */}
        <div className="flex gap-6">
          {/* Sidebar de Filtros Avanzados */}
          {showFilters && (
            <div className="w-72 flex-shrink-0">
              <div className="bg-white p-6 rounded-xl shadow-lg sticky top-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-gray-800">Filtros Avanzados</h3>
                  <button
                    onClick={() => {
                      setPriceRange([0, 100])
                      setOnlyInStock(false)
                      setSelectedUnits([])
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
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

          {/* Contenedor de productos */}
          <div className="flex-1">
            {/* Grid/Lista de productos */}
            <div className={
          viewMode === 'grid' 
            ? 'grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'flex flex-col gap-4'
        }>
          {sortedProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all group ${
                viewMode === 'grid' ? 'cursor-pointer' : 'cursor-pointer flex flex-row'
              }`}
              onClick={() => setSelectedProduct(product)}
            >
              {/* Imagen del producto con tags */}
              <div className={`relative bg-gray-100 overflow-hidden ${
                viewMode === 'grid' ? 'h-48 rounded-t-lg' : 'w-48 h-48'
              }`}>
                {/* Checkbox de comparación */}
                <div className="absolute top-2 left-2 z-20">
                  <input 
                    type="checkbox"
                    checked={compareList.includes(product.id)}
                    onChange={(e) => {
                      e.stopPropagation()
                      toggleCompare(product.id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded border-2 border-white shadow-lg cursor-pointer accent-blue-600"
                    title="Agregar a comparación"
                  />
                </div>

                <img 
                  src={product.imageUrl || '/placeholder-food.jpg'} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br', 'from-blue-100', 'to-slate-100')
                      const packageIcon = document.createElement('div')
                      packageIcon.innerHTML = '<svg class="w-20 h-20 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>'
                      parent.appendChild(packageIcon.firstChild!)
                    }
                  }}
                />
                
                {/* Tags */}
                <div className="absolute top-2 left-12 flex flex-col gap-1 z-10">
                  {product.isOffer && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded shadow-md backdrop-blur-sm">
                      🔥 Oferta
                    </span>
                  )}
                  {product.isNew && (
                    <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded shadow-md backdrop-blur-sm">
                      ✨ Nuevo
                    </span>
                  )}
                  {product.stock < 10 && product.stock > 0 && (
                    <span className="bg-yellow-400 text-black text-xs px-2 py-1 rounded shadow-md backdrop-blur-sm">
                      ⚠️ Últimas unidades
                    </span>
                  )}
                </div>

                {/* Botón de favoritos */}
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(product.id)
                  }}
                  className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-all z-10"
                >
                  <Heart 
                    className={`w-5 h-5 ${favorites.has(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                  />
                </button>
              </div>

              <div className={viewMode === 'grid' ? 'p-6' : 'flex-1 p-6'}>
                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-blue-600">
                    ${product.price.toFixed(2)}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">
                      / {product.unit}
                    </span>
                    {/* Tooltip informativo */}
                    <div className="group relative">
                      <Info className="w-4 h-4 text-gray-400 cursor-help" />
                      <div className="hidden group-hover:block absolute z-30 bg-gray-900 text-white text-xs p-2 rounded shadow-lg -top-2 right-0 transform -translate-y-full w-48">
                        <p className="mb-1">Precio por {product.unit}</p>
                        {product.stock < 10 && product.stock > 0 && (
                          <p className="text-yellow-300">⚠️ Stock limitado</p>
                        )}
                        {product.sku && (
                          <p className="text-gray-300 mt-1">SKU: {product.sku}</p>
                        )}
                        {/* Flecha del tooltip */}
                        <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-gray-900"></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Indicador visual de stock */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Disponibilidad</span>
                    <span className="font-medium">{product.stock} {product.unit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          product.stock > 50 ? 'bg-emerald-500' : 
                          product.stock > 10 ? 'bg-yellow-500' : 
                          product.stock > 0 ? 'bg-red-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${Math.min((product.stock / 100) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuantity(product.id, -1)
                    }}
                    disabled={(cart[product.id] || 0) === 0}
                    className="bg-gray-200 p-2 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center font-bold">
                    {cart[product.id] || 0}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      updateQuantity(product.id, 1)
                    }}
                    disabled={(cart[product.id] || 0) >= product.stock}
                    className="bg-gray-200 p-2 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    addToCart(product.id, cart[product.id] || 1)
                  }}
                  disabled={(cart[product.id] || 0) === 0}
                  className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Agregar al Carrito
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
        <button 
          onClick={() => {
            const compareProducts = products.filter(p => compareList.includes(p.id))
            // Aquí podrías abrir un modal de comparación
            alert(`Comparando ${compareList.length} productos:\n${compareProducts.map(p => `• ${p.name} - $${p.price}`).join('\n')}`)
          }}
          className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 z-40 animate-bounce"
        >
          <Package className="w-5 h-5" />
          Comparar ({compareList.length})
          <button
            onClick={(e) => {
              e.stopPropagation()
              setCompareList([])
            }}
            className="ml-2 bg-blue-700 hover:bg-blue-800 rounded-full p-1"
            title="Limpiar comparación"
          >
            <X className="w-4 h-4" />
          </button>
        </button>
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
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-slate-100 rounded flex items-center justify-center flex-shrink-0">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            ${item.price.toFixed(2)} × {item.quantity}
                          </p>
                          <p className="text-sm font-bold text-blue-600 mt-1">
                            ${(item.price * item.quantity).toFixed(2)}
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
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">${getTotalCartPrice().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>Total:</span>
                      <span className="text-blue-600">${getTotalCartPrice().toFixed(2)}</span>
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
                      <span className="text-4xl font-bold text-blue-600">
                        ${selectedProduct.price.toFixed(2)}
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
                        <p className="text-blue-600 font-bold">
                          ${product.price.toFixed(2)}
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