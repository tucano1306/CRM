'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Package, Plus, Edit, Trash2, TrendingUp, AlertTriangle, DollarSign, ShoppingCart } from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'

interface Product {
  id: string
  name: string
  description: string
  unit: string
  price: number
  stock: number
  isActive: boolean
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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'pk',
    price: '',
    stock: ''
  })

  useEffect(() => {
    fetchProducts()
    fetchProductStats()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setProducts(result.data)
        }
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProductStats = async () => {
    try {
      const response = await fetch('/api/analytics/products')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setProductStats(result.data.topSelling || [])
        }
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock)
        })
      })

      if (response.ok) {
        setShowForm(false)
        setFormData({ name: '', description: '', unit: 'pk', price: '', stock: '' })
        fetchProducts()
        fetchProductStats()
      }
    } catch (error) {
      console.error('Error al crear producto:', error)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return

    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' })
      if (response.ok) {
        fetchProducts()
        fetchProductStats()
      }
    } catch (error) {
      console.error('Error al eliminar producto:', error)
    }
  }

  // Combinar productos con sus estadísticas
  const productsWithStats: ProductWithStats[] = products.map(product => {
    const stats = productStats.find(s => s.productId === product.id)
    return { ...product, stats }
  })

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando productos...</p>
          </div>
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
            description="Administra tu catálogo de productos"
          />
          <Button 
            onClick={() => setShowForm(!showForm)}
            className="gap-2 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nuevo Producto
          </Button>
        </div>

        {/* Formulario */}
        {showForm && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle>Agregar Nuevo Producto</CardTitle>
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
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Guardar Producto
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Lista de Productos Mejorada */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {productsWithStats.map((product) => {
            const hasLowStock = product.stock < 10
            const hasStats = product.stats && product.stats.totalSold > 0
            
            return (
              <Card key={product.id} className="shadow-lg hover:shadow-xl transition-all duration-200 border-0">
                <CardContent className="p-6">
                  {/* Header del Producto */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-5 w-5 text-blue-600" />
                        <h3 className="font-bold text-lg text-gray-900 truncate">
                          {product.name}
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {product.description}
                      </p>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {product.unit}
                      </span>
                    </div>
                  </div>

                  {/* Precio y Stock */}
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

                  {/* Estadísticas de Ventas */}
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
                            ${product.stats!.totalRevenue.toFixed(0)}
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

                  {/* Alertas */}
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

                  {/* Botones de Acción */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
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
          })}
        </div>

        {/* Empty state */}
        {products.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">No hay productos registrados</p>
              <p className="text-gray-600 mb-4">Comienza agregando tu primer producto al catálogo</p>
              <Button onClick={() => setShowForm(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Agregar Primer Producto
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}