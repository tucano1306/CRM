'use client'

import { useEffect, useState } from 'react'
import {
  Package,
  Clock,
  Loader,
  CheckCircle,
  XCircle,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Filter,
} from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED'

type OrderItem = {
  id: string
  quantity: number
  pricePerUnit: number
  subtotal: number
  productName: string
  product: {
    id: string
    name: string
    sku: string | null
    imageUrl: string | null
  }
}

type Order = {
  id: string
  status: OrderStatus
  totalAmount: number
  subtotal: number
  tax: number
  notes: string | null
  createdAt: string
  client: {
    id: string
    name: string
    email: string
    phone: string | null
  } | null
  items: OrderItem[]
}

type OrderStats = {
  total: number
  pending: number
  processing: number
  completed: number
  cancelled: number
}

const statusConfig = {
  PENDING: {
    label: 'Pendiente',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    buttonColor: 'bg-yellow-600'
  },
  CONFIRMED: {  // ✅ Cambiar de PROCESSING a CONFIRMED
    label: 'Confirmada',
    icon: CheckCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    buttonColor: 'bg-blue-600'
  },
  COMPLETED: {
    label: 'Completada',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    buttonColor: 'bg-green-600'
  },
  CANCELED: {  // ✅ Cambiar de CANCELLED a CANCELED
    label: 'Cancelada',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    buttonColor: 'bg-red-600'
  },
}

export default function OrdersManagementPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    cancelled: 0,
  })
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [filterStatus])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const url = filterStatus === 'all' 
        ? '/api/orders'
        : `/api/orders?status=${filterStatus}`
      
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok && data.success) {
        setOrders(data.orders)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error cargando órdenes:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    if (!confirm(`¿Cambiar estado a "${statusConfig[newStatus].label}"?`)) {
      return
    }

    try {
      setUpdatingOrder(orderId)
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        await fetchOrders()
        alert('✅ Estado actualizado exitosamente')
      } else {
        alert(data.error || 'Error actualizando estado')
      }
    } catch (error) {
      console.error('Error actualizando orden:', error)
      alert('Error actualizando estado')
    } finally {
      setUpdatingOrder(null)
    }
  }

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId)
  }

  const nextStatusMap = {
    PENDING: 'CONFIRMED',  // ✅ Cambiar de PROCESSING
    CONFIRMED: 'COMPLETED',  // ✅ Cambiar de PROCESSING
    COMPLETED: null,
    CANCELED: null,  // ✅ Cambiar de CANCELLED
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando órdenes...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageHeader 
            title="Gestión de Órdenes" 
            description="Administra y actualiza el estado de las órdenes"
          />
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card 
            className={`cursor-pointer transition-all ${filterStatus === 'all' ? 'ring-2 ring-purple-500' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold text-purple-600">{stats.total}</p>
              </div>
            </CardContent>
          </Card>

          {Object.entries(statusConfig).map(([status, config]) => {
            const Icon = config.icon
            return (
              <Card
                key={status}
                className={`cursor-pointer transition-all ${filterStatus === status ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                <CardContent className="p-4">
                  <div className="text-center">
                    <Icon className={`mx-auto mb-1 ${config.color}`} size={20} />
                    <p className="text-sm text-gray-600">{config.label}</p>
                    <p className={`text-2xl font-bold ${config.color}`}>
                      {stats[status.toLowerCase() as keyof OrderStats]}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filtro activo */}
        {filterStatus !== 'all' && (
          <div className="flex items-center gap-2 text-sm">
            <Filter size={16} className="text-gray-500" />
            <span className="text-gray-600">
              Filtrando por: <strong>{statusConfig[filterStatus as OrderStatus].label}</strong>
            </span>
            <button
              onClick={() => setFilterStatus('all')}
              className="text-blue-600 hover:underline ml-2"
            >
              Limpiar filtro
            </button>
          </div>
        )}

        {/* Lista de órdenes */}
        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="mx-auto text-gray-400 mb-4" size={64} />
              <p className="text-lg font-medium text-gray-700">
                No hay órdenes {filterStatus !== 'all' && `con estado "${statusConfig[filterStatus as OrderStatus].label}"`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const config = statusConfig[order.status]
              const StatusIcon = config.icon
              const isExpanded = expandedOrder === order.id
              const nextStatus = nextStatusMap[order.status as keyof typeof nextStatusMap]

              return (
                <Card key={order.id} className="overflow-hidden">
                  {/* Header de la orden */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleExpand(order.id)}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {/* Estado y ID */}
                      <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${config.bg}`}>
                          <StatusIcon className={config.color} size={24} />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            #{order.id.slice(0, 8)}
                          </p>
                          <p className={`font-semibold ${config.color}`}>
                            {config.label}
                          </p>
                        </div>
                      </div>

                      {/* Cliente */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Cliente</p>
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <p className="font-medium text-gray-800">
                            {order.client?.name || 'Sin nombre'}
                          </p>
                        </div>
                        {order.client?.email && (
                          <div className="flex items-center gap-2 mt-1">
                            <Mail size={14} className="text-gray-400" />
                            <p className="text-xs text-gray-600">{order.client.email}</p>
                          </div>
                        )}
                      </div>

                      {/* Fecha */}
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Fecha</p>
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <p className="text-sm text-gray-700">
                            {new Date(order.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Total */}
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Total</p>
                        <p className="text-2xl font-bold text-purple-600">
                          ${Number(order.totalAmount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {order.orderItems?.length || 0} {(order.orderItems?.length || 0) === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detalles expandidos */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      {/* Productos */}
                      <h4 className="font-semibold text-gray-800 mb-4">Productos</h4>
                      <div className="space-y-3 mb-6">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-white p-4 rounded-lg"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
                                {item.product.imageUrl ? (
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    className="w-full h-full object-cover rounded-lg"
                                  />
                                ) : (
                                  <Package className="text-purple-300" size={24} />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {item.productName}
                                </p>
                                {item.product.sku && (
                                  <p className="text-xs text-gray-500">
                                    SKU: {item.product.sku}
                                  </p>
                                )}
                                <p className="text-sm text-gray-600">
                                  ${item.pricePerUnit.toFixed(2)} × {item.quantity}
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
                      <div className="bg-white p-4 rounded-lg space-y-2 mb-6">
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal</span>
                          <span className="font-semibold">${order.subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Impuestos (10%)</span>
                          <span className="font-semibold">${order.tax.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-800">Total</span>
                          <span className="text-2xl font-bold text-purple-600">
                            ${order.totalAmount.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Notas */}
                      {order.notes && (
                        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Notas</p>
                          <p className="text-sm text-gray-600">{order.notes}</p>
                        </div>
                      )}

                      {/* Acciones */}
                      <div className="flex flex-wrap gap-3">
                        {nextStatus && (
                          <>
                            {(() => {
                              const nextStatusConfig = statusConfig[nextStatus as keyof typeof statusConfig]
                              return (
                                <Button
                                  onClick={() => updateOrderStatus(order.id, nextStatus as OrderStatus)}
                                  disabled={updatingOrder === order.id}
                                  className={`${nextStatusConfig.buttonColor} text-white`}
                                >
                                  {updatingOrder === order.id ? (
                                    <>
                                      <Loader className="animate-spin mr-2" size={16} />
                                      Actualizando...
                                    </>
                                  ) : (
                                    <>
                                      Marcar como {nextStatusConfig.label}
                                    </>
                                  )}
                                </Button>
                              )
                            })()}
                            {order.status !== 'CANCELED' && order.status !== 'COMPLETED' && (
                              <Button
                                onClick={() => updateOrderStatus(order.id, 'CANCELED')}
                                disabled={updatingOrder === order.id}
                                variant="outline"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                Cancelar Orden
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </MainLayout>
  )
}