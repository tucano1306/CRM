'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { Package, Plus, Edit, Trash2 } from 'lucide-react'

interface Product {
  id: string;
  name: string;
  description: string;
  unit: 'case' | 'pk';
  price: number;
  stock: number;
  sellerIds: string[];
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    unit: 'case' as 'case' | 'pk',
    price: '',
    stock: ''
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error al cargar productos:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          stock: parseInt(formData.stock)
        }),
      })

      if (response.ok) {
        await fetchProducts()
        setFormData({ name: '', description: '', unit: 'case', price: '', stock: '' })
        setShowForm(false)
      } else {
        alert('Error al crear producto')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al crear producto')
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        const response = await fetch(`/api/products/${id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          await fetchProducts()
        } else {
          alert('Error al eliminar producto')
        }
      } catch (error) {
        console.error('Error:', error)
        alert('Error al eliminar producto')
      }
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        <PageHeader 
          title="Gestión de Productos" 
          description="Administra tu catálogo de productos"
          action={
            <Button 
              onClick={() => setShowForm(!showForm)}
              className="w-full sm:w-auto gap-2"
            >
              <Plus className="h-4 w-4" />
              {showForm ? 'Cancelar' : 'Agregar Producto'}
            </Button>
          }
        />

        {/* Responsive form */}
        {showForm && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                Nuevo Producto
              </CardTitle>
              <CardDescription>Completa la información del producto</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Full width fields */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-700">
                      Nombre del Producto
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: Tomates frescos"
                      className="mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description" className="text-sm font-semibold text-gray-700">
                      Descripción
                    </Label>
                    <Input
                      id="description"
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe el producto brevemente"
                      className="mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Grid layout for smaller fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="unit" className="text-sm font-semibold text-gray-700">
                      Unidad
                    </Label>
                    <select
                      id="unit"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value as 'case' | 'pk' })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    >
                      <option value="case">Caso</option>
                      <option value="pk">Paquete</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="price" className="text-sm font-semibold text-gray-700">
                      Precio ($)
                    </Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      className="mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="stock" className="text-sm font-semibold text-gray-700">
                      Stock
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="0"
                      className="mt-1 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-2 bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Creando...' : 'Crear Producto'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Responsive products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {products.map((product) => (
            <Card key={product.id} className="shadow-lg hover:shadow-xl transition-all duration-200 border-0">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg font-bold text-gray-900 truncate">
                      {product.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-extrabold text-green-600">
                        ${product.price}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                        {product.unit}
                      </span>
                    </div>
                  </div>
                </div>
                <CardDescription className="text-sm text-gray-600 line-clamp-2">
                  {product.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Stock:</span>
                    <span className={`font-semibold ${
                      product.stock > 10 
                        ? 'text-green-600' 
                        : product.stock > 0 
                        ? 'text-orange-600' 
                        : 'text-red-600'
                    }`}>
                      {product.stock}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1 gap-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                    >
                      <Edit className="h-3 w-3" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => deleteProduct(product.id)}
                      className="gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="hidden sm:inline">Eliminar</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty state */}
        {products.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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