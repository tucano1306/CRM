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
  AlertCircle
} from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { ProductCardSkeleton } from '@/components/skeletons'

interface Product {
  id: string
  name: string
  description: string
  unit: string
  price: number
  stock: number
  isActive: boolean
  sku: string | null  // ← CORREGIDO
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

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithStats[]>([])
  const [productStats, setProductStats] = useState<ProductStats[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'pk',
    price: '',
    stock: '',
    sku: ''  // ← AGREGADO
  })

  useEffect(() => {
    fetchProducts()
    fetchProductStats()
  }, [])

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
        setProducts(productsArray)
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

  // Filtrar productos por búsqueda
  console.log('🔎 Estado de products antes de filtrar:', products)
  console.log('🔎 Cantidad en state:', products.length)
  console.log('🔎 Query de búsqueda actual:', searchQuery)

  const filteredProducts = Array.isArray(products)
    ? products.filter((product) => {
        const searchLower = searchQuery.toLowerCase().trim()
        if (!searchLower) return true

        const name = (product.name || '').toLowerCase()
        const description = (product.description || '').toLowerCase()
        const sku = (product.sku || '').toLowerCase()
        const unit = (product.unit || '').toLowerCase()

        const match = (
          name.includes(searchLower) ||
          description.includes(searchLower) ||
          sku.includes(searchLower) ||
          unit.includes(searchLower)
        )

        console.log('🔍 Comparando:', {
          searchLower,
          productData: { name, description, sku, unit },
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

        {/* Barra de búsqueda */}
        <div className="mb-6">
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre, descripción, SKU o unidad..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Indicador de resultados */}
          {searchQuery && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <Box className="h-4 w-4" />
              <span>
                {filteredProducts.length === 0 ? (
                  'No se encontraron productos'
                ) : (
                  <>
                    Mostrando {filteredProducts.length} de {products.length} producto
                    {filteredProducts.length !== 1 ? 's' : ''}
                  </>
                )}
              </span>
              {filteredProducts.length > 0 && searchQuery && (
                <button
                  onClick={clearSearch}
                  className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ver todos
                </button>
              )}
            </div>
          )}
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
                      className="flex-1 gap-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
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
      </div>
    </MainLayout>
  )
}