// components/orders/OrdersListImproved.tsx
'use client'

import { useState, useMemo, useCallback } from 'react'
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Truck,
  DollarSign,
  Calendar,
  ChevronDown,
  ChevronUp,
  Check
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { formatPrice } from '@/lib/utils'

interface Client {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
}

interface Order {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  createdAt: string
  clientId: string
  client: Client
  orderItems?: any[]
}

interface OrdersListImprovedProps {
  readonly orders: Order[]
  readonly userRole: 'SELLER' | 'CLIENT'
  readonly onOrderClick?: (order: Order) => void
  readonly selectedOrders?: string[]
  readonly onToggleSelection?: (orderId: string) => void
  readonly onBulkStatusChange?: () => void
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  PENDING: { 
    label: 'Pendiente', 
    color: 'text-yellow-600', 
    bg: 'bg-yellow-50',
    icon: Clock 
  },
  CONFIRMED: { 
    label: 'Confirmada', 
    color: 'text-blue-600', 
    bg: 'bg-blue-50',
    icon: CheckCircle 
  },
  PREPARING: { 
    label: 'Preparando', 
    color: 'text-indigo-600', 
    bg: 'bg-indigo-50',
    icon: Package 
  },
  IN_DELIVERY: { 
    label: 'En Entrega', 
    color: 'text-purple-600', 
    bg: 'bg-purple-50',
    icon: Truck 
  },
  DELIVERED: { 
    label: 'Recibida', 
    color: 'text-green-600', 
    bg: 'bg-green-50',
    icon: CheckCircle 
  },
  COMPLETED: { 
    label: 'Completada', 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50',
    icon: CheckCircle 
  },
  CANCELED: { 
    label: 'Cancelada', 
    color: 'text-red-600', 
    bg: 'bg-red-50',
    icon: XCircle 
  },
}

export default function OrdersListImproved({ 
  orders, 
  userRole,
  onOrderClick,
  selectedOrders = [],
  onToggleSelection,
  onBulkStatusChange
}: OrdersListImprovedProps) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // ⚡ Optimización: Memoizar función de selección
  const isSelected = useCallback((orderId: string) => {
    return selectedOrders.includes(orderId)
  }, [selectedOrders])

  // ⚡ Optimización: Memoizar toggle de expansión
  const _toggleExpand = useCallback((orderId: string) => {
    setExpandedOrder(prev => prev === orderId ? null : orderId)
  }, [])

  // ⚡ Optimización: Memoizar órdenes ordenadas
  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [orders])

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-12 text-center">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay órdenes
        </h3>
        <p className="text-gray-500">
          Este cliente aún no ha realizado ninguna orden
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sortedOrders.map((order) => {
        const config = statusConfig[order.status] || statusConfig.PENDING
        const StatusIcon = config.icon
        const isExpanded = expandedOrder === order.id
        
        // Determinar si necesita animación (órdenes no completadas ni canceladas)
        const needsAttention = !['COMPLETED', 'DELIVERED', 'CANCELED'].includes(order.status)
        const isCompleted = order.status === 'COMPLETED' || order.status === 'DELIVERED'
        const isReceived = order.status === 'DELIVERED' // Orden recibida por el comprador

        return (
          <Card 
            key={order.id} 
            data-order-status={order.status}
            data-order-id={order.id}
            className="overflow-hidden hover:shadow-md transition-shadow relative"
            style={needsAttention ? {
              animation: 'orderPulse 3s ease-in-out infinite',
            } : {}}
          >
            {/* Sticker de Recibida - Con badge especial para vendedor */}
            {isReceived && (
              <div className="absolute top-0 right-0 z-10"
                style={{
                  animation: 'stickerBounce 0.8s ease-out',
                }}
              >
                <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 text-white px-4 py-2 rounded-bl-2xl shadow-xl flex items-center gap-2 border-2 border-white">
                  <CheckCircle className="h-5 w-5 animate-pulse" />
                  <span className="font-bold text-sm">✅ Recibida</span>
                </div>
              </div>
            )}
            {/* Sticker de Completada (otros casos) */}
            {isCompleted && !isReceived && (
              <div className="absolute top-0 right-0 z-10"
                style={{
                  animation: 'stickerBounce 0.8s ease-out',
                }}
              >
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-4 py-2 rounded-bl-2xl shadow-lg flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-bold text-sm">¡Completada!</span>
                </div>
              </div>
            )}

            <div 
              className="p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  {/* Checkbox de selección (solo para vendedor) */}
                  {userRole === 'SELLER' && onToggleSelection && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggleSelection(order.id)
                      }}
                      className="flex-shrink-0 cursor-pointer bg-transparent border-0 p-0"
                    >
                      <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected(order.id)
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-gray-300 hover:border-purple-400'
                      }`}>
                        {isSelected(order.id) && (
                          <Check className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </button>
                  )}

                  {/* Ícono de estado */}
                  <button 
                    type="button"
                    className={`p-3 rounded-lg ${config.bg} cursor-pointer relative bg-transparent border-0`}
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    style={needsAttention ? {
                      animation: 'iconPulse 2s ease-in-out infinite',
                    } : {}}
                  >
                    {needsAttention && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
                        style={{
                          animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
                        }}
                      />
                    )}
                    <StatusIcon className={`h-5 w-5 ${config.color}`} />
                  </button>

                  {/* Información de la orden */}
                  <button 
                    type="button"
                    className="flex-1 cursor-pointer bg-transparent border-0 p-0 text-left"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        Orden #{order.orderNumber}
                      </h4>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color} ${config.bg}`}>
                        {config.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(order.createdAt).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                      
                      {order.orderItems && order.orderItems.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4" />
                          {order.orderItems.length} producto{order.orderItems.length === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Total */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-bold text-gray-900">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      {formatPrice(Number(order.totalAmount)).substring(1)}
                    </div>
                  </div>

                  {/* Expand icon */}
                  <div>
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Detalles expandidos */}
              {isExpanded && order.orderItems && order.orderItems.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className="font-semibold text-gray-900 mb-3 text-sm">Productos:</h5>
                  <div className="space-y-2">
                    {order.orderItems.map((item: any, index: number) => (
                      <div 
                        key={item.id || index} 
                        className="flex items-center justify-between bg-gray-50 rounded-lg p-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {item.productName || item.product?.name || 'Producto'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {item.quantity} × {formatPrice(Number(item.pricePerUnit || 0))}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatPrice(Number(item.subtotal || 0))}
                        </p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Total en detalle expandido */}
                  <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatPrice(Number(order.totalAmount))}
                    </span>
                  </div>

                  {/* Botón Ver Detalles Completos */}
                  {onOrderClick && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onOrderClick(order)
                        }}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Ver Detalles Completos
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )
      })}
      
      {/* Animaciones CSS inline */}
      <style>{`
        @keyframes orderPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          }
        }

        @keyframes stickerBounce {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          25% {
            transform: translateY(-10px) rotate(-3deg);
          }
          50% {
            transform: translateY(0) rotate(0deg);
          }
          75% {
            transform: translateY(-5px) rotate(3deg);
          }
        }

        @keyframes iconPulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}
