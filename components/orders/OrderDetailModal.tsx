'use client'

import { useState } from 'react'
import { X, Package, ShoppingCart, Truck, History, FileText, Download, Eye, Loader2 } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import OrderStatusHistory from '@/components/orders/OrderStatusHistory'
import OrderStatusChanger from '@/components/orders/OrderStatusChanger'

type OrderStatus = 
  | 'PENDING' 
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
  product: {
    id?: string
    sku?: string | null
    unit: string
  }
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
  creditNoteUsages?: Array<{
    id: string
    amountUsed: number
    creditNote: {
      id: string
      creditNoteNumber: string
      amount: number
      balance: number
    }
  }>
}

interface OrderDetailModalProps {
  order: Order
  isOpen: boolean
  onClose: () => void
  userRole?: 'seller' | 'buyer'
  onStatusChange?: (orderId: string, newStatus: OrderStatus, notes?: string) => Promise<void>
  onDownloadInvoice?: (order: Order) => Promise<void>
  onViewInvoice?: (order: Order) => Promise<void>
  isGeneratingInvoice?: boolean
}

type TabType = 'details' | 'products' | 'delivery' | 'history' | 'invoice'

export default function OrderDetailModal({ 
  order, 
  isOpen, 
  onClose,
  userRole = 'buyer',
  onStatusChange,
  onDownloadInvoice,
  onViewInvoice,
  isGeneratingInvoice = false
}: OrderDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details')

  if (!isOpen) return null

  const tabs: Array<{ id: TabType; label: string; icon: any }> = [
    { id: 'details', label: 'Detalles', icon: Package },
    { id: 'products', label: 'Productos', icon: ShoppingCart },
    { id: 'delivery', label: 'Entrega', icon: Truck },
    { id: 'history', label: 'Historial', icon: History },
    { id: 'invoice', label: 'Factura', icon: FileText },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl">
        <Card className="h-full rounded-none shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b p-6 bg-gradient-to-r from-purple-50 to-blue-50">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Orden #{order.orderNumber}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {new Date(order.createdAt).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
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

          {/* Tabs */}
          <div className="border-b bg-gray-50">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
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
                {/* Status Changer - Solo para vendedores */}
                {userRole === 'seller' && onStatusChange && (
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-1">
                          Cambiar Estado de la Orden
                        </h4>
                        <p className="text-sm text-gray-600">
                          Actualiza el estado según el progreso de la orden
                        </p>
                      </div>
                      <OrderStatusChanger
                        orderId={order.id}
                        currentStatus={order.status}
                        onStatusChange={(newStatus, notes) => onStatusChange(order.id, newStatus, notes)}
                      />
                    </div>
                  </div>
                )}

                {order.client && (
                  <div className="bg-white rounded-lg shadow-sm p-6 border">
                    <h3 className="text-lg font-semibold mb-4">Información del Cliente</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Nombre</p>
                        <p className="font-semibold">{order.client.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Email</p>
                        <p className="font-semibold">{order.client.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Teléfono</p>
                        <p className="font-semibold">{order.client.phone}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Dirección</p>
                        <p className="font-semibold">{order.client.address}</p>
                      </div>
                    </div>
                  </div>
                )}

                {order.seller && (
                  <div className="bg-white rounded-lg shadow-sm p-6 border">
                    <h3 className="text-lg font-semibold mb-4">Información del Vendedor</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Nombre</p>
                        <p className="font-semibold">{order.seller.name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Email</p>
                        <p className="font-semibold">{order.seller.email}</p>
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
                {order.orderItems.map((item) => (
                  <div key={item.id} className="bg-white rounded-lg shadow-sm p-4 border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{item.productName}</p>
                        {item.product.sku && (
                          <p className="text-xs text-gray-500 font-mono">SKU: {item.product.sku}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                          {item.quantity} {item.product.unit} × {formatPrice(Number(item.pricePerUnit))}
                        </p>
                        {item.itemNote && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <p className="text-xs font-medium text-blue-900">Nota:</p>
                            <p className="text-sm text-blue-800">{item.itemNote}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatPrice(Number(item.subtotal))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-lg">Total</span>
                    <span className="font-bold text-green-600 text-2xl">
                      {formatPrice(Number(order.totalAmount))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Entrega */}
            {activeTab === 'delivery' && (
              <div className="space-y-4">
                {order.deliveryInstructions ? (
                  <div className="bg-white rounded-lg shadow-sm p-6 border">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Truck className="h-5 w-5 text-purple-600" />
                      Instrucciones de Entrega
                    </h3>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {order.deliveryInstructions}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                    <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600">No hay instrucciones de entrega</p>
                  </div>
                )}
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

            {/* TAB: Factura */}
            {activeTab === 'invoice' && (
              <div className="space-y-4">
                {onDownloadInvoice && onViewInvoice ? (
                  <>
                    {/* Resumen de la Orden */}
                    <div className="bg-white rounded-lg shadow-sm p-6 border">
                      <h3 className="text-lg font-semibold mb-4">Resumen de la Orden</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Subtotal:</span>
                          <span className="font-semibold">
                            {formatPrice((Number(order.totalAmount) / 1.1))}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Impuestos (10%):</span>
                          <span className="font-semibold">
                            {formatPrice((Number(order.totalAmount) - Number(order.totalAmount) / 1.1))}
                          </span>
                        </div>

                        {/* Mostrar Notas de Crédito si existen */}
                        {order.creditNoteUsages && order.creditNoteUsages.length > 0 && (
                          <>
                            <div className="border-t pt-2 flex justify-between text-sm">
                              <span className="font-semibold text-gray-900">Total Orden:</span>
                              <span className="font-semibold text-gray-900">
                                {formatPrice(Number(order.totalAmount))}
                              </span>
                            </div>

                            {/* Sección de Créditos Aplicados */}
                            <div className="bg-green-50 rounded-lg p-3 space-y-2 border border-green-200 mt-3">
                              <div className="font-semibold text-green-800 text-sm flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Créditos Aplicados:
                              </div>
                              {order.creditNoteUsages.map((usage) => (
                                <div key={usage.id} className="flex justify-between text-sm pl-6">
                                  <span className="text-green-700">
                                    {usage.creditNote.creditNoteNumber}:
                                  </span>
                                  <span className="text-green-700 font-semibold">
                                    -{formatPrice(Number(usage.amountUsed))}
                                  </span>
                                </div>
                              ))}
                              <div className="flex justify-between text-green-800 font-bold pt-2 border-t border-green-300 text-sm">
                                <span>Total Crédito:</span>
                                <span>
                                  -{formatPrice(order.creditNoteUsages.reduce((sum, usage) => sum + Number(usage.amountUsed), 0))}
                                </span>
                              </div>
                            </div>

                            {/* Total Final a Pagar */}
                            <div className="border-t-2 border-purple-200 pt-2 flex justify-between bg-purple-50 -mx-6 px-6 py-3 -mb-2">
                              <span className="font-bold text-purple-900 text-base">TOTAL A PAGAR:</span>
                              <span className="font-bold text-purple-600 text-xl">
                                {formatPrice((
                                  Number(order.totalAmount) -
                                  order.creditNoteUsages.reduce((sum, usage) => sum + Number(usage.amountUsed), 0)
                                ))}
                              </span>
                            </div>
                          </>
                        )}

                        {/* Si NO hay créditos, mostrar total normal */}
                        {(!order.creditNoteUsages || order.creditNoteUsages.length === 0) && (
                          <div className="border-t pt-2 flex justify-between">
                            <span className="font-bold text-gray-900">Total:</span>
                            <span className="font-bold text-green-600 text-lg">
                              {formatPrice(Number(order.totalAmount))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Invoice Buttons */}
                    <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                      <div className="flex flex-col gap-4">
                        <div>
                          <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Factura Profesional
                          </h4>
                          <p className="text-sm text-gray-600">
                            Genera y descarga la factura en formato PDF
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            size="default"
                            onClick={() => onViewInvoice(order)}
                            disabled={isGeneratingInvoice}
                            className="flex-1 gap-2"
                          >
                            {isGeneratingInvoice ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                            Ver Factura
                          </Button>
                          <Button
                            variant="default"
                            size="default"
                            onClick={() => onDownloadInvoice(order)}
                            disabled={isGeneratingInvoice}
                            className="flex-1 gap-2"
                          >
                            {isGeneratingInvoice ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            Descargar PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-4">Funcionalidad de factura próximamente</p>
                    <Button variant="outline" disabled>
                      Generar Factura
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
