'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { 
  Search, 
  Plus, 
  Minus, 
  ShoppingCart,
  Package,
  Loader2,
  CheckSquare,
  Square,
  Filter,
  ArrowUpDown,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatPrice } from '@/lib/utils'

interface Product {
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

interface SelectedProduct {
  product: Product
  quantity: number
}

interface ProductListCheckboxProps {
  readonly products: Product[]
  readonly selectedProducts: Map<string, number>  // productId -> quantity
  readonly onSelectionChange: (productId: string, quantity: number) => void
  readonly onRemoveProduct: (productId: string) => void
  readonly loading?: boolean
  readonly showQuantityInput?: boolean
  readonly maxSelections?: number
}

export default function ProductListCheckbox({
  products,
  selectedProducts,
  onSelectionChange,
  onRemoveProduct,
  loading = false,
  showQuantityInput = true,
  maxSelections
}: ProductListCheckboxProps) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [filterCategory, setFilterCategory] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const cats = new Set<string>()
    products.forEach(p => p.category && cats.add(p.category))
    return ['all', ...Array.from(cats)]
  }, [products])

  // Filtrar y ordenar productos
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()))
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory
      return matchesSearch && matchesCategory
    })

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
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [products, search, filterCategory, sortBy, sortOrder])

  const toggleProduct = (product: Product) => {
    if (selectedProducts.has(product.id)) {
      onRemoveProduct(product.id)
    } else {
      if (maxSelections && selectedProducts.size >= maxSelections) {
        alert(`Solo puedes seleccionar ${maxSelections} productos`)
        return
      }
      onSelectionChange(product.id, 1)
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    const currentQty = selectedProducts.get(productId) || 0
    const product = products.find(p => p.id === productId)
    if (!product) return

    const newQty = Math.max(1, Math.min(currentQty + delta, product.stock))
    onSelectionChange(productId, newQty)
  }

  const setQuantity = (productId: string, qty: number) => {
    const product = products.find(p => p.id === productId)
    if (!product) return

    const newQty = Math.max(1, Math.min(qty, product.stock))
    onSelectionChange(productId, newQty)
  }

  const selectedCount = selectedProducts.size
  const totalAmount = useMemo(() => {
    let total = 0
    selectedProducts.forEach((qty, id) => {
      const product = products.find(p => p.id === id)
      if (product) {
        total += product.price * qty
      }
    })
    return total
  }, [selectedProducts, products])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600">Cargando productos...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header con búsqueda y filtros */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar productos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botón de filtros */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filtros
          </Button>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-3 pt-3 border-t">
            {/* Categoría */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas las categorías' : cat}
                </option>
              ))}
            </select>

            {/* Ordenar por */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="name">Ordenar por nombre</option>
              <option value="price">Ordenar por precio</option>
              <option value="stock">Ordenar por stock</option>
            </select>

            {/* Dirección */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-1"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
            </Button>
          </div>
        )}

        {/* Resumen de selección */}
        {selectedCount > 0 && (
          <div className="mt-3 flex items-center justify-between p-3 bg-purple-100 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-900">
                {selectedCount} producto(s) seleccionado(s)
              </span>
            </div>
            <span className="font-bold text-purple-900">
              Total: {formatPrice(totalAmount)}
            </span>
          </div>
        )}
      </div>

      {/* Lista de productos */}
      <div className="divide-y max-h-[60vh] overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          filteredProducts.map(product => {
            const isSelected = selectedProducts.has(product.id)
            const quantity = selectedProducts.get(product.id) || 0
            const outOfStock = product.stock === 0

            return (
              <button 
                type="button"
                key={product.id}
                className={`
                  w-full flex items-center gap-4 p-4 transition-colors cursor-pointer bg-transparent border-0 text-left
                  ${isSelected ? 'bg-purple-50 border-l-4 border-purple-500' : 'hover:bg-gray-50'}
                  ${outOfStock ? 'opacity-50' : ''}
                `}
                onClick={() => !outOfStock && toggleProduct(product)}
                disabled={outOfStock}
              >
                {/* Checkbox */}
                <div className="flex-shrink-0">
                  {isSelected ? (
                    <CheckSquare className="w-6 h-6 text-purple-600" />
                  ) : (
                    <Square className={`w-6 h-6 ${outOfStock ? 'text-gray-300' : 'text-gray-400'}`} />
                  )}
                </div>

                {/* Imagen */}
                <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                  {product.imageUrl ? (
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info del producto */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 truncate">
                        {product.name}
                      </h4>
                      {product.sku && (
                        <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                      )}
                      {product.category && (
                        <span className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded mt-1">
                          {product.category}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">
                        {formatPrice(product.price)}
                      </p>
                      <p className="text-xs text-gray-500">
                        por {product.unit}
                      </p>
                    </div>
                  </div>

                  {/* Stock y cantidad */}
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-sm ${product.stock > 10 ? 'text-green-600' : product.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {outOfStock ? 'Sin stock' : `${product.stock} disponibles`}
                    </span>

                    {/* Control de cantidad */}
                    {isSelected && showQuantityInput && (
                      <div 
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(product.id, -1)}
                          disabled={quantity <= 1}
                          className="h-8 w-8 p-0"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(product.id, Number.parseInt(e.target.value) || 1)}
                          className="w-16 text-center border rounded-lg py-1"
                          min={1}
                          max={product.stock}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(product.id, 1)}
                          disabled={quantity >= product.stock}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>

                        {/* Subtotal */}
                        <span className="text-sm font-medium text-gray-600 ml-2">
                          = {formatPrice(product.price * quantity)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer con total */}
      {selectedCount > 0 && (
        <div className="p-4 border-t bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">{selectedCount} productos</p>
              <p className="text-2xl font-bold">{formatPrice(totalAmount)}</p>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
