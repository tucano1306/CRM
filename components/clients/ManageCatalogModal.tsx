'use client'

import { useState, useEffect } from 'react'
import { X, Search, Plus, Minus, Package, DollarSign, Eye, EyeOff, Save, Trash2, AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  stock: number
  unit: string
  category: string
  imageUrl: string | null
  sku: string | null
  isActive: boolean
}

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

export default function ManageCatalogModal({ 
  isOpen, 
  onClose, 
  clientId, 
  clientName,
  onSuccess 
}: ManageCatalogModalProps) {
  const [step, setStep] = useState<'list' | 'add'>('list')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientProducts, setClientProducts] = useState<ClientProduct[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({})
  const [selectedForAdd, setSelectedForAdd] = useState<Set<string>>(new Set())
  const [customPricesForAdd, setCustomPricesForAdd] = useState<Record<string, number>>({})

  useEffect(() => {
    if (isOpen) {
      fetchClientCatalog()
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

  const fetchAllProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/products')
      const data = await response.json()

      if (data.success) {
        // Filtrar productos que ya están en el catálogo del cliente
        const assignedIds = new Set(clientProducts.map(cp => cp.productId))
        const availableProducts = data.data.data.filter((p: Product) => !assignedIds.has(p.id))
        setAllProducts(availableProducts)
        console.log(`✅ Encontrados ${availableProducts.length} productos disponibles`)
      }
    } catch (error) {
      console.error('Error cargando productos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddProducts = async () => {
    if (selectedForAdd.size === 0) return

    try {
      setSaving(true)
      
      const productsToAdd = Array.from(selectedForAdd).map(productId => {
        const product = allProducts.find(p => p.id === productId)
        return {
          productId,
          customPrice: customPricesForAdd[productId] || product?.price,
          isVisible: true,
        }
      })

      const response = await fetch(`/api/clients/${clientId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productsToAdd })
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ Agregados ${productsToAdd.length} productos al catálogo`)
        setSelectedForAdd(new Set())
        setCustomPricesForAdd({})
        setStep('list')
        await fetchClientCatalog()
        if (onSuccess) onSuccess()
      } else {
        alert(data.error || 'Error asignando productos')
      }
    } catch (error) {
      console.error('Error asignando productos:', error)
      alert('Error asignando productos')
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

  const filteredClientProducts = clientProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredAllProducts = allProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gestionar Catálogo</h2>
              <p className="text-blue-100 mt-1">{clientName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setStep('list')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                step === 'list'
                  ? 'bg-white text-blue-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Catálogo Actual ({clientProducts.length})
            </button>
            <button
              onClick={() => {
                setStep('add')
                fetchAllProducts()
              }}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                step === 'add'
                  ? 'bg-white text-blue-600'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Agregar Productos
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-gray-500 mt-4">Cargando...</p>
            </div>
          ) : step === 'list' ? (
            // Lista del catálogo actual
            <div>
              {filteredClientProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm 
                      ? 'No se encontraron productos'
                      : 'Este cliente no tiene productos asignados'}
                  </p>
                  <Button
                    onClick={() => {
                      setStep('add')
                      fetchAllProducts()
                    }}
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Productos
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClientProducts.map((product) => (
                    <div
                      key={product.productId}
                      className={`border-2 rounded-xl p-4 transition-all ${
                        product.isVisible
                          ? 'border-gray-200 bg-white'
                          : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Image */}
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="font-bold text-gray-800">{product.name}</h4>
                              {product.sku && (
                                <p className="text-xs text-gray-500 font-mono mt-1">
                                  SKU: {product.sku}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleToggleVisibility(product.productId, product.isVisible)}
                                className={`p-2 rounded-lg transition-colors ${
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
                                className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                                title="Eliminar del catálogo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Price Editor */}
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Precio base:</span>
                              <span className="text-sm font-medium text-gray-600">
                                {formatPrice(product.basePrice)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">Precio cliente:</span>
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
                                    className="w-24 px-2 py-1 border-2 border-blue-300 rounded-lg text-sm"
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
                                  className="text-lg font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                  {formatPrice(product.customPrice)}
                                </button>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              Stock: {product.stock} {product.unit}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Agregar productos
            <div>
              {filteredAllProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm
                      ? 'No se encontraron productos disponibles'
                      : 'Todos los productos ya están asignados a este cliente'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAllProducts.map((product) => {
                    const isSelected = selectedForAdd.has(product.id)
                    return (
                      <div
                        key={product.id}
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                        onClick={() => {
                          const newSelected = new Set(selectedForAdd)
                          if (isSelected) {
                            newSelected.delete(product.id)
                            setCustomPricesForAdd(prev => {
                              const updated = { ...prev }
                              delete updated[product.id]
                              return updated
                            })
                          } else {
                            newSelected.add(product.id)
                            setCustomPricesForAdd(prev => ({
                              ...prev,
                              [product.id]: product.price
                            }))
                          }
                          setSelectedForAdd(newSelected)
                        }}
                      >
                        <div className="flex items-start gap-4">
                          {/* Checkbox */}
                          <div className="pt-1">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-300'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>

                          {/* Image */}
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-16 h-16 object-cover rounded-lg"
                            />
                          )}

                          {/* Info */}
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800">{product.name}</h4>
                            {product.sku && (
                              <p className="text-xs text-gray-500 font-mono mt-1">
                                SKU: {product.sku}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-3">
                              <span className="text-sm text-gray-600">
                                Precio base: {formatPrice(product.price)}
                              </span>
                              {isSelected && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Precio cliente:</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={customPricesForAdd[product.id] || product.price}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      setCustomPricesForAdd(prev => ({
                                        ...prev,
                                        [product.id]: parseFloat(e.target.value) || 0
                                      }))
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-24 px-2 py-1 border-2 border-blue-300 rounded-lg text-sm"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Footer para agregar */}
              {selectedForAdd.size > 0 && (
                <div className="sticky bottom-0 left-0 right-0 mt-6 pt-4 border-t-2 bg-white">
                  <div className="flex items-center justify-between">
                    <p className="text-gray-700">
                      {selectedForAdd.size} producto(s) seleccionado(s)
                    </p>
                    <Button
                      onClick={handleAddProducts}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {saving ? 'Guardando...' : 'Agregar al Catálogo'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
