'use client'

import { useState, useEffect } from 'react'
import { formatPrice } from '@/lib/utils'
import { 
  Plus, 
  RefreshCw, 
  Calendar, 
  Pause, 
  Play, 
  Trash2,
  Clock,
  DollarSign,
  Package,
  Edit,
  Eye,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  Repeat
} from 'lucide-react'
import CreateRecurringOrderModal from './CreateRecurringOrderModal'
import RecurringOrderDetailModal from './RecurringOrderDetailModal'

interface RecurringOrdersManagerProps {
  userRole: 'SELLER' | 'CLIENT'
  clientId?: string
}

export default function ModernRecurringOrdersManager({ userRole, clientId }: RecurringOrdersManagerProps) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      console.log('Fetching recurring orders...') // Debug
      const response = await fetch('/api/recurring-orders')
      const result = await response.json()
      
      console.log('Recurring orders response:', result) // Debug
      
      if (result.success) {
        setOrders(result.data)
        console.log('Orders loaded:', result.data.length) // Debug
      } else {
        console.error('Failed to fetch orders:', result.error)
      }
    } catch (error) {
      console.error('Error fetching recurring orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (orderId: string, currentStatus: boolean) => {
    setProcessingId(orderId)
    try {
      const response = await fetch(`/api/recurring-orders/${orderId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (response.ok) {
        // Actualizar localmente para feedback inmediato
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, isActive: !currentStatus }
            : order
        ))
      }
    } catch (error) {
      console.error('Error toggling order:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleDelete = async (orderId: string, orderName: string) => {
    const confirmMessage = `¿Eliminar "${orderName}"?\n\nEsta orden recurrente se eliminará permanentemente y ya no se ejecutará automáticamente.`
    
    if (!confirm(confirmMessage)) return

    setProcessingId(orderId)
    try {
      const response = await fetch(`/api/recurring-orders/${orderId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remover localmente para feedback inmediato
        setOrders(prev => prev.filter(order => order.id !== orderId))
      }
    } catch (error) {
      console.error('Error deleting order:', error)
    } finally {
      setProcessingId(null)
    }
  }

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  const getFrequencyInfo = (order: any) => {
    const labels = {
      'DAILY': { icon: '📅', text: 'Diario', color: 'blue' },
      'WEEKLY': { icon: '📆', text: 'Semanal', color: 'green' },
      'BIWEEKLY': { icon: '🗓️', text: 'Quincenal', color: 'purple' },
      'MONTHLY': { icon: '📋', text: 'Mensual', color: 'orange' },
      'CUSTOM': { icon: '⚙️', text: `Cada ${order.customDays} días`, color: 'pink' }
    }
    return labels[order.frequency as keyof typeof labels] || { icon: '📅', text: order.frequency, color: 'gray' }
  }

  const getDaysUntilNext = (nextDate: string) => {
    const today = new Date()
    const next = new Date(nextDate)
    const diffTime = next.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return { text: 'Hoy', color: 'red', urgent: true }
    if (diffDays === 1) return { text: 'Mañana', color: 'orange', urgent: true }
    if (diffDays <= 3) return { text: `En ${diffDays} días`, color: 'yellow', urgent: true }
    return { text: `En ${diffDays} días`, color: 'green', urgent: false }
  }

  // Filtrar órdenes
  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'active') return order.isActive
    if (filterStatus === 'paused') return !order.isActive
    return true
  })

  // Estadísticas
  const stats = {
    total: orders.length,
    active: orders.filter(o => o.isActive).length,
    paused: orders.filter(o => !o.isActive).length,
    // Total acumulado de lo que se gastará/generará (suma de todas las órdenes recurrentes activas)
    totalRecurringAmount: orders.filter(o => o.isActive).reduce((sum, o) => sum + Number(o.totalAmount), 0),
    // Total ya ejecutado en el pasado
    totalExecuted: orders.reduce((sum, o) => sum + (Number(o.totalAmount) * (o.executionCount || 0)), 0),
    // Todas las órdenes activas ordenadas por próxima ejecución
    upcomingOrders: orders.filter(o => o.isActive).sort((a, b) => 
      new Date(a.nextExecutionDate).getTime() - new Date(b.nextExecutionDate).getTime()
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-xl shadow-md w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-gray-600 font-medium">Cargando tus órdenes recurrentes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Header con Título y Botón Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border-2 border-purple-200">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl shadow-md">
              <Repeat className="w-6 h-6 text-white" />
            </div>
            {userRole === 'SELLER' ? 'Órdenes Recurrentes de Clientes' : 'Órdenes Recurrentes'}
          </h1>
          <p className="text-gray-600 font-medium mt-1 ml-14">
            {userRole === 'SELLER' 
              ? 'Gestiona todas las órdenes programadas de tus clientes'
              : 'Automatiza tus pedidos y ahorra tiempo'
            }
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={fetchOrders}
            className="px-4 py-2 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4 text-purple-600" />
            Actualizar
          </button>
          
          {userRole === 'CLIENT' && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2 font-semibold"
            >
              <Plus className="h-5 w-5" />
              Nueva Orden Recurrente
            </button>
          )}
        </div>
      </div>

      {orders.length > 0 && (
        <>
          {/* Panel de Estadísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-xl shadow-md">
                  <Repeat className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">
                {userRole === 'SELLER' ? 'Total de Órdenes' : 'Mis Órdenes'}
              </p>
              <p className="text-2xl sm:text-4xl font-bold text-purple-600">{stats.total}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-2 border-emerald-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-xl shadow-md">
                  <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Activas</p>
              <p className="text-2xl sm:text-4xl font-bold text-emerald-600">{stats.active}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-2 border-amber-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl shadow-md">
                  <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Pausadas</p>
              <p className="text-2xl sm:text-4xl font-bold text-amber-600">{stats.paused}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-2 border-cyan-200">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl shadow-md">
                  <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
              <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">
                {userRole === 'SELLER' ? 'Valor Recurrente' : 'Valor por Ciclo'}
              </p>
              <p className="text-xl sm:text-3xl font-bold text-cyan-600">{formatPrice(stats.totalRecurringAmount)}</p>
              {stats.totalExecuted > 0 && (
                <p className="text-cyan-700 text-xs font-semibold mt-1 px-2 py-0.5 bg-cyan-100 rounded-full inline-block">
                  Total ejecutado: {formatPrice(stats.totalExecuted)}
                </p>
              )}
            </div>
          </div>

          {/* Próximas Ejecuciones Destacadas */}
          {stats.upcomingOrders.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-md">
                    <CalendarCheck className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-600 mb-1">
                      {userRole === 'SELLER' 
                        ? stats.upcomingOrders.length > 1 
                          ? `${stats.upcomingOrders.length} Órdenes Próximas de Clientes` 
                          : 'Próxima Orden de Cliente'
                        : stats.upcomingOrders.length > 1 
                          ? `${stats.upcomingOrders.length} Órdenes Automáticas Programadas`
                          : 'Próxima Orden Automática'
                      }
                    </p>
                    
                    {stats.upcomingOrders.length === 1 ? (
                      <>
                        <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{stats.upcomingOrders[0].name}</p>
                        <p className="text-gray-600 mt-1">
                          {userRole === 'SELLER' && stats.upcomingOrders[0].client && (
                            <>
                              <span className="font-semibold text-purple-600">{stats.upcomingOrders[0].client.name}</span>
                              {' · '}
                            </>
                          )}
                          <span className="font-semibold">{getDaysUntilNext(stats.upcomingOrders[0].nextExecutionDate).text}</span>
                          {' · '}
                          {new Date(stats.upcomingOrders[0].nextExecutionDate).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                          Próxima: {getDaysUntilNext(stats.upcomingOrders[0].nextExecutionDate).text}
                        </p>
                        <p className="text-gray-600 mt-1">
                          {new Date(stats.upcomingOrders[0].nextExecutionDate).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long'
                          })}
                          {' · '}
                          <span className="font-semibold">
                            {stats.upcomingOrders.length} órdenes programadas
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">
                    {stats.upcomingOrders.length === 1 ? 'Total' : 'Total Combinado'}
                  </p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                    {formatPrice(stats.upcomingOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0))}
                  </p>
                  {stats.upcomingOrders.length > 1 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Promedio: {formatPrice((stats.upcomingOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0) / stats.upcomingOrders.length))}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Filtros */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filterStatus === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                  : 'border-2 border-purple-200 text-gray-700 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              Todas ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filterStatus === 'active'
                  ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg'
                  : 'border-2 border-emerald-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50'
              }`}
            >
              Activas ({stats.active})
            </button>
            <button
              onClick={() => setFilterStatus('paused')}
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                filterStatus === 'paused'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                  : 'border-2 border-amber-200 text-gray-700 hover:border-amber-400 hover:bg-amber-50'
              }`}
            >
              Pausadas ({stats.paused})
            </button>
          </div>
        </>
      )}

      {/* Lista de Órdenes */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-purple-200">
          <div className="max-w-md mx-auto">
            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-6 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6">
              <Repeat className="h-16 w-16 text-purple-400" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
              {filterStatus === 'all' 
                ? userRole === 'SELLER' 
                  ? 'No hay órdenes recurrentes de clientes'
                  : 'No tienes órdenes recurrentes'
                : filterStatus === 'active'
                ? userRole === 'SELLER'
                  ? 'No hay órdenes activas'
                  : 'No tienes órdenes activas'
                : userRole === 'SELLER'
                ? 'No hay órdenes pausadas'
                : 'No tienes órdenes pausadas'}
            </h3>
            <p className="text-gray-600 mb-6 text-lg">
              {filterStatus === 'all'
                ? userRole === 'SELLER'
                  ? 'Tus clientes aún no han creado órdenes recurrentes'
                  : 'Crea tu primera orden recurrente y automatiza tus pedidos favoritos'
                : filterStatus === 'active'
                ? userRole === 'SELLER'
                  ? 'Todas las órdenes de tus clientes están pausadas'
                  : 'Todas tus órdenes están pausadas. Activa alguna para que se ejecute automáticamente.'
                : userRole === 'SELLER'
                ? 'Todas las órdenes de tus clientes están activas'
                : 'Todas tus órdenes están activas.'}
            </p>
            {userRole === 'CLIENT' && filterStatus === 'all' && (
              <button
                onClick={() => setCreateModalOpen(true)}
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold text-lg inline-flex items-center gap-3"
              >
                <Zap className="h-6 w-6" />
                Crear Mi Primera Orden Recurrente
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order, index) => {
            const freqInfo = getFrequencyInfo(order)
            const nextInfo = getDaysUntilNext(order.nextExecutionDate)
            const isProcessing = processingId === order.id

            return (
              <div
                key={order.id}
                className="group bg-white rounded-2xl border-2 border-purple-200 hover:border-purple-300 hover:shadow-xl transform hover:-translate-y-1 transition-all overflow-hidden"
                style={{ 
                  animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
                }}
              >
                {/* Header con Estado */}
                <div className={`relative p-6 bg-gradient-to-r ${
                  order.isActive 
                    ? 'from-emerald-500 to-green-600' 
                    : 'from-gray-400 to-gray-500'
                } text-white`}>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-xl line-clamp-2 pr-2 flex-1">
                      {order.name}
                    </h3>
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold whitespace-nowrap">
                      {order.isActive ? '✓ Activa' : '⏸ Pausada'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-2xl">{freqInfo.icon}</span>
                    <span className="font-semibold">{freqInfo.text}</span>
                  </div>

                  {/* Badge de urgencia */}
                  {order.isActive && nextInfo.urgent && (
                    <div className="absolute top-4 right-4">
                      <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>

                {/* Contenido */}
                <div className="p-6 space-y-4">
                  {/* Próxima Ejecución */}
                  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-purple-600" />
                      <p className="text-xs font-medium text-purple-600">Próxima Orden</p>
                    </div>
                    <p className={`text-2xl font-bold mb-1 ${
                      nextInfo.urgent ? 'text-red-600' : 'text-purple-600'
                    }`}>
                      {nextInfo.text}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(order.nextExecutionDate).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long'
                      })}
                    </p>
                  </div>

                  {/* Detalles en Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border-2 border-emerald-200">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <p className="text-xs font-medium text-emerald-600">Total</p>
                      </div>
                      <p className="text-xl font-bold text-emerald-700">
                        {formatPrice(order.totalAmount)}
                      </p>
                    </div>

                    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-3 border-2 border-cyan-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-cyan-600" />
                        <p className="text-xs font-medium text-cyan-600">Ejecutadas</p>
                      </div>
                      <p className="text-xl font-bold text-cyan-700">
                        {order.executionCount || 0}
                      </p>
                    </div>
                  </div>

                  {/* Cliente (solo para vendedor) */}
                  {userRole === 'SELLER' && order.client && (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border-2 border-purple-200">
                      <div className="flex items-center gap-2 mb-1">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <p className="text-xs font-medium text-purple-600">Cliente</p>
                      </div>
                      <p className="text-base font-bold text-purple-700 truncate">
                        {order.client.name}
                      </p>
                    </div>
                  )}

                  {/* Productos Preview */}
                  {order.items && order.items.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-3 border-2 border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-gray-600" />
                        <p className="text-xs font-medium text-gray-600">
                          {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        {order.items.slice(0, 2).map((item: any, i: number) => (
                          <p key={i} className="text-sm text-gray-700 truncate">
                            • {item.productName} <span className="text-gray-500">x{item.quantity}</span>
                          </p>
                        ))}
                        {order.items.length > 2 && (
                          <p className="text-xs text-gray-500">
                            +{order.items.length - 2} más...
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="border-t-2 border-purple-100 p-4 bg-gradient-to-br from-slate-50 to-purple-50 flex gap-2">
                  <button
                    onClick={() => handleViewDetails(order)}
                    className={`${userRole === 'SELLER' ? 'flex-1' : 'flex-1'} px-4 py-2.5 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all font-semibold text-sm flex items-center justify-center gap-2`}
                  >
                    <Eye className="h-4 w-4" />
                    Ver Detalles
                  </button>
                  
                  {userRole === 'CLIENT' && (
                    <>
                      <button
                        onClick={() => handleToggle(order.id, order.isActive)}
                        disabled={isProcessing}
                        className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                          order.isActive
                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 text-amber-700 hover:border-amber-400 hover:shadow-lg'
                            : 'bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 text-emerald-700 hover:border-emerald-400 hover:shadow-lg'
                        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : order.isActive ? (
                          <>
                            <Pause className="h-4 w-4" />
                            Pausar
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            Activar
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleDelete(order.id, order.name)}
                        disabled={isProcessing}
                        className={`px-4 py-2.5 bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 text-red-600 rounded-xl hover:border-red-300 hover:shadow-lg transition-all font-semibold text-sm ${
                          isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <CreateRecurringOrderModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          fetchOrders()
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

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
