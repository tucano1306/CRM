'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import { formatPrice } from '@/lib/utils'
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  Plus,
  X,
  Eye,
  CheckCircle,
  BarChart3,
  Activity,
  RotateCcw,
  MessageSquare,
} from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import { DashboardStatsSkeleton } from '@/components/skeletons'
import { useRouter } from 'next/navigation'
import RevenueChart from '@/components/dashboard/RevenueChart'

type Stats = {
  totalOrders: number
  pendingOrders: number
  canceledOrders: number
  completedOrders: number
  totalRevenue: number
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  // Trends/comparativas
  ordersGrowth?: number
  revenueGrowth?: number
  productsGrowth?: number
}

type RevenueData = {
  date: string
  ingresos: number
  ordenes: number
}

type RecentOrder = {
  id: string
  orderNumber: string
  clientName: string
  totalAmount: number
  status: string
  createdAt: string
  itemCount: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Estados para funcionalidades nuevas
  const [activeTab, setActiveTab] = useState<'resumen' | 'ventas' | 'actividad'>('resumen')
  const [showLowStockModal, setShowLowStockModal] = useState(false)
  const [showOutOfStockModal, setShowOutOfStockModal] = useState(false)
  const [showPendingOrdersModal, setShowPendingOrdersModal] = useState(false)
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [outOfStockProducts, setOutOfStockProducts] = useState<any[]>([])
  const [loadingLowStock, setLoadingLowStock] = useState(false)
  const [loadingOutOfStock, setLoadingOutOfStock] = useState(false)
  const [pendingOrdersList, setPendingOrdersList] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [revenuePeriod, setRevenuePeriod] = useState<'7d' | '30d'>('7d')

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setTimedOut(false)
      setError(null)

      const result = await apiCall('/api/analytics/dashboard', {
        timeout: 8000, // 8 segundos para dashboard (muchas queries)
        onTimeout: () => setTimedOut(true)
      })

      setLoading(false)

      if (result.success) {
        const baseStats = result.data.data.overview
        
        // Agregar trends simulados (TODO: calcular desde el backend con datos reales)
        const statsWithTrends = {
          ...baseStats,
          ordersGrowth: Math.floor(Math.random() * 30) - 10, // -10% a +20%
          revenueGrowth: Math.floor(Math.random() * 40) - 15, // -15% a +25%
          productsGrowth: Math.floor(Math.random() * 20) - 5, // -5% a +15%
        }
        
        setStats(statsWithTrends)
      } else {
        setError(result.error || 'Error cargando dashboard')
      }
    } catch (err) {
      setLoading(false)
      setError(getErrorMessage(err))
    }
  }, [])

  // ✅ fetchDashboard CON TIMEOUT
  

  // Fetch de órdenes recientes
  const fetchRecentOrders = useCallback(async () => {
    try {
      const result = await apiCall('/api/orders?recent=true&limit=5', { timeout: 5000 })
      if (result.success && result.data) {
        setRecentOrders(result.data.orders || [])
      }
    } catch (err) {
      console.error('Error fetching recent orders:', err)
    }
  }, [])

  // Fetch de productos con bajo stock
  const fetchLowStockProducts = useCallback(async () => {
    try {
      console.log('🔍 [LOW STOCK] Starting fetch...')
      setLoadingLowStock(true)
      const result = await apiCall('/api/products?lowStock=true', { timeout: 5000 })
      console.log('📦 [LOW STOCK] API Response:', result)
      
      if (result.success && result.data) {
        // result.data ya es el array de productos
        const products = Array.isArray(result.data) ? result.data : []
        console.log('✅ [LOW STOCK] Products found:', products.length)
        setLowStockProducts(products)
      } else {
        console.log('⚠️ [LOW STOCK] No data in response')
        setLowStockProducts([])
      }
    } catch (err) {
      console.error('❌ [LOW STOCK] Error fetching:', err)
      setLowStockProducts([])
    } finally {
      console.log('🏁 [LOW STOCK] Fetch complete')
      setLoadingLowStock(false)
    }
  }, [])

  const fetchOutOfStockProducts = useCallback(async () => {
    console.log('🔍 [DASHBOARD] Fetching out of stock products...')
    setLoadingOutOfStock(true)
    try {
      const response = await apiCall('/api/products?outOfStock=true')
      console.log('📦 [DASHBOARD] Out of stock response:', response)
      if (response?.data) {
        const products = Array.isArray(response.data) ? response.data : []
        setOutOfStockProducts(products)
      } else {
        setOutOfStockProducts([])
      }
    } catch (error) {
      console.error('❌ [DASHBOARD] Error fetching out of stock products:', error)
      setOutOfStockProducts([])
    } finally {
      setLoadingOutOfStock(false)
    }
  }, [])

  // Fetch de órdenes pendientes
  const fetchPendingOrders = useCallback(async () => {
    try {
      const result = await apiCall('/api/orders?status=PENDING&limit=10', { timeout: 5000 })
      if (result.success && result.data) {
        // apiCall devuelve { success, data: { success, orders, stats } }
        const apiData = result.data as any
        setPendingOrdersList(apiData.orders || [])
      }
    } catch (err) {
      console.error('Error fetching pending orders:', err)
    }
  }, [])

  // Generar datos de ingresos (temporal - reemplazar con API real)
  const generateRevenueData = useCallback((period: '7d' | '30d') => {
    const days = period === '7d' ? 7 : 30
    const data: RevenueData[] = []
    const today = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      
      // Generar datos aleatorios basados en el total de ingresos
      const baseRevenue = stats?.totalRevenue || 10000
      const dailyRevenue = (baseRevenue / days) * (0.7 + Math.random() * 0.6)
      const dailyOrders = Math.floor((stats?.totalOrders || 50) / days * (0.5 + Math.random()))

      data.push({
        date: date.toISOString().split('T')[0],
        ingresos: Math.round(dailyRevenue),
        ordenes: dailyOrders,
      })
    }

    return data
  }, [stats])

  // useEffect para cargar datos iniciales
  useEffect(() => {
    fetchDashboard()
    fetchRecentOrders()
  }, [fetchDashboard, fetchRecentOrders])

  // useEffect para generar datos de gráfico cuando cambien stats o período
  useEffect(() => {
    if (stats) {
      const data = generateRevenueData(revenuePeriod)
      setRevenueData(data)
    }
  }, [stats, revenuePeriod, generateRevenueData])

  // Abrir modal de stock bajo y cargar productos
  const openLowStockModal = async () => {
    setShowLowStockModal(true)
    await fetchLowStockProducts()
  }

  // Abrir modal de órdenes pendientes y cargar órdenes
  const openPendingOrdersModal = async () => {
    setShowPendingOrdersModal(true)
    await fetchPendingOrders()
  }

  // ✅ UI States
  if (loading) {
    return (
      <MainLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={36} />
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Cargando datos...
          </p>
        </div>
        <DashboardStatsSkeleton />
      </MainLayout>
    )
  }

  if (timedOut) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-yellow-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-4">
            La carga del dashboard está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchDashboard}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-8 bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchDashboard}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </MainLayout>
    )
  }

  if (!stats) {
    return null
  }

  const statCards = [
    {
      title: 'Órdenes Totales',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'bg-gradient-to-br from-purple-500 to-purple-700',
      trend: stats.ordersGrowth,
    },
    {
      title: 'Pendientes',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'bg-gradient-to-br from-amber-500 to-orange-600',
    },
    {
      title: 'Canceladas',
      value: stats.canceledOrders,
      icon: X,
      color: 'bg-gradient-to-br from-rose-500 to-red-600',
    },
    {
      title: 'Completadas',
      value: stats.completedOrders,
      icon: CheckCircle,
      color: 'bg-gradient-to-br from-emerald-500 to-green-600',
    },
    {
      title: 'Ingresos Totales',
      value: formatPrice(stats.totalRevenue || 0),
      icon: DollarSign,
      color: 'bg-gradient-to-br from-cyan-500 to-blue-600',
      trend: stats.revenueGrowth,
    },
    {
      title: 'Productos',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-gradient-to-br from-indigo-500 to-purple-600',
      trend: stats.productsGrowth,
    },
    {
      title: 'Stock Bajo',
      value: stats.lowStockProducts,
      icon: AlertCircle,
      color: 'bg-red-500',
    },
  ]

  const tabs = [
    { id: 'resumen' as const, label: 'Resumen', icon: BarChart3 },
    { id: 'ventas' as const, label: 'Ventas', icon: DollarSign },
    { id: 'actividad' as const, label: 'Actividad', icon: Activity },
  ]

  return (
    <MainLayout>
      <div className="page-transition">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
          <TrendingUp className="text-purple-600" size={28} />
          <span className="sm:inline">Dashboard</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-700 mt-1">
          Resumen general de tu negocio
        </p>
      </div>

      {/* Tabs de navegación */}
      <div className="mb-6 flex gap-1 sm:gap-2 border-b-2 border-purple-200 overflow-x-auto bg-white rounded-t-lg px-2">
        {tabs.map((tab) => {
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 font-medium transition-all whitespace-nowrap text-sm sm:text-base rounded-t-lg ${
                activeTab === tab.id
                  ? 'text-white bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg'
                  : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
              }`}
            >
              <TabIcon size={16} className="sm:w-[18px] sm:h-[18px]" />
              <span className="hidden xs:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Contenido de la tab Resumen */}
      {activeTab === 'resumen' && (
        <>
          {/* Grid de estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, index) => {
          const Icon = card.icon
          const hasTrend = card.trend !== undefined
          const isPositive = hasTrend && card.trend! > 0
          const TrendIcon = isPositive ? TrendingUp : TrendingDown

          return (
            <div
              key={index}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-3 border-l-4 border-purple-500"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`${card.color} p-1.5 rounded-xl shadow-md`}>
                  <Icon className="text-white" size={14} />
                </div>
              </div>
              <h3 className="text-gray-600 text-xs font-semibold uppercase tracking-wide">
                {card.title}
              </h3>
              <div className="flex items-baseline justify-between mt-1">
                <p className="text-lg font-bold text-gray-900">
                  {card.value}
                </p>
                {hasTrend && (
                  <div
                    className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isPositive ? 'text-emerald-700 bg-emerald-100' : 'text-red-700 bg-red-100'
                    }`}
                  >
                    <TrendIcon size={12} />
                    {Math.abs(card.trend!)}%
                  </div>
                )}
              </div>
              {hasTrend && (
                <p className="text-[10px] text-gray-500 mt-1">
                  vs mes anterior
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Alertas removidas - ahora están en la página de productos */}

      {stats.pendingOrders > 0 && (
        <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-3 sm:p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="text-amber-600 flex-shrink-0" size={20} />
              <p className="text-amber-900 font-semibold text-sm sm:text-base">
                📦 Tienes {stats.pendingOrders} orden(es) pendiente(s) de atención
              </p>
            </div>
            <button
              onClick={openPendingOrdersModal}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-lg hover:from-amber-700 hover:to-orange-700 transition-all shadow-md hover:shadow-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              <span>Ver órdenes</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabla de Últimas Órdenes - Responsive */}
      <div className="mt-6 bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingCart size={20} className="sm:w-6 sm:h-6 text-blue-600" />
          <span>Últimas Órdenes</span>
        </h2>
        {recentOrders.length > 0 ? (
          <>
            {/* Vista móvil - Tarjetas */}
            <div className="sm:hidden space-y-3">
              {recentOrders.map((order) => (
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
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'IN_PROGRESS'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-green-600">
                      {formatPrice(order.totalAmount)}
                    </span>
                    <button
                      className="text-blue-600 hover:text-blue-800 p-2 rounded-lg bg-blue-50 flex items-center gap-1 text-sm font-medium"
                    >
                      <Eye size={16} />
                      Ver
                    </button>
                  </div>
                </button>
              ))}
            </div>

            {/* Vista desktop - Tabla */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      # Orden
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Total
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                      Estado
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700">
                        {order.clientName}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                        {formatPrice(order.totalAmount)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-800'
                              : order.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : order.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
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
          </>
        ) : (
          <p className="text-gray-500 text-center py-4">
            No hay órdenes recientes
          </p>
        )}
      </div>
        </>
      )}

      {/* Contenido de la tab Ventas */}
      {activeTab === 'ventas' && (
        <div className="space-y-6">
          {/* Selector de período */}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setRevenuePeriod('7d')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                revenuePeriod === '7d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              7 días
            </button>
            <button
              onClick={() => setRevenuePeriod('30d')}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors text-sm sm:text-base ${
                revenuePeriod === '30d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              30 días
            </button>
          </div>

          {/* Gráfico de ingresos */}
          <RevenueChart data={revenueData} period={revenuePeriod} />

          {/* Cards de resumen de ventas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-gray-600 text-sm font-medium mb-2">
                Ingresos Totales
              </h3>
              <p className="text-xl font-bold text-emerald-600">
                {formatPrice(stats.totalRevenue || 0)}
              </p>
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
              <h3 className="text-gray-600 text-sm font-medium mb-2">
                Órdenes Completadas
              </h3>
              <p className="text-2xl font-bold text-green-600">
                {stats.completedOrders}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                de {stats.totalOrders} totales
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-gray-600 text-sm font-medium mb-2">
                Ticket Promedio
              </h3>
              <p className="text-2xl font-bold text-blue-600">
                ${stats.totalOrders > 0
                  ? ((stats.totalRevenue || 0) / stats.totalOrders).toFixed(2)
                  : '0.00'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                por orden
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Contenido de la tab Actividad */}
      {activeTab === 'actividad' && (
        <div className="space-y-6">
          {/* Órdenes Recientes */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <ShoppingCart className="text-purple-600" size={24} />
                Órdenes Recientes
              </h2>
              <button
                onClick={fetchRecentOrders}
                className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                <RotateCcw size={16} />
                Actualizar
              </button>
            </div>
            
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order: any) => (
                  <button 
                    type="button"
                    key={order.id}
                    onClick={() => router.push(`/orders?orderId=${order.id}`)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-purple-50 rounded-lg border border-gray-200 cursor-pointer transition-all hover:border-purple-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' :
                        order.status === 'CONFIRMED' ? 'bg-green-100 text-green-600' :
                        order.status === 'IN_DELIVERY' ? 'bg-purple-100 text-purple-600' :
                        order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                        order.status === 'CANCELED' || order.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
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
                      <p className={`text-xs font-medium px-2 py-1 rounded-full ${
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        order.status === 'IN_DELIVERY' ? 'bg-purple-100 text-purple-700' :
                        order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                        order.status === 'CANCELED' || order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {order.status === 'PENDING' ? 'Pendiente' :
                         order.status === 'CONFIRMED' ? 'Confirmada' :
                         order.status === 'IN_DELIVERY' ? 'En Entrega' :
                         order.status === 'DELIVERED' ? 'Entregada' :
                         order.status === 'COMPLETED' ? 'Completada' :
                         order.status === 'CANCELED' || order.status === 'CANCELLED' ? 'Cancelada' :
                         order.status}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShoppingCart className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">No hay órdenes recientes</p>
              </div>
            )}
          </div>

          {/* Resumen de Actividad del Día */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Órdenes Hoy</p>
                  <p className="text-3xl font-bold mt-1">
                    {recentOrders.filter((o: any) => {
                      const orderDate = new Date(o.createdAt).toDateString()
                      const today = new Date().toDateString()
                      return orderDate === today
                    }).length}
                  </p>
                </div>
                <ShoppingCart className="text-purple-200" size={40} />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Completadas Hoy</p>
                  <p className="text-3xl font-bold mt-1">
                    {recentOrders.filter((o: any) => {
                      const orderDate = new Date(o.createdAt).toDateString()
                      const today = new Date().toDateString()
                      return orderDate === today && (o.status === 'DELIVERED' || o.status === 'COMPLETED')
                    }).length}
                  </p>
                </div>
                <CheckCircle className="text-green-200" size={40} />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm">Pendientes</p>
                  <p className="text-3xl font-bold mt-1">
                    {recentOrders.filter((o: any) => o.status === 'PENDING').length}
                  </p>
                </div>
                <Clock className="text-yellow-200" size={40} />
              </div>
            </div>
          </div>

          {/* Línea de tiempo de actividad */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Activity className="text-purple-600" size={24} />
              Línea de Tiempo
            </h2>
            
            {recentOrders.length > 0 ? (
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                <div className="space-y-4">
                  {recentOrders.slice(0, 8).map((order: any, index: number) => (
                    <div key={order.id} className="flex items-start gap-4 relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 shadow-md ${
                        order.status === 'PENDING' ? 'bg-yellow-500 text-white' :
                        order.status === 'CONFIRMED' ? 'bg-green-500 text-white' :
                        order.status === 'IN_DELIVERY' ? 'bg-purple-500 text-white' :
                        order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 'bg-emerald-500 text-white' :
                        order.status === 'CANCELED' || order.status === 'CANCELLED' ? 'bg-red-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        <ShoppingCart size={18} />
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900">
                            Orden #{order.orderNumber?.replace('ORD-', '').slice(-6) || order.id.slice(0, 6)}
                          </p>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            order.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status === 'PENDING' ? 'Nueva' :
                             order.status === 'CONFIRMED' ? 'Confirmada' :
                             order.status}
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
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">No hay actividad reciente</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botón flotante de acciones rápidas */}
      <button
        onClick={() => setShowQuickActionsModal(true)}
        className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:from-purple-700 hover:to-indigo-700 transition-all hover:scale-110 z-50 ring-4 ring-purple-200"
        title="Acciones rápidas"
      >
        <Plus size={28} />
      </button>

      {/* Modal de Productos Agotados */}
      {showOutOfStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertCircle className="text-red-600" size={24} />
                Productos Agotados (Stock: 0)
              </h3>
              <button
                onClick={() => setShowOutOfStockModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              {loadingOutOfStock ? (
                <p className="text-gray-500 text-center py-8">
                  Cargando productos...
                </p>
              ) : outOfStockProducts.length > 0 ? (
                <div className="space-y-2">
                  {outOfStockProducts.map((product: any) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border-2 border-red-300 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-sm text-red-700 font-semibold">
                          🚨 Stock: 0 - AGOTADO
                        </p>
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
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No hay productos agotados
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Stock Bajo */}
      {showLowStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertCircle className="text-amber-600" size={24} />
                Productos con Stock Bajo (menos de 10)
              </h3>
              <button
                onClick={() => setShowLowStockModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              {loadingLowStock ? (
                <p className="text-gray-500 text-center py-8">
                  Cargando productos...
                </p>
              ) : lowStockProducts.length > 0 ? (
                <div className="space-y-2">
                  {lowStockProducts.map((product: any) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border-2 border-amber-300 bg-amber-50 rounded-lg hover:bg-amber-100"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-sm text-amber-700 font-semibold">
                          ⚠️ Stock: {product.stock} unidades
                        </p>
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
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No hay productos con stock bajo
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Órdenes Pendientes */}
      {showPendingOrdersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Clock className="text-yellow-600" size={24} />
                Órdenes Pendientes
              </h3>
              <button
                onClick={() => setShowPendingOrdersModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              {pendingOrdersList.length > 0 ? (
                <div className="space-y-2">
                  {pendingOrdersList.map((order: any) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-gray-800">
                          Orden #{order.orderNumber}
                        </p>
                        <p className="text-sm text-gray-600">
                          Cliente: {order.clientName || 'N/A'}
                        </p>
                        <p className="text-xs font-semibold text-gray-900">
                          {formatPrice(order.totalAmount || 0)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setShowPendingOrdersModal(false)
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
                <p className="text-gray-500 text-center py-8">
                  Cargando órdenes...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Acciones Rápidas */}
      {showQuickActionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border-2 border-purple-200">
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 sm:p-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                <Plus size={20} />
                Acciones Rápidas
              </h3>
              <button
                onClick={() => setShowQuickActionsModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/orders')
                }}
                className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="bg-blue-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <ShoppingCart className="text-blue-600" size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">Ver Órdenes</p>
                  <p className="text-xs sm:text-sm text-gray-600">Gestionar órdenes</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/products')
                }}
                className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
              >
                <div className="bg-green-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <Package className="text-green-600" size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">Productos</p>
                  <p className="text-xs sm:text-sm text-gray-600">Gestionar inventario</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/clients')
                }}
                className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                <div className="bg-purple-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <Users className="text-purple-600" size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">Clientes</p>
                  <p className="text-xs sm:text-sm text-gray-600">Ver clientes</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/chat')
                }}
                className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
              >
                <div className="bg-indigo-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <MessageSquare className="text-indigo-600" size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">Chat</p>
                  <p className="text-xs sm:text-sm text-gray-600">Mensajes de clientes</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/recurring-orders')
                }}
                className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-4 border border-gray-200 rounded-lg hover:bg-teal-50 hover:border-teal-300 transition-colors"
              >
                <div className="bg-teal-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <RotateCcw className="text-teal-600" size={18} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">Órdenes Recurrentes</p>
                  <p className="text-xs sm:text-sm text-gray-600">Gestionar recurrentes</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  )
}