'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  ShoppingBag,
  DollarSign,
  Calendar,
  Loader2,
  AlertCircle,
  Truck,
  PackageCheck,
} from 'lucide-react'
import OrderCountdown from '@/components/buyer/OrderCountdown'
import { OrderCardSkeleton } from '@/components/skeletons'

type OrderItem = {
  id: string
  productName: string
  quantity: number
  pricePerUnit: number
  subtotal: number
  productId: string
}

type Order = {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  notes: string | null
  createdAt: string
  confirmationDeadline?: string
  orderItems: OrderItem[]
}

const statusConfig = {
  PENDING: {
    label: 'Pendiente',
    description: 'Esperando confirmación del vendedor',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  CONFIRMED: {
    label: 'Confirmada',
    description: 'El vendedor confirmó tu orden',
    icon: CheckCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  PREPARING: {
    label: 'Preparando',
    description: 'Tu pedido está siendo preparado',
    icon: Package,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  READY_FOR_PICKUP: {
    label: 'Listo para Recoger',
    description: 'Tu pedido está listo',
    icon: ShoppingBag,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    border: 'border-cyan-200',
  },
  IN_DELIVERY: {
    label: 'En Entrega',
    description: 'Tu pedido está en camino',
    icon: Truck,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  DELIVERED: {
    label: 'Entregado',
    description: 'Tu pedido fue entregado',
    icon: PackageCheck,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  PARTIALLY_DELIVERED: {
    label: 'Entrega Parcial',
    description: 'Algunos productos fueron entregados',
    icon: AlertCircle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  COMPLETED: {
    label: 'Completada',
    description: 'Orden finalizada exitosamente',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  CANCELED: {
    label: 'Cancelada',
    description: 'La orden fue cancelada',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  PAYMENT_PENDING: {
    label: 'Pago Pendiente',
    description: 'Esperando confirmación de pago',
    icon: DollarSign,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  PAID: {
    label: 'Pagado',
    description: 'Pago confirmado',
    icon: DollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  // Mantener compatibilidad con estados legacy
  PROCESSING: {
    label: 'En Proceso',
    description: 'Tu orden está siendo procesada',
    icon: Loader,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  CANCELLED: {
    label: 'Cancelada',
    description: 'La orden fue cancelada',
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
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  // ✅ fetchOrders CON TIMEOUT
  const fetchOrders = async () => {
    try {
      setLoading(true)
      setTimedOut(false)
      setError(null)

      const result = await apiCall('/api/buyer/orders', {
        timeout: 5000,
        onTimeout: () => setTimedOut(true)
      })

      setLoading(false)

      if (result.success) {
        setOrders(result.data.orders)
      } else {
        setError(result.error || 'Error cargando órdenes')
      }
    } catch (err) {
      setLoading(false)
      setError(getErrorMessage(err))
    }
  }

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  // ✅ confirmOrder CON TIMEOUT
  const confirmOrder = async (orderId: string) => {
    if (!confirm('¿Confirmar esta orden?')) return

    try {
      const result = await apiCall(`/api/orders/${orderId}/placed`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idempotencyKey: uuidv4() }),
        timeout: 5000,
      })

      if (result.success) {
        alert('✅ Orden confirmada exitosamente')
        fetchOrders()
      } else {
        alert(result.error || 'Error confirmando orden')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  // ✅ cancelOrder CON TIMEOUT
  const cancelOrder = async (orderId: string) => {
    const reason = prompt('Motivo de cancelación (opcional):')
    if (reason === null) return

    try {
      const result = await apiCall(`/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          idempotencyKey: uuidv4(),
          reason 
        }),
        timeout: 5000,
      })

      if (result.success) {
        alert('✅ Orden cancelada')
        fetchOrders()
      } else {
        alert(result.error || 'Error cancelando orden')
      }
    } catch (err) {
      alert(getErrorMessage(err))
    }
  }

  // ✅ ESTADO DE LOADING
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
              <ShoppingBag className="text-purple-600" size={32} />
              Mis Órdenes
            </h1>
            <p className="text-gray-600 mt-1">Cargando órdenes...</p>
          </div>
          <div className="space-y-4">
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
            <OrderCardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  // ✅ ESTADO DE TIMEOUT
  if (timedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-lg p-8 border border-yellow-200">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-yellow-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-6">
            La carga de órdenes está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchOrders}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  // ✅ ESTADO DE ERROR
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6 flex items-center justify-center">
        <div className="max-w-md bg-white rounded-2xl shadow-lg p-8 border border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={fetchOrders}
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
          >
            Reintentar
          </button>
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
                {orders.length} {orders.length === 1 ? 'orden' : 'órdenes'}
              </p>
            </div>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Nueva orden
            </button>
          </div>
        </div>

        {/* Lista de órdenes */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-purple-100">
            <Package className="mx-auto text-gray-400 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No tienes órdenes
            </h2>
            <p className="text-gray-600 mb-6">
              Comienza a hacer tus pedidos desde el catálogo
            </p>
            <button
              onClick={() => router.push('/buyer/catalog')}
              className="bg-purple-600 text-white px-8 py-3 rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Ver catálogo
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING
              const StatusIcon = config.icon
              const isExpanded = expandedOrder === order.id
              
              // Calcular subtotal e impuestos
              const subtotal = order.orderItems?.reduce((sum, item) => sum + Number(item.subtotal), 0) || 0
              const tax = subtotal * 0.10

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
                            Orden #{order.orderNumber || order.id.slice(0, 8)}
                          </p>
                          <p className={`font-semibold ${config.color}`}>
                            {config.label}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">
                          ${Number(order.totalAmount).toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.orderItems?.length || 0}{' '}
                          {order.orderItems?.length === 1 ? 'producto' : 'productos'}           
                        </p>
                      </div>
                    </div>

                  {/* Countdown para órdenes PENDING con deadline */}
                  {order.status === 'PENDING' && order.confirmationDeadline && (
                    <div className="px-6 py-4 border-t border-gray-100">
                      <OrderCountdown
                        orderId={order.id}
                        deadline={order.confirmationDeadline}
                        onCancel={cancelOrder}
                        onExpired={() => fetchOrders()}
                      />
                    </div>
                  )}

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
                        {order.orderItems?.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-white p-4 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                                <Package className="text-purple-300" size={32} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {item.productName}
                                </p>
                                <p className="text-sm text-gray-600">
                                  ${Number(item.pricePerUnit).toFixed(2)} × {item.quantity}
                                </p>
                              </div>
                            </div>
                            <p className="font-bold text-purple-600">
                              ${Number(item.subtotal).toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Resumen */}
                      <div className="bg-white p-4 rounded-lg space-y-2">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal</span>
                          <span className="font-semibold">
                            ${Number(subtotal).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Impuestos (10%)</span>
                          <span className="font-semibold">
                            ${Number(tax).toFixed(2)}
                          </span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-800">
                            Total
                          </span>
                          <span className="text-2xl font-bold text-purple-600">
                            ${Number(order.totalAmount).toFixed(2)}
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

                      {/* Botones de acción */}
                      {order.status === 'PENDING' && (
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              confirmOrder(order.id)
                            }}
                            className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                          >
                            Confirmar orden
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              cancelOrder(order.id)
                            }}
                            className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
                          >
                            Cancelar orden
                          </button>
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