'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { formatPrice } from '@/lib/utils'
import { 
  Plus, 
  RefreshCw, 
  Pause, 
  Play, 
  Trash2,
  Clock,
  DollarSign,
  Package,
  Eye,
  Zap,
  TrendingUp,
  CheckCircle2,
  CalendarCheck,
  Repeat
} from 'lucide-react'
import CreateRecurringOrderModal from './CreateRecurringOrderModal'
import RecurringOrderDetailModal from './RecurringOrderDetailModal'

interface RecurringOrdersManagerProps {
  readonly userRole: 'SELLER' | 'CLIENT'
  readonly clientId?: string
}

// ============ Helper Functions ============

const FREQUENCY_LABELS = {
  'DAILY': { icon: '📅', text: 'Diario', color: 'blue' },
  'WEEKLY': { icon: '📆', text: 'Semanal', color: 'green' },
  'BIWEEKLY': { icon: '🗓️', text: 'Quincenal', color: 'purple' },
  'MONTHLY': { icon: '📋', text: 'Mensual', color: 'orange' },
  'CUSTOM': { icon: '⚙️', text: 'Personalizado', color: 'pink' }
} as const

function getFrequencyInfo(order: any) {
  const baseInfo = FREQUENCY_LABELS[order.frequency as keyof typeof FREQUENCY_LABELS]
  if (!baseInfo) return { icon: '📅', text: order.frequency, color: 'gray' }
  
  if (order.frequency === 'CUSTOM') {
    return { ...baseInfo, text: `Cada ${order.customDays} días` }
  }
  return baseInfo
}

function getDaysUntilNext(nextDate: string) {
  const today = new Date()
  const next = new Date(nextDate)
  const diffTime = next.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return { text: 'Hoy', color: 'red', urgent: true }
  if (diffDays === 1) return { text: 'Mañana', color: 'orange', urgent: true }
  if (diffDays <= 3) return { text: `En ${diffDays} días`, color: 'yellow', urgent: true }
  return { text: `En ${diffDays} días`, color: 'green', urgent: false }
}

function computeStats(orders: any[]) {
  const activeOrders = orders.filter(o => o.isActive)
  return {
    total: orders.length,
    active: activeOrders.length,
    paused: orders.filter(o => !o.isActive).length,
    totalRecurringAmount: activeOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
    totalExecuted: orders.reduce((sum, o) => sum + (Number(o.totalAmount) * (o.executionCount || 0)), 0),
    upcomingOrders: activeOrders.toSorted((a, b) => 
      new Date(a.nextExecutionDate).getTime() - new Date(b.nextExecutionDate).getTime()
    )
  }
}

// ============ Helper Components ============

function LoadingState() {
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

interface HeaderSectionProps {
  readonly userRole: 'SELLER' | 'CLIENT'
  readonly onRefresh: () => void
  readonly onCreateNew: () => void
}

function HeaderSection({ userRole, onRefresh, onCreateNew }: HeaderSectionProps) {
  return (
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
          onClick={onRefresh}
          className="px-4 py-2 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4 text-purple-600" />
          Actualizar
        </button>
        
        {userRole === 'CLIENT' && (
          <button
            onClick={onCreateNew}
            className="px-3 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-1 sm:gap-2 font-semibold text-sm sm:text-base"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Nueva Orden Recurrente</span>
            <span className="sm:hidden">Nuevo</span>
          </button>
        )}
      </div>
    </div>
  )
}

interface StatsCardsProps {
  readonly stats: ReturnType<typeof computeStats>
  readonly userRole: 'SELLER' | 'CLIENT'
}

function StatsCards({ stats, userRole }: StatsCardsProps) {
  return (
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
  )
}

interface UpcomingOrdersPanelProps {
  readonly stats: ReturnType<typeof computeStats>
  readonly userRole: 'SELLER' | 'CLIENT'
}

function getUpcomingLabel(userRole: 'SELLER' | 'CLIENT', orderCount: number): string {
  const isMultiple = orderCount > 1
  if (userRole === 'SELLER') {
    return isMultiple ? `${orderCount} Órdenes Próximas de Clientes` : 'Próxima Orden de Cliente'
  }
  return isMultiple ? `${orderCount} Órdenes Automáticas Programadas` : 'Próxima Orden Automática'
}

function SingleOrderDetails({ nextOrder, nextInfo, formattedDate, userRole }: Readonly<{
  nextOrder: any
  nextInfo: ReturnType<typeof getDaysUntilNext>
  formattedDate: string
  userRole: 'SELLER' | 'CLIENT'
}>) {
  const showClientName = userRole === 'SELLER' && nextOrder.client
  return (
    <>
      <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{nextOrder.name}</p>
      <p className="text-gray-600 mt-1">
        {showClientName && (
          <>
            <span className="font-semibold text-purple-600">{nextOrder.client.name}</span>
            {' · '}
          </>
        )}
        <span className="font-semibold">{nextInfo.text}</span>
        {' · '}
        {formattedDate}
      </p>
    </>
  )
}

function MultipleOrdersDetails({ nextInfo, formattedDate, orderCount }: Readonly<{
  nextInfo: ReturnType<typeof getDaysUntilNext>
  formattedDate: string
  orderCount: number
}>) {
  return (
    <>
      <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
        Próxima: {nextInfo.text}
      </p>
      <p className="text-gray-600 mt-1">
        {formattedDate}
        {' · '}
        <span className="font-semibold">{orderCount} órdenes programadas</span>
      </p>
    </>
  )
}

function UpcomingOrdersPanel({ stats, userRole }: UpcomingOrdersPanelProps) {
  if (stats.upcomingOrders.length === 0) return null

  const orderCount = stats.upcomingOrders.length
  const isSingleOrder = orderCount === 1
  const nextOrder = stats.upcomingOrders[0]
  const nextInfo = getDaysUntilNext(nextOrder.nextExecutionDate)
  const formattedDate = new Date(nextOrder.nextExecutionDate).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  })
  const totalAmount = stats.upcomingOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 border-2 border-purple-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-md">
            <CalendarCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="text-sm font-medium text-purple-600 mb-1">{getUpcomingLabel(userRole, orderCount)}</p>
            
            {isSingleOrder ? (
              <SingleOrderDetails 
                nextOrder={nextOrder}
                nextInfo={nextInfo}
                formattedDate={formattedDate}
                userRole={userRole}
              />
            ) : (
              <MultipleOrdersDetails
                nextInfo={nextInfo}
                formattedDate={formattedDate}
                orderCount={orderCount}
              />
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 mb-1">
            {isSingleOrder ? 'Total' : 'Total Combinado'}
          </p>
          <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
            {formatPrice(totalAmount)}
          </p>
          {!isSingleOrder && (
            <p className="text-xs text-gray-500 mt-1">
              Promedio: {formatPrice(totalAmount / orderCount)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ============ Style Lookup Objects ============

type FilterStatus = 'all' | 'active' | 'paused'

const BUTTON_ACTIVE_STYLES: Record<FilterStatus, string> = {
  all: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg',
  active: 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg',
  paused: 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
}

const BUTTON_INACTIVE_STYLES: Record<FilterStatus, string> = {
  all: 'border-2 border-purple-200 text-gray-700 hover:border-purple-400 hover:bg-purple-50',
  active: 'border-2 border-emerald-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50',
  paused: 'border-2 border-amber-200 text-gray-700 hover:border-amber-400 hover:bg-amber-50'
}

function getButtonClass(filter: FilterStatus, filterStatus: FilterStatus): string {
  const isActive = filter === filterStatus
  return isActive ? BUTTON_ACTIVE_STYLES[filter] : BUTTON_INACTIVE_STYLES[filter]
}

interface FilterButtonsProps {
  readonly filterStatus: FilterStatus
  readonly stats: ReturnType<typeof computeStats>
  readonly onFilterChange: (filter: FilterStatus) => void
}

function FilterButtons({ filterStatus, stats, onFilterChange }: FilterButtonsProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => onFilterChange('all')}
        className={`px-4 py-2 rounded-xl font-medium transition-all ${getButtonClass('all', filterStatus)}`}
      >
        Todas ({stats.total})
      </button>
      <button
        onClick={() => onFilterChange('active')}
        className={`px-4 py-2 rounded-xl font-medium transition-all ${getButtonClass('active', filterStatus)}`}
      >
        Activas ({stats.active})
      </button>
      <button
        onClick={() => onFilterChange('paused')}
        className={`px-4 py-2 rounded-xl font-medium transition-all ${getButtonClass('paused', filterStatus)}`}
      >
        Pausadas ({stats.paused})
      </button>
    </div>
  )
}

// ============ EmptyState Text Lookups ============

type UserRole = 'SELLER' | 'CLIENT'

const EMPTY_STATE_TITLES: Record<FilterStatus, Record<UserRole, string>> = {
  all: {
    SELLER: 'No hay órdenes recurrentes de clientes',
    CLIENT: 'No tienes órdenes recurrentes'
  },
  active: {
    SELLER: 'No hay órdenes activas',
    CLIENT: 'No tienes órdenes activas'
  },
  paused: {
    SELLER: 'No hay órdenes pausadas',
    CLIENT: 'No tienes órdenes pausadas'
  }
}

const EMPTY_STATE_DESCRIPTIONS: Record<FilterStatus, Record<UserRole, string>> = {
  all: {
    SELLER: 'Tus clientes aún no han creado órdenes recurrentes',
    CLIENT: 'Crea tu primera orden recurrente y automatiza tus pedidos favoritos'
  },
  active: {
    SELLER: 'Todas las órdenes de tus clientes están pausadas',
    CLIENT: 'Todas tus órdenes están pausadas. Activa alguna para que se ejecute automáticamente.'
  },
  paused: {
    SELLER: 'Todas las órdenes de tus clientes están activas',
    CLIENT: 'Todas tus órdenes están activas.'
  }
}

interface EmptyStateProps {
  readonly filterStatus: FilterStatus
  readonly userRole: 'SELLER' | 'CLIENT'
  readonly onCreateNew: () => void
}

function EmptyState({ filterStatus, userRole, onCreateNew }: EmptyStateProps) {
  const title = EMPTY_STATE_TITLES[filterStatus][userRole]
  const description = EMPTY_STATE_DESCRIPTIONS[filterStatus][userRole]
  const showCreateButton = userRole === 'CLIENT' && filterStatus === 'all'

  return (
    <div className="text-center py-16 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border-2 border-purple-200">
      <div className="max-w-md mx-auto">
        <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-6 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6">
          <Repeat className="h-16 w-16 text-purple-400" />
        </div>
        <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-3">
          {title}
        </h3>
        <p className="text-gray-600 mb-6 text-lg">{description}</p>
        {showCreateButton && (
          <button
            onClick={onCreateNew}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transform hover:-translate-y-0.5 transition-all font-semibold text-lg inline-flex items-center gap-3"
          >
            <Zap className="h-6 w-6" />
            Crear Mi Primera Orden Recurrente
          </button>
        )}
      </div>
    </div>
  )
}

interface OrderCardProps {
  readonly order: any
  readonly userRole: 'SELLER' | 'CLIENT'
  readonly isProcessing: boolean
  readonly index: number
  readonly onToggle: (orderId: string, isActive: boolean) => void
  readonly onDelete: (orderId: string, orderName: string) => void
  readonly onViewDetails: (order: any) => void
}

function OrderCard({ order, userRole, isProcessing, index, onToggle, onDelete, onViewDetails }: OrderCardProps) {
  const freqInfo = getFrequencyInfo(order)
  const nextInfo = getDaysUntilNext(order.nextExecutionDate)

  const renderToggleButton = () => {
    if (isProcessing) {
      return <RefreshCw className="h-4 w-4 animate-spin" />
    }
    if (order.isActive) {
      return (
        <>
          <Pause className="h-4 w-4" />
          Pausar
        </>
      )
    }
    return (
      <>
        <Play className="h-4 w-4" />
        Activar
      </>
    )
  }

  return (
    <div
      className="group bg-white rounded-2xl border-2 border-purple-200 hover:border-purple-300 hover:shadow-xl transform hover:-translate-y-1 transition-all overflow-hidden"
      style={{ animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both` }}
    >
      {/* Header con Estado */}
      <div className={`relative p-6 bg-gradient-to-r ${order.isActive ? 'from-emerald-500 to-green-600' : 'from-gray-400 to-gray-500'} text-white`}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-xl line-clamp-2 pr-2 flex-1">{order.name}</h3>
          <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold whitespace-nowrap">
            {order.isActive ? '✓ Activa' : '⏸ Pausada'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-2xl">{freqInfo.icon}</span>
          <span className="font-semibold">{freqInfo.text}</span>
        </div>

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
          <p className={`text-2xl font-bold mb-1 ${nextInfo.urgent ? 'text-red-600' : 'text-purple-600'}`}>
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
            <p className="text-xl font-bold text-emerald-700">{formatPrice(order.totalAmount)}</p>
          </div>

          <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-3 border-2 border-cyan-200">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-cyan-600" />
              <p className="text-xs font-medium text-cyan-600">Ejecutadas</p>
            </div>
            <p className="text-xl font-bold text-cyan-700">{order.executionCount || 0}</p>
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
            <p className="text-base font-bold text-purple-700 truncate">{order.client.name}</p>
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
              {order.items.slice(0, 2).map((item: any) => (
                <p key={item.id || `${item.productId}-${item.productName}`} className="text-sm text-gray-700 truncate">
                  • {item.productName} <span className="text-gray-500">x{item.quantity}</span>
                </p>
              ))}
              {order.items.length > 2 && (
                <p className="text-xs text-gray-500">+{order.items.length - 2} más...</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="border-t-2 border-purple-100 p-4 bg-gradient-to-br from-slate-50 to-purple-50 flex gap-2">
        <button
          onClick={() => onViewDetails(order)}
          className="flex-1 px-4 py-2.5 bg-white border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all font-semibold text-sm flex items-center justify-center gap-2"
        >
          <Eye className="h-4 w-4" />
          Ver Detalles
        </button>
        
        {userRole === 'CLIENT' && (
          <>
            <button
              onClick={() => onToggle(order.id, order.isActive)}
              disabled={isProcessing}
              className={`px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                order.isActive
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 text-amber-700 hover:border-amber-400 hover:shadow-lg'
                  : 'bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 text-emerald-700 hover:border-emerald-400 hover:shadow-lg'
              } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {renderToggleButton()}
            </button>
            
            <button
              onClick={() => onDelete(order.id, order.name)}
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
}

// ============ Main Component ============

export default function ModernRecurringOrdersManager({ userRole, clientId }: RecurringOrdersManagerProps) {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/recurring-orders')
      const result = await response.json()
      
      if (result.success) {
        setOrders(result.data)
      } else {
        console.error('Failed to fetch orders:', result.error)
      }
    } catch (error) {
      console.error('Error fetching recurring orders:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleToggle = useCallback(async (orderId: string, currentStatus: boolean) => {
    setProcessingId(orderId)
    try {
      const response = await fetch(`/api/recurring-orders/${orderId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (response.ok) {
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
  }, [])

  const handleDelete = useCallback(async (orderId: string, orderName: string) => {
    const confirmMessage = `¿Eliminar "${orderName}"?\n\nEsta orden recurrente se eliminará permanentemente y ya no se ejecutará automáticamente.`
    
    if (!confirm(confirmMessage)) return

    setProcessingId(orderId)
    try {
      const response = await fetch(`/api/recurring-orders/${orderId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setOrders(prev => prev.filter(order => order.id !== orderId))
      }
    } catch (error) {
      console.error('Error deleting order:', error)
    } finally {
      setProcessingId(null)
    }
  }, [])

  const handleViewDetails = useCallback((order: any) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }, [])

  const handleOpenCreateModal = useCallback(() => {
    setCreateModalOpen(true)
  }, [])

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false)
    fetchOrders()
  }, [fetchOrders])

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false)
    setSelectedOrder(null)
  }, [])

  const handleFilterChange = useCallback((filter: FilterStatus) => {
    setFilterStatus(filter)
  }, [])

  // Memoized computations
  const stats = useMemo(() => computeStats(orders), [orders])

  const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') return orders
    if (filterStatus === 'active') return orders.filter(order => order.isActive)
    return orders.filter(order => !order.isActive)
  }, [orders, filterStatus])

  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="space-y-6">
      <HeaderSection 
        userRole={userRole} 
        onRefresh={fetchOrders} 
        onCreateNew={handleOpenCreateModal} 
      />

      {orders.length > 0 && (
        <>
          <StatsCards stats={stats} userRole={userRole} />
          <UpcomingOrdersPanel stats={stats} userRole={userRole} />
          <FilterButtons 
            filterStatus={filterStatus} 
            stats={stats} 
            onFilterChange={handleFilterChange} 
          />
        </>
      )}

      {filteredOrders.length === 0 ? (
        <EmptyState 
          filterStatus={filterStatus} 
          userRole={userRole} 
          onCreateNew={handleOpenCreateModal} 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order, index) => (
            <OrderCard
              key={order.id}
              order={order}
              userRole={userRole}
              isProcessing={processingId === order.id}
              index={index}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateRecurringOrderModal
        isOpen={createModalOpen}
        onClose={handleCloseCreateModal}
      />

      {selectedOrder && (
        <RecurringOrderDetailModal
          order={selectedOrder}
          isOpen={detailModalOpen}
          onClose={handleCloseDetailModal}
          userRole={userRole}
        />
      )}

      <style>{`
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
