'use client'

import { ShoppingCart, TrendingUp, TrendingDown, Eye, CheckCircle, Clock, Activity } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

// Types
interface RecentOrder {
  id: string
  orderNumber: string
  clientName?: string
  client?: { name: string }
  totalAmount: number
  status: string
  createdAt: string
  itemCount?: number
  orderItems?: any[]
}

interface Stats {
  totalOrders: number
  pendingOrders: number
  canceledOrders: number
  completedOrders: number
  totalRevenue: number
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  ordersGrowth?: number
  revenueGrowth?: number
  productsGrowth?: number
}

// Helper function for order status styling
export function getOrderStatusStyle(status: string): string {
  const statusStyles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-green-100 text-green-800',
    IN_DELIVERY: 'bg-pastel-blue/30 text-pastel-blue',
    DELIVERED: 'bg-emerald-100 text-emerald-800',
    CANCELED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return statusStyles[status] || 'bg-gray-100 text-gray-800'
}

// Helper function for order status color classes
export function getOrderStatusColorClasses(status: string): string {
  const colorMap: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-600',
    CONFIRMED: 'bg-green-100 text-green-600',
    IN_DELIVERY: 'bg-pastel-blue/30 text-pastel-blue',
    DELIVERED: 'bg-emerald-100 text-emerald-600',
    COMPLETED: 'bg-emerald-100 text-emerald-600',
    CANCELED: 'bg-red-100 text-red-600',
    CANCELLED: 'bg-red-100 text-red-600',
  }
  return colorMap[status] || 'bg-blue-100 text-blue-600'
}

// Helper function for order status labels
export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pendiente',
    CONFIRMED: 'Confirmada',
    IN_DELIVERY: 'En Entrega',
    DELIVERED: 'Entregada',
    COMPLETED: 'Completada',
    CANCELED: 'Cancelada',
    CANCELLED: 'Cancelada',
  }
  return labels[status] || status
}

// Recent Orders Table (Desktop view)
interface RecentOrdersTableProps {
  readonly orders: RecentOrder[]
  readonly router: AppRouterInstance
}

export function RecentOrdersTable({ orders, router }: RecentOrdersTableProps) {
  return (
    <div className="hidden sm:block overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700"># Orden</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cliente</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Total</th>
            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Estado</th>
            <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-3 px-4 text-sm font-medium text-gray-900">{order.orderNumber}</td>
              <td className="py-3 px-4 text-sm text-gray-700">{order.clientName}</td>
              <td className="py-3 px-4 text-sm font-semibold text-gray-900">{formatPrice(order.totalAmount)}</td>
              <td className="py-3 px-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getOrderStatusStyle(order.status)}`}>
                  {order.status}
                </span>
              </td>
              <td className="py-3 px-4 text-right">
                <button
                  onClick={() => router.push('/orders')}
                  className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                  title="Ver orden"
                >
                  <Eye size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Recent Orders Cards (Mobile view)
interface RecentOrdersCardsProps {
  readonly orders: RecentOrder[]
  readonly router: AppRouterInstance
}

export function RecentOrdersCards({ orders, router }: RecentOrdersCardsProps) {
  return (
    <div className="sm:hidden space-y-3">
      {orders.map((order) => (
        <button
          type="button"
          key={order.id}
          className="w-full text-left bg-gray-50 rounded-lg p-4 border border-gray-200"
          onClick={() => router.push('/orders')}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-bold text-gray-900 text-base">{order.orderNumber}</p>
              <p className="text-sm text-gray-600">{order.clientName}</p>
            </div>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getOrderStatusStyle(order.status)}`}>
              {order.status}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-green-600">{formatPrice(order.totalAmount)}</span>
            <button className="text-blue-600 hover:text-blue-800 p-2 rounded-lg bg-blue-50 flex items-center gap-1 text-sm font-medium">
              <Eye size={16} />
              Ver
            </button>
          </div>
        </button>
      ))}
    </div>
  )
}

// Activity Tab Orders List
interface ActivityOrdersListProps {
  readonly orders: RecentOrder[]
  readonly router: AppRouterInstance
}

export function ActivityOrdersList({ orders, router }: ActivityOrdersListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <ShoppingCart className="mx-auto text-gray-300 mb-3" size={48} />
        <p className="text-gray-500">No hay órdenes recientes</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <button
          type="button"
          key={order.id}
          onClick={() => router.push(`/orders?orderId=${order.id}`)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-purple-50 rounded-lg border border-gray-200 cursor-pointer transition-all hover:border-purple-300"
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getOrderStatusColorClasses(order.status)}`}>
              <ShoppingCart size={18} />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                #{order.orderNumber?.replace('ORD-', '').slice(-6) || order.id.slice(0, 6)}
              </p>
              <p className="text-sm text-gray-500">
                {order.client?.name || 'Cliente'} • {order.itemCount || order.orderItems?.length || 0} productos
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">${Number(order.totalAmount || 0).toFixed(2)}</p>
            <p className={`text-xs font-medium px-2 py-1 rounded-full ${getOrderStatusStyle(order.status)}`}>
              {getOrderStatusLabel(order.status)}
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}

// Activity Timeline
interface ActivityTimelineProps {
  readonly orders: RecentOrder[]
}

export function ActivityTimeline({ orders }: ActivityTimelineProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="mx-auto text-gray-300 mb-3" size={48} />
        <p className="text-gray-500">No hay actividad reciente</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
      <div className="space-y-4">
        {orders.slice(0, 8).map((order) => (
          <div key={order.id} className="flex items-start gap-4 relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 shadow-md ${getTimelineIconStyle(order.status)}`}>
              <ShoppingCart size={18} />
            </div>
            <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-900">
                  Orden #{order.orderNumber?.replace('ORD-', '').slice(-6) || order.id.slice(0, 6)}
                </p>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${getTimelineBadgeStyle(order.status)}`}>
                  {getTimelineStatusLabel(order.status)}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {order.client?.name || 'Cliente'} • ${Number(order.totalAmount || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(order.createdAt).toLocaleString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getTimelineIconStyle(status: string): string {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-500 text-white',
    CONFIRMED: 'bg-green-500 text-white',
    IN_DELIVERY: 'bg-purple-500 text-white',
    DELIVERED: 'bg-emerald-500 text-white',
    COMPLETED: 'bg-emerald-500 text-white',
    CANCELED: 'bg-red-500 text-white',
    CANCELLED: 'bg-red-500 text-white',
  }
  return styles[status] || 'bg-blue-500 text-white'
}

function getTimelineBadgeStyle(status: string): string {
  const styles: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-700',
    CONFIRMED: 'bg-green-100 text-green-700',
  }
  return styles[status] || 'bg-gray-100 text-gray-700'
}

function getTimelineStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Nueva',
    CONFIRMED: 'Confirmada',
  }
  return labels[status] || status
}

// Daily Activity Stats Cards
interface DailyActivityStatsProps {
  readonly orders: RecentOrder[]
}

export function DailyActivityStats({ orders }: DailyActivityStatsProps) {
  const todaysOrders = orders.filter((o) => {
    const orderDate = new Date(o.createdAt).toDateString()
    const today = new Date().toDateString()
    return orderDate === today
  })

  const completedToday = todaysOrders.filter((o) => o.status === 'DELIVERED' || o.status === 'COMPLETED').length
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-pastel-blue to-pastel-beige rounded-lg p-5 text-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 text-sm">Órdenes Hoy</p>
            <p className="text-3xl font-bold mt-1">{todaysOrders.length}</p>
          </div>
          <ShoppingCart className="text-gray-500" size={40} />
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm">Completadas Hoy</p>
            <p className="text-3xl font-bold mt-1">{completedToday}</p>
          </div>
          <CheckCircle className="text-green-200" size={40} />
        </div>
      </div>

      <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-yellow-100 text-sm">Pendientes</p>
            <p className="text-3xl font-bold mt-1">{pendingCount}</p>
          </div>
          <Clock className="text-yellow-200" size={40} />
        </div>
      </div>
    </div>
  )
}

// Sales Summary Cards
interface SalesSummaryCardsProps {
  readonly stats: Stats
}

export function SalesSummaryCards({ stats }: SalesSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-gray-600 text-sm font-medium mb-2">Ingresos Totales</h3>
        <p className="text-xl font-bold text-emerald-600">{formatPrice(stats.totalRevenue || 0)}</p>
        {stats.revenueGrowth !== undefined && (
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            {stats.revenueGrowth > 0 ? (
              <TrendingUp size={14} className="text-green-600" />
            ) : (
              <TrendingDown size={14} className="text-red-600" />
            )}
            {Math.abs(stats.revenueGrowth)}% vs mes anterior
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-gray-600 text-sm font-medium mb-2">Órdenes Completadas</h3>
        <p className="text-2xl font-bold text-green-600">{stats.completedOrders}</p>
        <p className="text-sm text-gray-500 mt-1">de {stats.totalOrders} totales</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-gray-600 text-sm font-medium mb-2">Ticket Promedio</h3>
        <p className="text-2xl font-bold text-blue-600">
          ${stats.totalOrders > 0 ? ((stats.totalRevenue || 0) / stats.totalOrders).toFixed(2) : '0.00'}
        </p>
        <p className="text-sm text-gray-500 mt-1">por orden</p>
      </div>
    </div>
  )
}
