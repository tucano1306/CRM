'use client'

import { useState } from 'react'
import { X, Package, ShoppingCart, History, Settings, Trash2, RefreshCw, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import OrderStatusHistory from '@/components/orders/OrderStatusHistory'
import OrderStatusChanger from '@/components/orders/OrderStatusChanger'

type OrderStatus = 
  | 'PENDING' 
  | 'REVIEWING'
  | 'ISSUE_REPORTED'
  | 'LOCKED'
  | 'CONFIRMED' 
  | 'PREPARING'
  | 'READY_FOR_PICKUP'
  | 'IN_DELIVERY'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'COMPLETED' 
  | 'CANCELED'
  | 'PAYMENT_PENDING'
  | 'PAID'

interface OrderItem {
  id: string
  productId?: string
  productName: string
  quantity: number
  pricePerUnit: number
  subtotal: number
  itemNote?: string | null
  // Campos de eliminación/sustitución
  isDeleted?: boolean
  deletedReason?: string | null
  deletedAt?: string | null
  substitutedWith?: string | null
  substituteName?: string | null
  product: {
    id?: string
    sku?: string | null
    unit: string
    stock?: number
  }
  // Para tracking de issues
  hasIssue?: boolean
  issueType?: 'OUT_OF_STOCK' | 'PARTIAL_STOCK'
  availableQty?: number
}

interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  notes: string | null
  deliveryInstructions: string | null
  createdAt: string
  client?: {
    id?: string
    name: string
    businessName?: string
    email: string
    phone: string
    address: string
  }
  seller?: {
    id?: string
    name: string
    email: string
    phone?: string
  }
  orderItems: OrderItem[]
  hasIssues?: boolean
  issues?: Array<{
    id: string
    productName: string
    issueType: string
    requestedQty: number
    availableQty: number
    status: string
  }>
}

interface OrderDetailModalProps {
  readonly order: Order
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly userRole?: 'seller' | 'buyer' | 'admin'
  readonly onStatusChange?: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<void>
  readonly onRemoveProduct?: (orderId: string, itemId: string) => Promise<void>
  readonly onSubstituteProduct?: (orderId: string, itemId: string, newProductId: string, newQty: number) => Promise<void>
}

type TabType = 'details' | 'products' | 'history' | 'status'

export default function OrderDetailModal({ 
  order, 
  isOpen, 
  onClose,
  userRole = 'buyer',
  onStatusChange,
  onRemoveProduct,
  onSubstituteProduct
}: OrderDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [removingItem, setRemovingItem] = useState<string | null>(null)
  const [updatingQty, setUpdatingQty] = useState<string | null>(null)

  if (!isOpen) return null

  // Tabs disponibles - sin Factura, con Estado (solo para sellers)
  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'details', label: 'Detalles', icon: Package },
    { id: 'products', label: 'Productos', icon: ShoppingCart },
    { id: 'history', label: 'Historial', icon: History },
    ...(userRole === 'seller' ? [{ id: 'status' as TabType, label: 'Estado', icon: Settings }] : [])
  ]

  // Mapear issues a productos
  const getProductIssue = (productName: string) => {
    return order.issues?.find(issue => issue.productName === productName)
  }

  // Manejar eliminación de producto
  const handleRemoveProduct = async (itemId: string) => {
    if (!onRemoveProduct) return
    try {
      setRemovingItem(itemId)
      await onRemoveProduct(order.id, itemId)
    } catch (error) {
      console.error('Error removing product:', error)
      alert('Error al eliminar el producto')
    } finally {
      setRemovingItem(null)
    }
  }

  // Manejar actualización de cantidad
  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    setUpdatingQty(itemId)
    setTimeout(() => setUpdatingQty(null), 500)
  }

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ zIndex: 9999999 }}>
      {/* Backdrop */}
      <button 
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity border-0 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl">
        <Card className="h-full rounded-none shadow-2xl">
          {/* Header - Compacto */}
          <div className="flex items-center justify-between border-b px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="flex items-center gap-3">
              <span className="text-xl">📦</span>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  #{order.orderNumber?.replace('ORD-', '').slice(-6) || order.id.slice(0, 6)}
                </h2>
                <p className="text-xs text-gray-600">
                  {new Date(order.createdAt).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {order.hasIssues && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  Issues
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="hover:bg-white/50"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Tabs - Grid para móvil */}
          <div className="border-b bg-gray-50 px-2 py-2">
            <div className="grid grid-cols-4 gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex flex-col items-center gap-1 px-2 py-2 font-medium transition-colors rounded-lg text-xs
                      ${activeTab === tab.id
                        ? 'text-purple-600 bg-purple-100'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="truncate">{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-[calc(100vh-200px)] p-6">
            {/* TAB: Detalles */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {order.client && (
                  <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border overflow-hidden">
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Información del Cliente</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div className="min-w-0">
                        <p className="text-gray-600 text-xs sm:text-sm">Nombre</p>
                        <p className="font-semibold truncate">{order.client.name}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-600 text-xs sm:text-sm">Email</p>
                        <p className="font-semibold truncate text-xs sm:text-sm">{order.client.email}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-600 text-xs sm:text-sm">Teléfono</p>
                        <p className="font-semibold">{order.client.phone}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-600 text-xs sm:text-sm">Dirección</p>
                        <p className="font-semibold truncate">{order.client.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                {order.seller && (
                  <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border overflow-hidden">
                    <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Información del Vendedor</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                      <div className="min-w-0">
                        <p className="text-gray-600 text-xs sm:text-sm">Nombre</p>
                        <p className="font-semibold truncate">{order.seller.name}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-600 text-xs sm:text-sm">Email</p>
                        <p className="font-semibold truncate text-xs sm:text-sm">{order.seller.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {order.notes && (
                  <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                    <h4 className="font-semibold text-yellow-900 mb-2">Notas</h4>
                    <p className="text-sm text-yellow-800">{order.notes}</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: Productos */}
            {activeTab === 'products' && (
              <div className="space-y-3">
                {order.orderItems.map((item) => {
                  const issue = getProductIssue(item.productName)
                  const hasIssue = !!issue
                  const isOutOfStock = issue?.issueType === 'OUT_OF_STOCK'
                  const isPartialStock = issue?.issueType === 'PARTIAL_STOCK'
                  const isDeleted = item.isDeleted
                  const wasSubstituted = item.substitutedWith

                  // Renderizar item eliminado de forma especial
                  if (isDeleted) {
                    return (
                      <div 
                        key={item.id} 
                        className="bg-gray-100 rounded-lg shadow-sm p-4 border border-gray-300 opacity-75"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4 text-gray-500" />
                              <p className="font-semibold text-gray-500 line-through">{item.productName}</p>
                              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">
                                ELIMINADO
                              </span>
                            </div>
                            
                            {item.product.sku && (
                              <p className="text-xs text-gray-400 font-mono ml-6 line-through">SKU: {item.product.sku}</p>
                            )}
                            
                            <p className="text-sm text-gray-400 mt-1 ml-6 line-through">
                              {item.quantity} {item.product.unit} × {formatPrice(Number(item.pricePerUnit))}
                            </p>

                            {/* Motivo de eliminación */}
                            {item.deletedReason && (
                              <div className="mt-2 ml-6 p-2 bg-gray-200 rounded text-sm">
                                <span className="font-medium text-gray-700">📝 Motivo del comprador:</span>
                                <p className="text-gray-600 mt-1 italic">"{item.deletedReason}"</p>
                              </div>
                            )}

                            {/* Si fue sustituido */}
                            {wasSubstituted && item.substituteName && (
                              <div className="mt-2 ml-6 p-2 bg-blue-50 rounded border border-blue-200 text-sm">
                                <span className="font-medium text-blue-800">🔄 Sustituido por:</span>
                                <p className="text-blue-700 font-semibold">{item.substituteName}</p>
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-400 line-through">
                              {formatPrice(item.quantity * Number(item.pricePerUnit))}
                            </p>
                            <p className="text-xs text-gray-500">
                              {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  const borderClass = (() => {
                    if (isOutOfStock) return 'border-red-300 bg-red-50';
                    if (isPartialStock) return 'border-amber-300 bg-amber-50';
                    return '';
                  })();

                  return (
                    <div 
                      key={item.id} 
                      className={`bg-white rounded-lg shadow-sm p-4 border transition-all ${borderClass}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {(() => {
                              if (!hasIssue) return <CheckCircle className="h-4 w-4 text-green-500" />;
                              if (isOutOfStock) return <X className="h-4 w-4 text-red-500" />;
                              return <AlertTriangle className="h-4 w-4 text-amber-500" />;
                            })()}
                            <p className="font-semibold text-gray-900">{item.productName}</p>
                          </div>
                          
                          {item.product.sku && (
                            <p className="text-xs text-gray-500 font-mono ml-6">SKU: {item.product.sku}</p>
                          )}
                          
                          <p className="text-sm text-gray-600 mt-1 ml-6">
                            {item.quantity} {item.product.unit} × {formatPrice(Number(item.pricePerUnit))}
                          </p>

                          {/* Mostrar issue */}
                          {hasIssue && (
                            <div className={`mt-2 ml-6 p-2 rounded text-sm ${
                              isOutOfStock ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {isOutOfStock ? (
                                <span>❌ Sin stock disponible</span>
                              ) : (
                                <span>⚠️ Solo {issue?.availableQty} de {issue?.requestedQty} disponibles</span>
                              )}
                            </div>
                          )}

                          {item.itemNote && (
                            <div className="mt-2 ml-6 p-2 bg-blue-50 rounded border border-blue-200">
                              <p className="text-xs font-medium text-blue-900">Nota:</p>
                              <p className="text-sm text-blue-800">{item.itemNote}</p>
                            </div>
                          )}
                        </div>

                        <div className="text-right flex flex-col items-end gap-2">
                          <p className={`text-lg font-bold ${hasIssue ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {formatPrice(Number(item.subtotal))}
                          </p>

                          {/* Botones de acción para productos con problemas */}
                          {hasIssue && userRole === 'seller' && (
                            <div className="flex gap-2">
                              {isPartialStock && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateQuantity(item.id, issue?.availableQty || 0)}
                                  disabled={updatingQty === item.id}
                                  className="text-xs h-8 px-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                                >
                                  {updatingQty === item.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <>
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      Ajustar a {issue?.availableQty}
                                    </>
                                  )}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRemoveProduct(item.id)}
                                disabled={removingItem === item.id}
                                className="text-xs h-8 px-2 border-red-300 text-red-700 hover:bg-red-100"
                              >
                                {removingItem === item.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Eliminar
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Total */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-lg">Total</span>
                    <span className="font-bold text-green-600 text-2xl">
                      {formatPrice(Number(order.totalAmount))}
                    </span>
                  </div>
                  {order.hasIssues && (
                    <p className="text-xs text-gray-500 mt-2">
                      * El total puede cambiar según los ajustes realizados
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: Historial */}
            {activeTab === 'history' && (
              <div className="space-y-4">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-900 mb-1 flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Historial de Cambios de Estado
                  </h3>
                  <p className="text-sm text-purple-700">
                    Seguimiento completo de todos los cambios realizados en esta orden
                  </p>
                </div>

                {/* Componente de Historial */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <OrderStatusHistory orderId={order.id} />
                </div>
              </div>
            )}

            {/* TAB: Estado (solo vendedores) */}
            {activeTab === 'status' && userRole === 'seller' && onStatusChange && (
              <div className="space-y-4">
                {/* Estado actual */}
                <div className="bg-white rounded-lg shadow-sm p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-gray-700">Estado actual:</p>
                    <p className="text-base font-bold text-purple-600 capitalize">
                      {order.status.replaceAll('_', ' ').toLowerCase()}
                    </p>
                  </div>
                  
                  <OrderStatusChanger
                    orderId={order.id}
                    currentStatus={order.status}
                    onStatusChange={(newStatus, notes) => onStatusChange(order.id, newStatus, notes)}
                    userRole={userRole}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
