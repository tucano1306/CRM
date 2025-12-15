'use client'

import { Pencil, Trash2, Package, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProductTag {
  id: string
  label: string
  color: string  // Requerido, no opcional
}

interface Product {
  id: string
  name: string
  sku: string
  price: number
  stock: number
  unit?: string
  productTags?: ProductTag[]
  sales?: number
  categoryId?: string
}

interface ProductCardProps {
  readonly product: Product
  readonly onEdit: (product: Product) => void
  readonly onDelete: (product: Product) => void
  readonly onClick?: (product: Product) => void
}

export default function ProductCard({ product, onEdit, onDelete, onClick }: ProductCardProps) {
  const isLowStock = product.stock < 10
  const isOutOfStock = product.stock === 0

  return (
    <button 
      type="button"
      onClick={() => onClick?.(product)}
      className="w-full text-left bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 cursor-pointer group p-0"
    >
      {/* Header con gradiente */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-1 line-clamp-1">{product.name}</h2>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <Package className="h-4 w-4" />
              <span>SKU: {product.sku}</span>
            </div>
          </div>
          
          {/* Badge de stock */}
          {isOutOfStock && (
            <span className="px-2 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
              Agotado
            </span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-semibold rounded-full">
              Bajo Stock
            </span>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        {/* Precio y Stock */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Precio</span>
            </div>
            <p className="text-xl font-bold text-green-700">${product.price.toFixed(2)}</p>
            {product.unit && (
              <p className="text-xs text-green-600 mt-1">por {product.unit}</p>
            )}
          </div>

          <div className={`rounded-lg p-3 ${(() => {
            if (isOutOfStock) return 'bg-red-50';
            if (isLowStock) return 'bg-yellow-50';
            return 'bg-blue-50';
          })()}`}>
            <div className={`flex items-center gap-2 mb-1 ${(() => {
              if (isOutOfStock) return 'text-red-600';
              if (isLowStock) return 'text-yellow-600';
              return 'text-blue-600';
            })()}`}>
              {isOutOfStock || isLowStock ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <Package className="h-4 w-4" />
              )}
              <span className="text-xs font-medium">Stock</span>
            </div>
            <p className={`text-xl font-bold ${(() => {
              if (isOutOfStock) return 'text-red-700';
              if (isLowStock) return 'text-yellow-700';
              return 'text-blue-700';
            })()}`}>
              {product.stock}
            </p>
            {product.unit && (
              <p className={`text-xs mt-1 ${
                isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-blue-600'
              }`}>
                {product.unit}s
              </p>
            )}
          </div>
        </div>

        {/* Ventas */}
        {product.sales !== undefined && (
          <div className="bg-purple-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Ventas</span>
            </div>
            <p className="text-lg font-bold text-purple-700">{product.sales} unidades</p>
          </div>
        )}

        {/* Tags con colores */}
        {product.productTags && product.productTags.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {product.productTags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 text-xs rounded-full text-white font-medium"
                  style={{ backgroundColor: tag.color || '#6B7280' }}
                >
                  {tag.label}
                </span>
              ))}
              {product.productTags.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  +{product.productTags.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-2 pt-3 border-t">
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(product)
            }}
            variant="outline"
            size="sm"
            className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Editar
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(product)
            }}
            variant="outline"
            size="sm"
            className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  )
}
