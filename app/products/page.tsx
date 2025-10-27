'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { apiCall } from '@/lib/api-client'
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  ShoppingCart,
  Search,
  X,
  Box,
  Clock,
  AlertCircle,
  CheckCircle,
  TrendingDown,
  Tag as TagIcon,
  SlidersHorizontal,
  List,
  Edit2
} from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { ProductCardSkeleton } from '@/components/skeletons'
import ProductModal from '@/components/products/ProductModal'
import ProductCard from '@/components/products/ProductCard'
import { getStockStatistics } from '@/lib/stockUtils'

interface ProductTag {
  id: string
  label: string
  color: string
}

interface Product {
  id: string
  name: string
  description: string
  unit: string
  category?: string
  price: number
  stock: number
  isActive: boolean
  sku: string
  productTags?: ProductTag[]
  createdAt?: string
}

interface ProductStats {
  productId: string
  productName: string
  totalSold: number
  totalRevenue: number
  ordersCount: number
}

interface ProductWithStats extends Product {
  stats?: ProductStats
}

interface Filters {
  stock: 'all' | 'low' | 'out' | 'normal'
  priceRange: [number, number]
  tag: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithStats[]>([])
  const [productStats, setProductStats] = useState<ProductStats[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStats | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('TODOS')
  
  // Estados para vista de tabla y acciones masivas
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [bulkCategory, setBulkCategory] = useState('')
  const [bulkPriceChange, setBulkPriceChange] = useState({ type: 'increase', value: '0' })
  
  const [filters, setFilters] = useState<Filters>({
    stock: 'all',
    priceRange: [0, 1000],
    tag: ''
  })
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'pk',
    category: 'OTROS',
    price: '',
    stock: '',
    sku: ''
  })

  // Categorías con emojis
  const categories = [
    { id: 'TODOS', label: 'Todos', icon: '📦' },
    { id: 'CARNES', label: 'Carnes', icon: '🥩' },
    { id: 'EMBUTIDOS', label: 'Embutidos', icon: '🌭' },
    { id: 'SALSAS', label: 'Salsas', icon: '🍯' },
    { id: 'LACTEOS', label: 'Lácteos', icon: '🥛' },
    { id: 'GRANOS', label: 'Granos', icon: '🌾' },
    { id: 'VEGETALES', label: 'Vegetales', icon: '🥬' },
    { id: 'CONDIMENTOS', label: 'Condimentos', icon: '🧂' },
    { id: 'BEBIDAS', label: 'Bebidas', icon: '🥤' },
    { id: 'PANADERIA', label: 'Panadería', icon: '🍞' },
    { id: 'FRUTAS', label: 'Frutas', icon: '🍎' },
    { id: 'CONGELADOS', label: 'Congelados', icon: '🧊' },
    { id: 'OTROS', label: 'Otros', icon: '📋' }
  ]

  useEffect(() => {
    fetchProducts()
    fetchProductStats()
  }, [])

  // Extraer tags únicos de los productos
  useEffect(() => {
    const tags = new Set<string>()
    products.forEach(p => {
      p.productTags?.forEach(t => tags.add(t.label))
    })
    setAvailableTags(Array.from(tags))
  }, [products])

  const fetchProducts = async () => {
    setLoading(true)
    setError(null)
    setTimedOut(false)

    const timeoutId = setTimeout(() => {
      if (loading) setTimedOut(true)
    }, 5000)

    try {
      console.log('🔍 Llamando a /api/products...')
      
      const result = await apiCall('/api/products?page=1&limit=100', {
        timeout: 10000,
      })

      console.log('📦 Respuesta completa del API:', result)
      console.log('✅ result.success:', result.success)
      console.log('📊 result.data:', result.data)
      console.log('📊 Es array?', Array.isArray(result.data))

      clearTimeout(timeoutId)

      if (result.success) {
        const productsData = result.data?.data || result.data || []
        const productsArray = Array.isArray(productsData) ? productsData : []
        console.log('✅ Productos a guardar:', productsArray)
        console.log('✅ Cantidad de productos:', productsArray.length)
        
        // Cargar tags para cada producto
        const productsWithTags = await Promise.all(
          productsArray.map(async (product: Product) => {
            try {
              const tagsResponse = await fetch(`/api/products/${product.id}/tags`)
              const tagsData = await tagsResponse.json()
              return {
                ...product,
                productTags: (tagsData.tags || []).map((tag: any) => ({
                  ...tag,
                  color: tag.color || '#6B7280'
                }))
              }
            } catch {
              return product
            }
          })
        )
        
        setProducts(productsWithTags)
      } else {
        console.error('❌ Error del API:', result.error)
        setError(result.error || 'Error al cargar productos')
      }
    } catch (err) {
      console.error('❌ Error de conexión:', err)
      clearTimeout(timeoutId)
      setError('Error de conexión')
    } finally {
      setLoading(false)
      setTimedOut(false)
    }
  }

  const fetchProductStats = async () => {
    try {
      console.log('📊 Llamando a /api/products/stats...')
      const result = await apiCall('/api/products/stats', {
        timeout: 10000,
      })

      if (result.success) {
        const statsArray = Array.isArray(result.data) ? result.data : []
        console.log('✅ Estadísticas cargadas:', statsArray.length)
        setProductStats(statsArray)
      }
    } catch (error) {
      console.error('❌ Error al cargar estadísticas:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('📝 [PRODUCTO] Iniciando guardado...', formData)
    
    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products'
      const method = editingId ? 'PUT' : 'POST'
      
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        stock: parseInt(formData.stock),
        sku: formData.sku || null
      }
      
      console.log(`🔄 [PRODUCTO] ${method} ${url}`, productData)
      
      const result = await apiCall(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
        timeout: 10000,
      })

      console.log('📦 [PRODUCTO] Respuesta del servidor:', result)

      if (result.success) {
        const action = editingId ? 'actualizado' : 'creado'
        console.log(`✅ [PRODUCTO] Producto ${action} exitosamente:`, result.data)
        
        // Mostrar mensaje de éxito
        alert(`✅ Producto ${action} exitosamente!\n\nNombre: ${productData.name}\nCategoría: ${productData.category}\nPrecio: $${productData.price}\nStock: ${productData.stock}`)
        
        setShowForm(false)
        setEditingId(null)
        setFormData({ name: '', description: '', unit: 'pk', category: 'OTROS', price: '', stock: '', sku: '' })
        
        // Recargar productos
        await fetchProducts()
        await fetchProductStats()
      } else {
        console.error('❌ [PRODUCTO] Error del servidor:', result.error)
        alert(`❌ Error: ${result.error || 'Error al guardar producto'}`)
      }
    } catch (error) {
      console.error('❌ [PRODUCTO] Error al guardar producto:', error)
      alert(`❌ Error al guardar producto: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setFormData({
      name: product.name,
      description: product.description,
      unit: product.unit,
      category: product.category || 'OTROS',
      price: product.price.toString(),
      stock: product.stock.toString(),
      sku: product.sku || ''
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ name: '', description: '', unit: 'pk', category: 'OTROS', price: '', stock: '', sku: '' })
    setShowForm(false)
  }

  // Funciones de selección múltiple
  const toggleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts)
    if (newSelected.has(productId)) {
      newSelected.delete(productId)
    } else {
      newSelected.add(productId)
    }
    setSelectedProducts(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set())
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)))
    }
  }

  const clearSelection = () => {
    setSelectedProducts(new Set())
    setShowBulkActions(false)
  }

  // Acciones masivas
  const bulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedProducts.size} producto(s)?`)) return

    try {
      const deletePromises = Array.from(selectedProducts).map(id =>
        apiCall(`/api/products/${id}`, { method: 'DELETE', timeout: 5000 })
      )
      
      await Promise.all(deletePromises)
      alert('Productos eliminados exitosamente')
      clearSelection()
      fetchProducts()
      fetchProductStats()
    } catch (error) {
      alert('Error al eliminar productos')
    }
  }

  const bulkUpdateCategory = async () => {
    if (!bulkCategory) {
      alert('Selecciona una categoría')
      return
    }

    try {
      const updatePromises = Array.from(selectedProducts).map(id =>
        apiCall(`/api/products/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: bulkCategory }),
          timeout: 5000
        })
      )
      
      await Promise.all(updatePromises)
      alert(`${selectedProducts.size} producto(s) actualizados`)
      clearSelection()
      fetchProducts()
    } catch (error) {
      alert('Error al actualizar categoría')
    }
  }

  const bulkUpdatePrices = async () => {
    if (!bulkPriceChange.value || parseFloat(bulkPriceChange.value) <= 0) {
      alert('Ingresa un valor válido')
      return
    }

    try {
      const selectedProductsList = products.filter(p => selectedProducts.has(p.id))
      const updatePromises = selectedProductsList.map(product => {
        let newPrice = product.price
        const changeValue = parseFloat(bulkPriceChange.value)
        
        if (bulkPriceChange.type === 'increase') {
          newPrice += changeValue
        } else if (bulkPriceChange.type === 'decrease') {
          newPrice = Math.max(0, newPrice - changeValue)
        } else if (bulkPriceChange.type === 'percentage') {
          newPrice = newPrice * (1 + changeValue / 100)
        }

        return apiCall(`/api/products/${product.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ price: newPrice }),
          timeout: 5000
        })
      })
      
      await Promise.all(updatePromises)
      alert(`Precios de ${selectedProducts.size} producto(s) actualizados`)
      clearSelection()
      fetchProducts()
    } catch (error) {
      alert('Error al actualizar precios')
    }
  }

  const exportSelected = () => {
    const selectedProductsList = products.filter(p => selectedProducts.has(p.id))
    const csvContent = [
      ['Nombre', 'Categoría', 'Precio', 'Stock', 'Unidad', 'SKU'].join(','),
      ...selectedProductsList.map(p => 
        [p.name, p.category, p.price, p.stock, p.unit, p.sku || ''].join(',')
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `productos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }
  
  const deleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const result = await apiCall(`/api/products/${id}`, {
        method: 'DELETE',
        timeout: 5000,
      })

      if (result.success) {
        fetchProducts()
        fetchProductStats()
      } else {
        alert(result.error || 'Error al eliminar producto')
      }
    } catch (error) {
      console.error('Error al eliminar producto:', error)
      alert('Error al eliminar producto')
    }
  }

  // Filtrar productos con múltiples criterios (búsqueda + filtros avanzados)
  console.log('🔎 Estado de products antes de filtrar:', products)
  console.log('🔎 Cantidad en state:', products.length)
  console.log('🔎 Query de búsqueda actual:', searchQuery)

  const filteredProducts = Array.isArray(products)
    ? products.filter((product) => {
        // Filtro de búsqueda por texto
        const searchLower = searchQuery.toLowerCase().trim()
        const searchMatch = !searchLower || (
          (product.name || '').toLowerCase().includes(searchLower) ||
          (product.description || '').toLowerCase().includes(searchLower) ||
          (product.sku || '').toLowerCase().includes(searchLower) ||
          (product.unit || '').toLowerCase().includes(searchLower)
        )

        // Filtro de categoría (case-insensitive)
        const categoryMatch = activeCategory === 'TODOS' || 
          (product.category && product.category.toUpperCase() === activeCategory.toUpperCase())

        // Filtro de stock
        const stockMatch = (() => {
          if (filters.stock === 'all') return true
          if (filters.stock === 'out') return product.stock === 0
          if (filters.stock === 'low') return product.stock > 0 && product.stock < 10
          if (filters.stock === 'normal') return product.stock >= 10
          return true
        })()

        // Filtro de precio
        const priceMatch = product.price >= filters.priceRange[0] && product.price <= filters.priceRange[1]

        // Filtro de tags
        const tagMatch = filters.tag === '' || product.productTags?.some(t => t.label === filters.tag)

        const match = searchMatch && categoryMatch && stockMatch && priceMatch && tagMatch

        console.log('🔍 Comparando:', {
          productName: product.name,
          productCategory: product.category,
          activeCategory,
          searchMatch,
          categoryMatch,
          stockMatch,
          priceMatch,
          tagMatch,
          match
        })

        return match
      })
    : []

  console.log('✅ Productos filtrados:', filteredProducts.length)

  const productsWithStats: ProductWithStats[] = filteredProducts.map(product => {
    const stats = productStats.find(s => s.productId === product.id)
    return { ...product, stats }
  })

  const clearSearch = () => {
    setSearchQuery('')
  }

  // Loading state con skeletons
  if (loading) {
    return (
      <MainLayout>
        <PageHeader
          title="Gestión de Productos"
          description="Cargando productos..."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </MainLayout>
    )
  }

  // Timeout state
  if (timedOut) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-yellow-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-4">
            La carga de productos está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchProducts}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </MainLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <MainLayout>
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
      </MainLayout>
    )
  }

  // Calcular estadísticas de stock
  const stats = getStockStatistics(
    products.map((p) => ({ stock: p.stock, price: p.price }))
  )

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageHeader 
            title="Gestión de Productos" 
            description={`${products.length} productos en catálogo`}
          />
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>

        {/* Tarjetas de Estadísticas de Stock */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Total Productos</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Stock Normal</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.normalStock}</p>
                <p className="text-xs text-green-600 hidden sm:block">
                  {stats.normalStockPercentage.toFixed(0)}% del total
                </p>
              </div>
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Stock Bajo</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.lowStock}</p>
                <p className="text-xs text-yellow-600 hidden sm:block">
                  {stats.lowStockPercentage.toFixed(0)}% del total
                </p>
              </div>
              <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Agotados</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{stats.outOfStock}</p>
                <p className="text-xs text-red-600 hidden sm:block">
                  {stats.outOfStockPercentage.toFixed(0)}% del total
                </p>
              </div>
              <TrendingDown className="h-8 w-8 sm:h-10 sm:w-10 text-red-500 opacity-80" />
            </div>
          </div>
        </div>

        {/* Tabs de Categorías */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                  whitespace-nowrap transition-all transform hover:scale-105
                  ${activeCategory === cat.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span className="text-xl">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats Rápidas por Categoría */}
        {activeCategory !== 'TODOS' && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {filteredProducts.length}
                </p>
                <p className="text-sm text-gray-600">Productos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">
                  ${filteredProducts.reduce((sum, p) => sum + p.price, 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Valor Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredProducts.reduce((sum, p) => sum + p.stock, 0)}
                </p>
                <p className="text-sm text-gray-600">Stock Total</p>
              </div>
            </div>
          </div>
        )}

        {/* Panel de Filtros Avanzados */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Filtros</h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {showFilters ? 'Ocultar' : 'Mostrar'} filtros avanzados
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Búsqueda por texto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, descripción, SKU o unidad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filtro de Stock (siempre visible) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado de Stock</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilters(f => ({ ...f, stock: 'all' }))}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filters.stock === 'all'
                      ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setFilters(f => ({ ...f, stock: 'normal' }))}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filters.stock === 'normal'
                      ? 'bg-green-100 text-green-700 border-2 border-green-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Normal (≥10)
                </button>
                <button
                  onClick={() => setFilters(f => ({ ...f, stock: 'low' }))}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filters.stock === 'low'
                      ? 'bg-yellow-100 text-yellow-700 border-2 border-yellow-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Bajo (&lt;10)
                </button>
                <button
                  onClick={() => setFilters(f => ({ ...f, stock: 'out' }))}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filters.stock === 'out'
                      ? 'bg-red-100 text-red-700 border-2 border-red-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Agotado (0)
                </button>
              </div>
            </div>

            {/* Filtros Avanzados (colapsables) */}
            {showFilters && (
              <div className="space-y-4 pt-4 border-t">
                {/* Rango de Precio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio: $0 - ${filters.priceRange[1]}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={0}
                      max={1000}
                      value={filters.priceRange[1]}
                      onChange={e => setFilters(f => ({ 
                        ...f, 
                        priceRange: [0, Number(e.target.value)] 
                      }))}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-medium text-gray-900 min-w-[80px]">
                      ${filters.priceRange[1]}
                    </span>
                  </div>
                </div>

                {/* Filtro de Etiquetas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <TagIcon className="h-4 w-4" />
                    Etiquetas
                  </label>
                  <select
                    value={filters.tag}
                    onChange={e => setFilters(f => ({ ...f, tag: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Todas las etiquetas</option>
                    {availableTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                  {filters.tag && (
                    <button
                      onClick={() => setFilters(f => ({ ...f, tag: '' }))}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Limpiar filtro de etiquetas
                    </button>
                  )}
                </div>

                {/* Botón Limpiar Todos */}
                <button
                  onClick={() => setFilters({ stock: 'all', priceRange: [0, 1000], tag: '' })}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Limpiar todos los filtros
                </button>
              </div>
            )}

            {/* Indicador de filtros activos */}
            {(filters.stock !== 'all' || filters.tag !== '' || filters.priceRange[1] < 1000 || searchQuery) && (
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-gray-600">
                  Mostrando {filteredProducts.length} de {products.length} productos
                </span>
                <span className="text-blue-600 font-medium">
                  {filters.stock !== 'all' && `Stock: ${filters.stock} `}
                  {filters.tag !== '' && `| Etiqueta: ${filters.tag} `}
                  {filters.priceRange[1] < 1000 && `| Precio hasta: $${filters.priceRange[1]}`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Formulario */}
        {showForm && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>{editingId ? 'Editar Producto' : 'Agregar Nuevo Producto'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Categoría */}
                  <div>
                    <Label htmlFor="category">Categoría *</Label>
                    <select
                      id="category"
                      value={formData.category || 'OTROS'}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      {categories.filter(c => c.id !== 'TODOS').map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="name">Nombre del Producto</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>

                  {/* ← CAMPO SKU AGREGADO */}
                  <div>
                    <Label htmlFor="sku">SKU (Código Único)</Label>
                    <Input
                      id="sku"
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      placeholder="Ej: PIZZA-001"
                    />
                    <p className="text-xs text-gray-500 mt-1">Opcional. Código único para identificar el producto.</p>
                  </div>

                  <div>
                    <Label htmlFor="unit">Unidad de Medida</Label>
                    <select
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="w-full rounded-md border border-input bg-background px-3 py-2"
                      required
                    >
                      <option value="pk">Paquete (pk)</option>
                      <option value="case">Caja (case)</option>
                      <option value="unit">Unidad (unit)</option>
                      <option value="kg">Kilogramo (kg)</option>
                      <option value="lb">Libra (lb)</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="price">Precio</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="stock">Stock Inicial</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={cancelEdit}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingId ? 'Actualizar' : 'Crear Producto'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Toggle Vista Cards/Tabla */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {productsWithStats.length} Producto{productsWithStats.length !== 1 ? 's' : ''}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                viewMode === 'cards'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Package size={18} />
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <List size={18} />
              Tabla
            </button>
          </div>
        </div>

        {/* Vista Tabla */}
        {viewMode === 'table' ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={productsWithStats.length > 0 && selectedProducts.size === productsWithStats.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">SKU</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Precio</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Stock</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Unidad</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {productsWithStats.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">
                          {searchQuery ? 'No se encontraron productos' : 'No hay productos registrados'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    productsWithStats.map((product) => (
                      <tr
                        key={product.id}
                        className={`hover:bg-gray-50 transition-colors ${
                          selectedProducts.has(product.id) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleSelectProduct(product.id)}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {product.sku || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              {product.productTags && product.productTags.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {product.productTags.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="text-xs px-1.5 py-0.5 rounded text-white"
                                      style={{ backgroundColor: tag.color }}
                                    >
                                      {tag.label}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">
                            {categories.find(c => c.id === product.category)?.icon}{' '}
                            {product.category}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold text-green-600">
                            ${product.price.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 rounded text-sm font-medium ${
                              product.stock < 10
                                ? 'bg-red-100 text-red-700'
                                : product.stock < 50
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {product.unit}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => startEdit(product)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Vista Cards */
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {productsWithStats.length === 0 ? (
            <div className="col-span-full">
              <Card>
                <CardContent className="p-12 text-center">
                  <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    {searchQuery ? 'No se encontraron productos' : 'No hay productos registrados'}
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? 'Intenta con otro término de búsqueda'
                      : 'Comienza agregando tu primer producto al catálogo'}
                  </p>
                  {searchQuery ? (
                    <button
                      onClick={clearSearch}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Limpiar búsqueda
                    </button>
                  ) : (
                    <Button onClick={() => setShowForm(true)} className="gap-2 mt-4">
                      <Plus className="h-4 w-4" />
                      Agregar Primer Producto
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            productsWithStats.map((product) => {
              const hasLowStock = product.stock < 10
              const hasStats = product.stats && product.stats.totalSold > 0
              
              return (
                <Card key={product.id} className="shadow-lg hover:shadow-xl transition-all duration-200 border-0">
                  <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-5 w-5 text-blue-600" />
                        <h3 className="font-bold text-lg text-gray-900 truncate">
                          {product.name}
                        </h3>
                      </div>
                      {/* ← MOSTRAR SKU SI EXISTE */}
                      {product.sku && (
                        <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
                      )}
                      
                      {/* Tags del producto */}
                      {product.productTags && product.productTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {product.productTags.slice(0, 3).map((tag) => (
                            <span
                              key={tag.id}
                              className="text-xs px-2 py-1 rounded text-white font-medium"
                              style={{ backgroundColor: tag.color }}
                            >
                              {tag.label}
                            </span>
                          ))}
                          {product.productTags.length > 3 && (
                            <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">
                              +{product.productTags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {product.description}
                      </p>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {product.unit}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-gray-600">Precio</p>
                      </div>
                      <p className="text-xl font-bold text-gray-900">
                        ${product.price.toFixed(2)}
                      </p>
                    </div>

                    <div className={`p-3 rounded-lg ${hasLowStock ? 'bg-red-50' : 'bg-blue-50'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className={`h-4 w-4 ${hasLowStock ? 'text-red-600' : 'text-blue-600'}`} />
                        <p className="text-xs text-gray-600">Stock</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xl font-bold ${hasLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                          {product.stock}
                        </p>
                        {hasLowStock && <AlertTriangle className="h-4 w-4 text-red-600" />}
                      </div>
                    </div>
                  </div>

                  {hasStats ? (
                    <div className="bg-purple-50 p-4 rounded-lg mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                        <p className="text-sm font-semibold text-gray-900">Performance de Ventas</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold text-purple-600">
                            {product.stats!.totalSold}
                          </p>
                          <p className="text-xs text-gray-600">Vendidos</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-green-600">
                            ${Number(product.stats!.totalRevenue).toFixed(0)}
                          </p>
                          <p className="text-xs text-gray-600">Ingresos</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-blue-600">
                            {product.stats!.ordersCount}
                          </p>
                          <p className="text-xs text-gray-600">Órdenes</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 text-center">
                      <ShoppingCart className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Sin ventas registradas</p>
                    </div>
                  )}

                  {hasLowStock && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <p className="text-xs text-orange-800 font-medium">
                          Stock bajo - Considera reabastecer pronto
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
                      onClick={() => {
                        setSelectedProduct(product)
                        setIsModalOpen(true)
                      }}
                    >
                      <Package className="h-3 w-3" />
                      <span>Detalles & Tags</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                      onClick={() => startEdit(product)}
                    >
                      <Edit className="h-3 w-3" />
                      <span>Editar</span>
                    </Button> 
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteProduct(product.id)}
                      className="gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Eliminar</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
          )}
          </div>
        )}

        {/* Panel de Acciones Masivas */}
        {selectedProducts.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white shadow-2xl rounded-xl p-4 z-50 border-2 border-blue-200">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-bold text-blue-600">
                {selectedProducts.size} seleccionado{selectedProducts.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setShowBulkActions(true)}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Cambiar Categoría
              </button>
              <button
                onClick={bulkDelete}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Eliminar
              </button>
              <button
                onClick={exportSelected}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                Exportar CSV
              </button>
              <button
                onClick={clearSelection}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                title="Limpiar selección"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}

        {/* Modal de Cambio de Categoría Masivo */}
        {showBulkActions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-xl font-bold mb-4">Cambiar Categoría</h3>
              <p className="text-gray-600 mb-4">
                Aplicar a {selectedProducts.size} producto{selectedProducts.size !== 1 ? 's' : ''}
              </p>
              <div className="mb-6">
                <Label>Nueva Categoría</Label>
                <select
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full mt-2 px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar...</option>
                  {categories.filter(c => c.id !== 'TODOS').map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkActions(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={bulkUpdateCategory}
                  disabled={!bulkCategory}
                >
                  Aplicar Cambios
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Product Modal con Tags */}
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false)
              setSelectedProduct(null)
            }}
            onTagsUpdate={(updatedTags) => {
              // Actualizar el producto en la lista local
              setProducts(products.map(p => 
                p.id === selectedProduct.id 
                  ? { ...p, productTags: updatedTags }
                  : p
              ))
              // Actualizar el producto seleccionado
              setSelectedProduct({ ...selectedProduct, productTags: updatedTags })
            }}
          />
        )}
      </div>
    </MainLayout>
  )
}