'use client'

import { useState } from 'react'
import { X, Package, ShoppingCart, Truck, History, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import OrderStatusHistory from '@/components/orders/OrderStatusHistory'

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
  productName: string
  quantity: number
  pricePerUnit: number
  subtotal: number
  itemNote?: string | null
  product: {
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
    name: string
    email: string
    phone: string
    address: string
  }
  seller?: {
    name: string
    email: string
  }
  orderItems: OrderItem[]
}

interface OrderDetailModalProps {
  order: Order
  isOpen: boolean
  onClose: () => void
}

type TabType = 'details' | 'products' | 'delivery' | 'history' | 'invoice'

export default function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
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
                          {item.quantity} {item.product.unit} × ${Number(item.pricePerUnit).toFixed(2)}
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
                          ${Number(item.subtotal).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-lg">Total</span>
                    <span className="font-bold text-green-600 text-2xl">
                      ${Number(order.totalAmount).toFixed(2)}
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
              <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-4">Funcionalidad de factura próximamente</p>
                <Button variant="outline">
                  Generar Factura
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
