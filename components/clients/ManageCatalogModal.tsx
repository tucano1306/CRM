'use client'

import { useState, useEffect } from 'react'
import { X, Search, Plus, Package, DollarSign, Eye, EyeOff, Save, Trash2, Edit3, Image as ImageIcon } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface ClientProduct {
  clientProductId: string
  productId: string
  name: string
  description: string | null
  basePrice: number
  customPrice: number
  stock: number
  unit: string
  category: string
  imageUrl: string | null
  sku: string | null
  isActive: boolean
  isVisible: boolean
  notes: string | null
}

interface ManageCatalogModalProps {
  isOpen: boolean
  onClose: () => void
  clientId: string
  clientName: string
  onSuccess?: () => void
}

const CATEGORIES = [
  'FRUTAS',
  'VERDURAS', 
  'LACTEOS',
  'CARNES',
  'MARISCOS',
  'BEBIDAS',
  'PANADERIA',
  'ABARROTES',
  'LIMPIEZA',
  'OTROS'
]

const UNITS = [
  { value: 'unit', label: 'Unidad' },
  { value: 'kg', label: 'Kilogramo' },
  { value: 'lb', label: 'Libra' },
  { value: 'case', label: 'Caja' },
  { value: 'pack', label: 'Paquete' },
  { value: 'dozen', label: 'Docena' },
  { value: 'liter', label: 'Litro' },
  { value: 'gallon', label: 'Galón' },
]

export default function ManageCatalogModal({ 
  isOpen, 
  onClose, 
  clientId, 
  clientName,
  onSuccess 
}: ManageCatalogModalProps) {
  const [activeTab, setActiveTab] = useState<'catalog' | 'create'>('catalog')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientProducts, setClientProducts] = useState<ClientProduct[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({})
  
  // Estado para crear nuevo producto
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    stock: '100',
    unit: 'unit',
    category: 'OTROS',
    sku: '',
    imageUrl: '',
  })

  useEffect(() => {
    if (isOpen) {
      fetchClientCatalog()
      // Reset form when opening
      setNewProduct({
        name: '',
        description: '',
        price: '',
        stock: '100',
        unit: 'unit',
        category: 'OTROS',
        sku: '',
        imageUrl: '',
      })
    }
  }, [isOpen, clientId])

  const fetchClientCatalog = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clients/${clientId}/products`)
      const data = await response.json()

      if (data.success) {
        setClientProducts(data.data.products)
        console.log(`✅ Cargados ${data.data.products.length} productos del catálogo`)
      }
    } catch (error) {
      console.error('Error cargando catálogo:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert('Nombre y precio son obligatorios')
      return
    }

    try {
      setSaving(true)

      // 1. Crear el producto en la base de datos
      const createResponse = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description || null,
          price: parseFloat(newProduct.price),
          stock: parseInt(newProduct.stock) || 100,
          unit: newProduct.unit,
          category: newProduct.category,
          sku: newProduct.sku || null,
          imageUrl: newProduct.imageUrl || null,
          isActive: true,
        })
      })

      const createData = await createResponse.json()

      if (!createData.success) {
        throw new Error(createData.error || 'Error creando producto')
      }

      const productId = createData.data.id

      // 2. Asignar el producto a este cliente
      const assignResponse = await fetch(`/api/clients/${clientId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: [{
            productId,
            customPrice: parseFloat(newProduct.price),
            isVisible: true,
          }]
        })
      })

      const assignData = await assignResponse.json()

      if (assignData.success) {
        console.log(`✅ Producto "${newProduct.name}" creado y asignado a ${clientName}`)
        
        // Reset form
        setNewProduct({
          name: '',
          description: '',
          price: '',
          stock: '100',
          unit: 'unit',
          category: 'OTROS',
          sku: '',
          imageUrl: '',
        })
        
        // Refresh catalog and switch to catalog tab
        await fetchClientCatalog()
        setActiveTab('catalog')
        
        if (onSuccess) onSuccess()
      } else {
        throw new Error(assignData.error || 'Error asignando producto')
      }
    } catch (error) {
      console.error('Error creando producto:', error)
      alert(error instanceof Error ? error.message : 'Error creando producto')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePrice = async (productId: string, newPrice: number) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPrice: newPrice })
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ Precio actualizado: ${data.data.name} = $${newPrice}`)
        await fetchClientCatalog()
        setEditingPrices(prev => {
          const updated = { ...prev }
          delete updated[productId]
          return updated
        })
        if (onSuccess) onSuccess()
      } else {
        alert(data.error || 'Error actualizando precio')
      }
    } catch (error) {
      console.error('Error actualizando precio:', error)
      alert('Error actualizando precio')
    }
  }

  const handleToggleVisibility = async (productId: string, currentVisible: boolean) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isVisible: !currentVisible })
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ Visibilidad cambiada: ${data.data.name}`)
        await fetchClientCatalog()
        if (onSuccess) onSuccess()
      } else {
        alert(data.error || 'Error cambiando visibilidad')
      }
    } catch (error) {
      console.error('Error cambiando visibilidad:', error)
      alert('Error cambiando visibilidad')
    }
  }

  const handleRemoveProduct = async (productId: string, productName: string) => {
    if (!confirm(`¿Eliminar "${productName}" del catálogo de ${clientName}?`)) return

    try {
      const response = await fetch(`/api/clients/${clientId}/products/${productId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ Producto eliminado: ${productName}`)
        await fetchClientCatalog()
        if (onSuccess) onSuccess()
      } else {
        alert(data.error || 'Error eliminando producto')
      }
    } catch (error) {
      console.error('Error eliminando producto:', error)
      alert('Error eliminando producto')
    }
  }

  const filteredProducts = clientProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-4 sm:p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold truncate">Catálogo de Productos</h2>
              <p className="text-purple-100 mt-1 text-sm sm:text-base truncate">Cliente: {clientName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 sm:mt-6">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                activeTab === 'catalog'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              📦 Catálogo ({clientProducts.length})
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 sm:px-6 py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base ${
                activeTab === 'create'
                  ? 'bg-white text-purple-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Crear Producto</span>
              <span className="sm:hidden">Nuevo</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
          {activeTab === 'catalog' ? (
            // TAB: Catálogo actual
            <div>
              {/* Search */}
              <div className="mb-4 sm:mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm sm:text-base"
                  />
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
                  <p className="text-gray-500 mt-4">Cargando catálogo...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-2">
                    {searchTerm ? 'No se encontraron productos' : 'Sin productos asignados'}
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    Crea productos para este cliente en la pestaña "Crear Producto"
                  </p>
                  <Button
                    onClick={() => setActiveTab('create')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Primer Producto
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.productId}
                      className={`border-2 rounded-xl p-3 sm:p-4 transition-all ${
                        product.isVisible
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                        {/* Image */}
                        <div className="w-full sm:w-16 h-24 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-gray-300" />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-800 truncate">{product.name}</h4>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {product.sku && (
                                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                                    {product.sku}
                                  </span>
                                )}
                                <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                  {product.category}
                                </span>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleToggleVisibility(product.productId, product.isVisible)}
                                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                                  product.isVisible
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                title={product.isVisible ? 'Ocultar' : 'Mostrar'}
                              >
                                {product.isVisible ? (
                                  <Eye className="w-4 h-4" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => handleRemoveProduct(product.productId, product.name)}
                                className="p-1.5 sm:p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Price Editor */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              {editingPrices[product.productId] !== undefined ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editingPrices[product.productId]}
                                    onChange={(e) =>
                                      setEditingPrices(prev => ({
                                        ...prev,
                                        [product.productId]: parseFloat(e.target.value) || 0
                                      }))
                                    }
                                    className="w-20 sm:w-24 px-2 py-1 border-2 border-purple-300 rounded-lg text-sm"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() =>
                                      handleUpdatePrice(
                                        product.productId,
                                        editingPrices[product.productId]
                                      )
                                    }
                                    className="p-1 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditingPrices(prev => {
                                        const updated = { ...prev }
                                        delete updated[product.productId]
                                        return updated
                                      })
                                    }
                                    className="p-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() =>
                                    setEditingPrices(prev => ({
                                      ...prev,
                                      [product.productId]: product.customPrice
                                    }))
                                  }
                                  className="text-lg font-bold text-purple-600 hover:text-purple-700 transition-colors flex items-center gap-1"
                                >
                                  {formatPrice(product.customPrice)}
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Stock: {product.stock} {product.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // TAB: Crear nuevo producto
            <div>
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 mb-6">
                <h3 className="font-bold text-purple-800 mb-1">
                  ✨ Crear Producto para {clientName}
                </h3>
                <p className="text-sm text-purple-600">
                  Este producto será exclusivo para este cliente con el precio que definas.
                </p>
              </div>

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Manzana Roja Premium"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={newProduct.description}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción del producto..."
                    rows={2}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  />
                </div>

                {/* Precio y Stock */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Precio *
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="number"
                        step="0.01"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Stock Inicial
                    </label>
                    <input
                      type="number"
                      value={newProduct.stock}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, stock: e.target.value }))}
                      placeholder="100"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                {/* Categoría y Unidad */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Categoría
                    </label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Unidad
                    </label>
                    <select
                      value={newProduct.unit}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                    >
                      {UNITS.map(unit => (
                        <option key={unit.value} value={unit.value}>{unit.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* SKU e Imagen */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      SKU (Opcional)
                    </label>
                    <input
                      type="text"
                      value={newProduct.sku}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="Ej: MANZ-001"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      URL de Imagen (Opcional)
                    </label>
                    <div className="relative">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={newProduct.imageUrl}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, imageUrl: e.target.value }))}
                        placeholder="https://..."
                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Botón Crear */}
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleCreateProduct}
                    disabled={saving || !newProduct.name || !newProduct.price}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 py-3 text-lg font-semibold"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 mr-2" />
                        Crear Producto para {clientName}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
