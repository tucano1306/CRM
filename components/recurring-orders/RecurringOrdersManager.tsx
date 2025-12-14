// components/recurring-orders/RecurringOrdersManager.tsx
'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Calendar, Pause, Play, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import CreateRecurringOrderModal from './CreateRecurringOrderModal'
import RecurringOrderDetailModal from './RecurringOrderDetailModal'

interface RecurringOrdersManagerProps {
  readonly userRole: 'SELLER' | 'CLIENT'
  readonly clientId?: string
}

export default function RecurringOrdersManager({ userRole, clientId }: RecurringOrdersManagerProps) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/recurring-orders')
      const result = await response.json()
      
      if (result.success) {
        setOrders(result.data)
      }
    } catch (error) {
      console.error('Error fetching recurring orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (orderId: string) => {
    try {
      const response = await fetch(`/api/recurring-orders/${orderId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        fetchOrders() // Refresh list
      }
    } catch (error) {
      console.error('Error toggling order:', error)
    }
  }

  const handleDelete = async (orderId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta orden recurrente?')) return

    try {
      const response = await fetch(`/api/recurring-orders/${orderId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchOrders() // Refresh list
      }
    } catch (error) {
      console.error('Error deleting order:', error)
    }
  }

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  const getFrequencyLabel = (order: any) => {
    switch (order.frequency) {
      case 'DAILY': return '📅 Diario'
      case 'WEEKLY': return '📆 Semanal'
      case 'BIWEEKLY': return '🗓️ Quincenal'
      case 'MONTHLY': return '📋 Mensual'
      case 'CUSTOM': return `⚙️ Cada ${order.customDays} días`
      default: return order.frequency
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm text-gray-600">
            {orders.length} {orders.length === 1 ? 'orden activa' : 'órdenes activas'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchOrders}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          {userRole === 'CLIENT' && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Orden Recurrente
            </Button>
          )}
        </div>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay órdenes recurrentes
          </h3>
          <p className="text-gray-600 mb-4">
            {userRole === 'CLIENT' 
              ? 'Crea tu primera orden recurrente para automatizar tus pedidos.'
              : 'Tus clientes aún no han creado órdenes recurrentes.'}
          </p>
          {userRole === 'CLIENT' && (
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Crear Orden Recurrente
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all overflow-hidden"
            >
              {/* Card Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-lg line-clamp-1">{order.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.isActive 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-400 text-white'
                  }`}>
                    {order.isActive ? 'Activa' : 'Pausada'}
                  </span>
                </div>
                <p className="text-purple-100 text-sm">{getFrequencyLabel(order)}</p>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Próxima ejecución:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(order.nextExecutionDate).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short'
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-green-600 text-lg">
                    ${order.totalAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Ejecuciones:</span>
                  <span className="font-semibold text-purple-600">
                    {order.executionCount}
                  </span>
                </div>

                {userRole === 'SELLER' && order.client && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">Cliente:</p>
                    <p className="font-medium text-gray-900 text-sm">{order.client.name}</p>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="border-t bg-gray-50 p-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(order)}
                  className="flex-1 text-xs"
                >
                  Ver Detalles
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggle(order.id)}
                  className="text-xs"
                >
                  {order.isActive ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(order.id)}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateRecurringOrderModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          fetchOrders() // Refresh after creating
        }}
      />

      {selectedOrder && (
        <RecurringOrderDetailModal
          order={selectedOrder}
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false)
            setSelectedOrder(null)
          }}
          userRole={userRole}
        />
      )}
    </div>
  )
}
