'use client'

import { useState } from 'react'
import { X, Package, DollarSign, TrendingUp, Tag, Calendar, History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import TagManager from './TagManager'

interface ProductTag {
  id: string
  label: string
  color: string
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
  createdAt?: string
  updatedAt?: string
}

interface ProductModalProps {
  readonly product: Product
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onTagsUpdate?: (tags: ProductTag[]) => void
}

type TabType = 'details' | 'stock' | 'sales' | 'promotions'

export default function ProductModal({ product, isOpen, onClose, onTagsUpdate }: ProductModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [tags, setTags] = useState<ProductTag[]>(
    (product.productTags || []).map(tag => ({
      ...tag,
      color: tag.color || '#6B7280'
    }))
  )

  const handleTagsUpdate = (updatedTags: ProductTag[]) => {
    setTags(updatedTags)
    if (onTagsUpdate) {
      onTagsUpdate(updatedTags)
    }
  }
  if (!isOpen) return null

  const tabs = [
    { id: 'details' as TabType, label: 'Detalles', icon: Package },
    { id: 'stock' as TabType, label: 'Stock', icon: History },
    { id: 'sales' as TabType, label: 'Ventas', icon: TrendingUp },
    { id: 'promotions' as TabType, label: 'Promociones', icon: Tag }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
              <div className="flex items-center gap-4 text-sm opacity-90">
                <span>SKU: {product.sku}</span>
                {product.categoryId && <span>•</span>}
                {product.categoryId && <span>Categoría: {product.categoryId}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-6 py-4 font-medium transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Detalles */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Precio */}
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 mb-2">
                    <DollarSign className="h-5 w-5" />
                    <span className="font-semibold">Precio</span>
                  </div>
                  <p className="text-3xl font-bold text-green-700">${product.price.toFixed(2)}</p>
                  {product.unit && (
                    <p className="text-sm text-green-600 mt-1">por {product.unit}</p>
                  )}
                </div>

                {/* Stock */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Package className="h-5 w-5" />
                    <span className="font-semibold">Stock Disponible</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">{product.stock}</p>
                  {product.unit && (
                    <p className="text-sm text-blue-600 mt-1">{product.unit}s en inventario</p>
                  )}
                </div>
              </div>

              {/* Información adicional */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3">Información General</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">SKU:</span>
                    <span className="font-semibold text-gray-900">{product.sku}</span>
                  </div>
                  {product.unit && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Unidad de medida:</span>
                      <span className="font-semibold text-gray-900">{product.unit}</span>
                    </div>
                  )}
                  {product.createdAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de creación:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(product.createdAt).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  )}
                  {product.updatedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Última actualización:</span>
                      <span className="font-semibold text-gray-900">
                        {new Date(product.updatedAt).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab: Stock */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Stock Actual</h3>
                  <span className={`px-4 py-2 rounded-full font-bold text-lg ${(() => {
                    if (product.stock === 0) return 'bg-red-100 text-red-700';
                    if (product.stock < 10) return 'bg-yellow-100 text-yellow-700';
                    return 'bg-green-100 text-green-700';
                  })()}`}>
                    {product.stock} {product.unit || 'unidades'}
                  </span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${(() => {
                      if (product.stock === 0) return 'bg-red-500';
                      if (product.stock < 10) return 'bg-yellow-500';
                      return 'bg-green-500';
                    })()}`}
                    style={{ width: `${Math.min((product.stock / 100) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {product.stock === 0 && '⚠️ Producto agotado'}
                  {product.stock > 0 && product.stock < 10 && '⚠️ Stock bajo - Considere reabastecer'}
                  {product.stock >= 10 && '✅ Stock suficiente'}
                </p>
              </div>

              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial de Cambios
                </h3>
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>El historial de cambios estará disponible próximamente</p>
                  <p className="text-sm mt-2">Podrás ver todos los movimientos de inventario aquí</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Ventas */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Ventas Registradas</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {product.sales || 0} unidades
                    </p>
                  </div>
                </div>
                {product.sales && product.sales > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600">Ingresos Totales</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${((product.sales || 0) * product.price).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-sm text-gray-600">Precio Promedio</p>
                      <p className="text-xl font-bold text-gray-900">${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Análisis de Ventas</h3>
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Análisis detallado de ventas próximamente</p>
                  <p className="text-sm mt-2">Gráficos, tendencias y estadísticas estarán disponibles aquí</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Promociones */}
          {activeTab === 'promotions' && (
            <div className="space-y-6">
              {/* Etiquetas con colores */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6 border border-orange-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-gray-900">Etiquetas del Producto</h3>
                  </div>
                  <span className="text-sm text-gray-600">
                    {tags.length} etiqueta{tags.length === 1 ? '' : 's'}
                  </span>
                </div>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {tags.map((tag) => (
                      <div
                        key={tag.id}
                        className="px-4 py-2 rounded-lg text-white font-medium shadow-sm flex items-center gap-2"
                        style={{ backgroundColor: tag.color || '#6B7280' }}
                      >
                        <Tag className="h-4 w-4" />
                        <span>{tag.label}</span>
                      </div>
                    ))}
                  </div>
                )}

                <TagManager
                  productId={product.id}
                  product={{
                    id: product.id,
                    stock: product.stock,
                    createdAt: product.createdAt,
                    price: product.price
                  }}
                  currentTags={tags}
                  onTagsUpdate={handleTagsUpdate}
                />
              </div>

              {/* Promociones futuras */}
              <div className="bg-white border rounded-lg p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Promociones Activas
                </h3>
                <div className="text-center py-8 text-gray-500">
                  <Tag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Sistema de promociones próximamente</p>
                  <p className="text-sm mt-2">Podrás crear descuentos y ofertas especiales aquí</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end gap-2">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            Editar Producto
          </Button>
        </div>
      </div>
    </div>
  )
}
