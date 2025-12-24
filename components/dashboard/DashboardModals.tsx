'use client'

import { X, AlertCircle, Clock, RotateCcw, Eye, CheckCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'

// Types
interface Product {
  id: string
  name: string
  stock: number
}

interface PendingOrder {
  id: string
  orderNumber: string
  clientName?: string
  totalAmount: number
}

// Out of Stock Modal
interface OutOfStockModalProps {
  readonly show: boolean
  readonly onClose: () => void
  readonly loading: boolean
  readonly products: Product[]
  readonly router: AppRouterInstance
}

export function OutOfStockModal({ show, onClose, loading, products, router }: OutOfStockModalProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <AlertCircle className="text-red-600" size={24} />
            Productos Agotados (Stock: 0)
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          {loading && (
            <p className="text-gray-500 text-center py-8">Cargando productos...</p>
          )}
          {!loading && products.length === 0 && (
            <p className="text-gray-500 text-center py-8">No hay productos agotados</p>
          )}
          {!loading && products.length > 0 && (
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border-2 border-red-300 bg-red-50 rounded-lg hover:bg-red-100"
                >
                  <div>
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-sm text-red-700 font-semibold">🚨 Stock: 0 - AGOTADO</p>
                  </div>
                  <button
                    onClick={() => router.push('/products')}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Reabastecer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Low Stock Modal
interface LowStockModalProps {
  readonly show: boolean
  readonly onClose: () => void
  readonly loading: boolean
  readonly products: Product[]
  readonly router: AppRouterInstance
}

export function LowStockModal({ show, onClose, loading, products, router }: LowStockModalProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <AlertCircle className="text-amber-600" size={24} />
            Productos con Stock Bajo (menos de 10)
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          {loading && (
            <p className="text-gray-500 text-center py-8">Cargando productos...</p>
          )}
          {!loading && products.length === 0 && (
            <p className="text-gray-500 text-center py-8">No hay productos con stock bajo</p>
          )}
          {!loading && products.length > 0 && (
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border-2 border-amber-300 bg-amber-50 rounded-lg hover:bg-amber-100"
                >
                  <div>
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-sm text-amber-700 font-semibold">⚠️ Stock: {product.stock} unidades</p>
                  </div>
                  <button
                    onClick={() => router.push('/products')}
                    className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Reabastecer
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Pending Orders Modal
interface PendingOrdersModalProps {
  readonly show: boolean
  readonly onClose: () => void
  readonly orders: PendingOrder[]
  readonly router: AppRouterInstance
}

export function PendingOrdersModal({ show, onClose, orders, router }: PendingOrdersModalProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Clock className="text-yellow-600" size={24} />
            Órdenes Pendientes
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="p-4">
          {orders.length > 0 ? (
            <div className="space-y-2">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium text-gray-800">Orden #{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">Cliente: {order.clientName || 'N/A'}</p>
                    <p className="text-xs font-semibold text-gray-900">{formatPrice(order.totalAmount || 0)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onClose()
                        router.push('/orders')
                      }}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                    >
                      <Eye size={16} />
                      Ver
                    </button>
                    <button
                      onClick={() => router.push('/orders')}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Procesar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Cargando órdenes...</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Quick Actions Modal
interface QuickActionsModalProps {
  readonly show: boolean
  readonly onClose: () => void
  readonly router: AppRouterInstance
}

export function QuickActionsModal({ show, onClose, router }: QuickActionsModalProps) {
  if (!show) return null

  const actions = [
    { path: '/orders', icon: 'ShoppingCart', color: 'blue', title: 'Ver Órdenes', subtitle: 'Gestionar órdenes' },
    { path: '/products', icon: 'Package', color: 'green', title: 'Productos', subtitle: 'Gestionar inventario' },
    { path: '/clients', icon: 'Users', color: 'purple', title: 'Clientes', subtitle: 'Ver clientes' },
    { path: '/chat', icon: 'MessageSquare', color: 'indigo', title: 'Chat', subtitle: 'Mensajes de clientes' },
    { path: '/recurring-orders', icon: 'RotateCcw', color: 'teal', title: 'Órdenes Recurrentes', subtitle: 'Gestionar recurrentes' },
  ]

  const handleAction = (path: string) => {
    onClose()
    router.push(path)
  }

  // Import icons dynamically rendered based on name
  const IconComponents: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    ShoppingCart: require('lucide-react').ShoppingCart,
    Package: require('lucide-react').Package,
    Users: require('lucide-react').Users,
    MessageSquare: require('lucide-react').MessageSquare,
    RotateCcw: require('lucide-react').RotateCcw,
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-white to-pastel-cream rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-pastel-blue/30">
        <div className="sticky top-0 bg-gradient-to-r from-pastel-blue to-pastel-beige text-gray-700 p-3 sm:p-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <span className="text-xl">+</span>{' '}
            Acciones Rápidas
          </h3>
          <button onClick={onClose} className="text-white hover:bg-white/20 rounded-full p-1 transition-colors">
            <X size={20} className="sm:w-6 sm:h-6" />
          </button>
        </div>
        <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
          {actions.map((action) => {
            const IconComponent = IconComponents[action.icon]
            return (
              <button
                key={action.path}
                onClick={() => handleAction(action.path)}
                className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border border-gray-200 rounded-lg hover:bg-${action.color}-50 hover:border-${action.color}-300 transition-colors`}
              >
                <div className={`bg-${action.color}-100 p-2 sm:p-3 rounded-lg flex-shrink-0`}>
                  <IconComponent className={`text-${action.color}-600`} size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">{action.title}</p>
                  <p className="text-xs sm:text-sm text-gray-600">{action.subtitle}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
