'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  ShoppingBag,
  DollarSign,
  Calendar,
} from 'lucide-react'

type OrderItem = {
  id: string
  quantity: number
  price: number
  subtotal: number
  product: {
    id: string
    name: string
    imageUrl: string | null
    sku: string | null
  }
}

type Order = {
  id: string
  status: string
  totalAmount: number
  subtotal: number
  tax: number
  notes: string | null
  createdAt: string
  items: OrderItem[]
}

const statusConfig = {
  PENDING: {
    label: 'Pendiente',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  PROCESSING: {
    label: 'En Proceso',
    icon: Loader,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  COMPLETED: {
    label: 'Completada',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  CANCELLED: {
    label: 'Cancelada',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/buyer/orders')
      const data = await response.json()

      if (response.ok && data.success) {
        setOrders(data.orders)
      }
    } catch (error) {
      console.error('Error cargando órdenes:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando órdenes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <ShoppingBag className="text-purple-600" size={32} />
                Mis Órdenes
              </h1>
              <p className="text-gray-600 mt-1">
                Historial completo de tus pedidos
              </p>
            </div>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Nuevo Pedido
            </button>
          </div>
        </div>

        {/* Lista de órdenes */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <ShoppingBag className="mx-auto text-gray-400 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No tienes órdenes aún
            </h3>
            <p className="text-gray-500 mb-6">
              Comienza agregando productos al carrito y finaliza tu primer pedido
            </p>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Ir al catálogo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING
              const StatusIcon = config.icon
              const isExpanded = expandedOrder === order.id

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden"
                >
                  {/* Header de la orden */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(order.id)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${config.bg}`}>
                          <StatusIcon className={config.color} size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">
                            Orden #{order.id.slice(0, 8)}
                          </p>
                          <p className={`font-semibold ${config.color}`}>
                            {config.label}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">
                          ${order.totalAmount.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.items.length}{' '}
                          {order.items.length === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={16} />
                      {new Date(order.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  {/* Detalles expandidos */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      <h4 className="font-semibold text-gray-800 mb-4">
                        Productos
                      </h4>
                      <div className="space-y-3 mb-6">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-white p-4 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                                {item.product.imageUrl ? (
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <Package className="text-purple-300" size={32} />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {item.product.name}
                                </p>
                                {item.product.sku && (
                                  <p className="text-xs text-gray-500">
                                    SKU: {item.product.sku}
                                  </p>
                                )}
                                <p className="text-sm text-gray-600">
                                 ${item.price ? item.price.toFixed(2) : '0.00'} × {item.quantity}
                                 </p>
                              </div>
                            </div>
                            <p className="font-bold text-purple-600">
                              ${item.subtotal.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Resumen */}
                      <div className="bg-white p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal</span>
                          <span className="font-semibold">
                            ${order.subtotal.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Impuestos (10%)</span>
                          <span className="font-semibold">
                            ${order.tax.toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-800">
                            Total
                          </span>
                          <span className="text-2xl font-bold text-purple-600">
                            ${order.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {order.notes && (
                        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm font-semibold text-gray-700 mb-1">
                            Notas
                          </p>
                          <p className="text-sm text-gray-600">{order.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}