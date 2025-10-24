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
  SlidersHorizontal
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
  const [filters, setFilters] = useState<Filters>({
    stock: 'all',
    priceRange: [0, 1000],
    tag: ''
  })
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'pk',
    price: '',
    stock: '',
    sku: ''
  })

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
    
    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products'
      const method = editingId ? 'PUT' : 'POST'
      
      const result = await apiCall(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock),
          sku: formData.sku || null  // ← AGREGADO
        }),
        timeout: 5000,
      })

      if (result.success) {
        setShowForm(false)
        setEditingId(null)
        setFormData({ name: '', description: '', unit: 'pk', price: '', stock: '', sku: '' })  // ← ACTUALIZADO
        fetchProducts()
        fetchProductStats()
      } else {
        alert(result.error || 'Error al guardar producto')
      }
    } catch (error) {
      console.error('Error al guardar producto:', error)
      alert('Error al guardar producto')
    }
  }

  const startEdit = (product: Product) => {
    setEditingId(product.id)
    setFormData({
      name: product.name,
      description: product.description,
      unit: product.unit,
      price: product.price.toString(),
      stock: product.stock.toString(),
      sku: product.sku || ''  // ← AGREGADO
    })
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormData({ name: '', description: '', unit: 'pk', price: '', stock: '', sku: '' })  // ← ACTUALIZADO
    setShowForm(false)
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

        const match = searchMatch && stockMatch && priceMatch && tagMatch

        console.log('🔍 Comparando:', {
          productName: product.name,
          searchMatch,
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Productos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Package className="h-10 w-10 text-blue-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Normal</p>
                <p className="text-2xl font-bold text-gray-900">{stats.normalStock}</p>
                <p className="text-xs text-green-600">
                  {stats.normalStockPercentage.toFixed(0)}% del total
                </p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Bajo</p>
                <p className="text-2xl font-bold text-gray-900">{stats.lowStock}</p>
                <p className="text-xs text-yellow-600">
                  {stats.lowStockPercentage.toFixed(0)}% del total
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-yellow-500 opacity-80" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Agotados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.outOfStock}</p>
                <p className="text-xs text-red-600">
                  {stats.outOfStockPercentage.toFixed(0)}% del total
                </p>
              </div>
              <TrendingDown className="h-10 w-10 text-red-500 opacity-80" />
            </div>
          </div>
        </div>

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

        {/* Lista de Productos */}
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