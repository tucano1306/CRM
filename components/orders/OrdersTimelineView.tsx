// components/orders/OrdersTimelineView.tsx
'use client'

import { useMemo } from 'react'
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle,
  Calendar,
  ChevronRight,
  TrendingUp,
  Truck,
  Check
} from 'lucide-react'

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

interface Order {
  id: string
  orderNumber: string
  status: OrderStatus
  totalAmount: number
  createdAt: string
  notes?: string | null
  deliveryInstructions?: string | null
  clientId?: string
  client?: {
    id: string
    name: string
    email: string
  }
  orderItems: any[]
}

interface OrdersTimelineViewProps {
  orders: Order[]
  onOrderClick: (order: Order) => void
  selectedOrders?: string[]
  onToggleSelection?: (orderId: string) => void
  userRole?: 'SELLER' | 'CLIENT'
}

const statusConfig = {
  PENDING: {
    label: 'Pendiente',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200'
  },
  PLACED: {
    label: 'Colocada',
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
  CONFIRMED: {
    label: 'Confirmada',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  IN_DELIVERY: {
    label: 'En Entrega',
    icon: Truck,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200'
  },
  COMPLETED: {
    label: 'Completada',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200'
  },
  CANCELED: {
    label: 'Cancelada',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200'
  },
  PREPARING: {
    label: 'Preparando',
    icon: Package,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
  READY_FOR_PICKUP: {
    label: 'Lista para Recoger',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200'
  },
  DELIVERED: {
    label: 'Entregada',
    icon: CheckCircle,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200'
  },
  PARTIALLY_DELIVERED: {
    label: 'Parcialmente Entregada',
    icon: Truck,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200'
  },
  PAYMENT_PENDING: {
    label: 'Pago Pendiente',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200'
  },
  PAID: {
    label: 'Pagada',
    icon: CheckCircle,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200'
  }
}

// Función para obtener la etiqueta de grupo temporal
function getDateGroupLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const orderDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  // Hoy
  if (orderDate.getTime() === today.getTime()) {
    return 'Hoy'
  }
  
  // Ayer
  if (orderDate.getTime() === yesterday.getTime()) {
    return 'Ayer'
  }
  
  // Esta semana (últimos 7 días)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  if (orderDate > weekAgo) {
    return 'Esta semana'
  }
  
  // Este mes
  if (orderDate.getMonth() === today.getMonth() && orderDate.getFullYear() === today.getFullYear()) {
    return 'Este mes'
  }
  
  // Mes anterior
  const lastMonth = new Date(today)
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  if (orderDate.getMonth() === lastMonth.getMonth() && orderDate.getFullYear() === lastMonth.getFullYear()) {
    return 'Mes pasado'
  }
  
  // Por año
  if (orderDate.getFullYear() === today.getFullYear()) {
    return orderDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
  }
  
  // Años anteriores
  return orderDate.getFullYear().toString()
}

// Orden de prioridad para los grupos
const groupOrder = [
  'Hoy',
  'Ayer', 
  'Esta semana',
  'Este mes',
  'Mes pasado'
]

export default function OrdersTimelineView({ 
  orders, 
  onOrderClick,
  selectedOrders = [],
  onToggleSelection,
  userRole = 'CLIENT'
}: OrdersTimelineViewProps) {
  
  const isSelected = (orderId: string) => selectedOrders.includes(orderId)
  // Ordenar y agrupar órdenes por fecha
  const groupedOrders = useMemo(() => {
    // Ordenar de más reciente a más antigua
    const sortedOrders = [...orders].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // Agrupar por fecha
    const groups = new Map<string, Order[]>()
    
    sortedOrders.forEach(order => {
      const date = new Date(order.createdAt)
      const label = getDateGroupLabel(date)
      
      if (!groups.has(label)) {
        groups.set(label, [])
      }
      groups.get(label)!.push(order)
    })

    // Convertir a array y ordenar grupos
    const groupsArray = Array.from(groups.entries())
    
    groupsArray.sort((a, b) => {
      const indexA = groupOrder.indexOf(a[0])
      const indexB = groupOrder.indexOf(b[0])
      
      // Si ambos están en el orden predefinido
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      
      // Si solo uno está en el orden predefinido, ese va primero
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      
      // Para otros casos (meses/años), orden alfabético inverso (más reciente primero)
      return b[0].localeCompare(a[0])
    })

    return groupsArray
  }, [orders])

  return (
    <div className="space-y-6">
      {groupedOrders.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hay órdenes para mostrar</p>
        </div>
      ) : (
        groupedOrders.map(([groupLabel, groupOrders]) => (
          <div key={groupLabel} className="space-y-3">
            {/* Header del Grupo */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-purple-100 backdrop-blur-sm z-10 px-4 py-2 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <h3 className="font-semibold text-purple-900">{groupLabel}</h3>
                </div>
                <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full font-medium">
                  {groupOrders.length} {groupOrders.length === 1 ? 'orden' : 'órdenes'}
                </span>
              </div>
            </div>

            {/* Timeline de Órdenes */}
            <div className="space-y-2 pl-4 border-l-2 border-purple-200 ml-2">
              {groupOrders.map((order, index) => {
                const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING
                const StatusIcon = config.icon
                const isFirst = index === 0

                return (
                  <div
                    key={order.id}
                    className="relative"
                  >
                    {/* Punto en la línea de tiempo */}
                    <div className={`
                      absolute -left-[21px] top-4 w-3 h-3 rounded-full border-2 border-purple-200
                      ${isFirst ? 'bg-purple-600 animate-pulse' : 'bg-white'}
                    `} />

                    {/* Card de Orden */}
                    <div
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all border border-gray-200 hover:border-purple-300 group ml-4"
                    >
                      <div className="p-3 sm:p-4">
                        {/* Layout responsive: columna en móvil, fila en desktop */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          {/* Primera fila en móvil: Checkbox + Icono + Info básica */}
                          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            {/* Checkbox de selección (solo para vendedor) */}
                            {userRole === 'SELLER' && onToggleSelection && (
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onToggleSelection(order.id)
                                }}
                                className="flex-shrink-0 cursor-pointer"
                              >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  isSelected(order.id)
                                    ? 'bg-purple-600 border-purple-600'
                                    : 'border-gray-300 hover:border-purple-400'
                                }`}>
                                  {isSelected(order.id) && (
                                    <Check className="h-3 w-3 text-white" />
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Icono de Estado */}
                            <div 
                              className={`${config.bg} p-2 sm:p-2.5 rounded-lg flex-shrink-0 cursor-pointer`}
                              onClick={() => onOrderClick(order)}
                            >
                              <StatusIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${config.color}`} />
                            </div>

                            {/* Info Principal */}
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => onOrderClick(order)}
                            >
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                                <h4 className="font-semibold text-gray-900 text-sm">
                                  #{order.orderNumber}
                                </h4>
                                <span className={`
                                  text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap
                                  ${config.bg} ${config.color}
                                `}>
                                  {config.label}
                                </span>
                                {isFirst && (
                                  <span className="text-xs bg-gradient-to-r from-purple-600 to-purple-700 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium flex items-center gap-1 whitespace-nowrap">
                                    <TrendingUp className="h-3 w-3" />
                                    <span className="hidden sm:inline">Reciente</span>
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-600 flex-wrap">
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <Package className="h-3 w-3" />
                                  <span className="hidden sm:inline">{order.orderItems?.length || 0} {order.orderItems?.length === 1 ? 'producto' : 'productos'}</span>
                                  <span className="sm:hidden">{order.orderItems?.length || 0} prod.</span>
                                </span>
                                <span className="flex items-center gap-1 whitespace-nowrap">
                                  <Clock className="h-3 w-3" />
                                  {new Date(order.createdAt).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Segunda fila en móvil: Precio + Flecha */}
                          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 sm:flex-shrink-0">
                            {/* Precio */}
                            <div className="text-left sm:text-right cursor-pointer" onClick={() => onOrderClick(order)}>
                              <p className="text-lg sm:text-xl font-bold text-purple-600">
                                ${Number(order.totalAmount).toFixed(2)}
                              </p>
                            </div>

                            {/* Flecha */}
                            <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
