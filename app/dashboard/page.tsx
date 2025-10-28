'use client'

import { useEffect, useState } from 'react'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import { formatPrice, formatNumber } from '@/lib/utils'
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
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
  FileText,
  RotateCw,
} from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import { DashboardStatsSkeleton } from '@/components/skeletons'
import { useRouter } from 'next/navigation'
import RevenueChart from '@/components/dashboard/RevenueChart'

type Stats = {
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  completedOrders: number
  totalRevenue: number
  totalProducts: number
  lowStockProducts: number
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
  const [activeTab, setActiveTab] = useState<'resumen' | 'ventas' | 'inventario' | 'actividad'>('resumen')
  const [showLowStockModal, setShowLowStockModal] = useState(false)
  const [showPendingOrdersModal, setShowPendingOrdersModal] = useState(false)
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])
  const [pendingOrdersList, setPendingOrdersList] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [revenuePeriod, setRevenuePeriod] = useState<'7d' | '30d'>('7d')

  useEffect(() => {
    fetchDashboard()
  }, [])

  // ✅ fetchDashboard CON TIMEOUT
  const fetchDashboard = async () => {
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
  }

  // Fetch de órdenes recientes
  const fetchRecentOrders = async () => {
    try {
      const result = await apiCall('/api/orders?recent=true&limit=5', { timeout: 5000 })
      if (result.success && result.data) {
        setRecentOrders(result.data.orders || [])
      }
    } catch (err) {
      console.error('Error fetching recent orders:', err)
    }
  }

  // Fetch de productos con bajo stock
  const fetchLowStockProducts = async () => {
    try {
      const result = await apiCall('/api/products?lowStock=true', { timeout: 5000 })
      if (result.success && result.data) {
        setLowStockProducts(result.data.products || [])
      }
    } catch (err) {
      console.error('Error fetching low stock products:', err)
    }
  }

  // Fetch de órdenes pendientes
  const fetchPendingOrders = async () => {
    try {
      const result = await apiCall('/api/orders?status=PENDING&limit=10', { timeout: 5000 })
      if (result.success && result.data) {
        setPendingOrdersList(result.data.orders || [])
      }
    } catch (err) {
      console.error('Error fetching pending orders:', err)
    }
  }

  // Generar datos de ingresos (temporal - reemplazar con API real)
  const generateRevenueData = (period: '7d' | '30d') => {
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
  }

  // useEffect para cargar datos iniciales
  useEffect(() => {
    fetchDashboard()
    fetchRecentOrders()
  }, [])

  // useEffect para generar datos de gráfico cuando cambien stats o período
  useEffect(() => {
    if (stats) {
      const data = generateRevenueData(revenuePeriod)
      setRevenueData(data)
    }
  }, [stats, revenuePeriod])

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
      color: 'bg-blue-500',
      trend: stats.ordersGrowth,
    },
    {
      title: 'Pendientes',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'En Proceso',
      value: stats.processingOrders,
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: 'Completadas',
      value: stats.completedOrders,
      icon: Package,
      color: 'bg-green-500',
    },
    {
      title: 'Ingresos Totales',
      value: formatPrice(stats.totalRevenue || 0),
      icon: DollarSign,
      color: 'bg-emerald-500',
      trend: stats.revenueGrowth,
    },
    {
      title: 'Productos',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-indigo-500',
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
    { id: 'inventario' as const, label: 'Inventario', icon: Package },
    { id: 'actividad' as const, label: 'Actividad', icon: Activity },
  ]

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
          <TrendingUp className="text-blue-600" size={28} />
          <span className="sm:inline">Dashboard</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Resumen general de tu negocio
        </p>
      </div>

      {/* Tabs de navegación */}
      <div className="mb-6 flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => {
          const TabIcon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 font-medium transition-colors whitespace-nowrap text-sm sm:text-base ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          const hasTrend = card.trend !== undefined
          const isPositive = hasTrend && card.trend! > 0
          const isNegative = hasTrend && card.trend! < 0
          const TrendIcon = isPositive ? TrendingUp : TrendingDown

          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium">
                {card.title}
              </h3>
              <div className="flex items-baseline justify-between mt-2">
                <p className="text-3xl font-bold text-gray-800">
                  {card.value}
                </p>
                {hasTrend && (
                  <div
                    className={`flex items-center gap-1 text-sm font-semibold ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    <TrendIcon size={16} />
                    {Math.abs(card.trend!)}%
                  </div>
                )}
              </div>
              {hasTrend && (
                <p className="text-xs text-gray-500 mt-2">
                  vs mes anterior
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Alertas con botones de acción */}
      {stats.lowStockProducts > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-red-800 font-semibold text-sm sm:text-base">
                ⚠️ Tienes {stats.lowStockProducts} producto(s) con stock bajo
              </p>
            </div>
            <button
              onClick={openLowStockModal}
              className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              <span>Ver productos</span>
            </button>
          </div>
        </div>
      )}

      {stats.pendingOrders > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="text-yellow-600 flex-shrink-0" size={20} />
              <p className="text-yellow-800 font-semibold text-sm sm:text-base">
                📦 Tienes {stats.pendingOrders} orden(es) pendiente(s) de atención
              </p>
            </div>
            <button
              onClick={openPendingOrdersModal}
              className="w-full sm:w-auto px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              <Eye size={16} />
              <span>Ver órdenes</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabla de Últimas Órdenes */}
      <div className="mt-6 bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <ShoppingCart size={20} className="sm:w-6 sm:h-6 text-blue-600" />
          <span>Últimas Órdenes</span>
        </h2>
        {recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
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
                    <td className="py-3 px-4 text-xs font-semibold text-gray-900">
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

      {/* Contenido de la tab Inventario */}
      {activeTab === 'inventario' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            📦 Gestión de Inventario
          </h2>
          <p className="text-gray-600">
            Vista de inventario y movimientos (próximamente)
          </p>
        </div>
      )}

      {/* Contenido de la tab Actividad */}
      {activeTab === 'actividad' && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            🔄 Actividad Reciente
          </h2>
          <p className="text-gray-600">
            Registro de actividades (próximamente)
          </p>
        </div>
      )}

      {/* Botón flotante de acciones rápidas */}
      <button
        onClick={() => setShowQuickActionsModal(true)}
        className="fixed bottom-8 right-8 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 z-50"
        title="Acciones rápidas"
      >
        <Plus size={28} />
      </button>

      {/* Modal de Stock Bajo */}
      {showLowStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertCircle className="text-red-600" size={24} />
                Productos con Stock Bajo
              </h3>
              <button
                onClick={() => setShowLowStockModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4">
              {lowStockProducts.length > 0 ? (
                <div className="space-y-2">
                  {lowStockProducts.map((product: any) => (
                    <div
                      key={product.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{product.name}</p>
                        <p className="text-sm text-red-600">
                          Stock: {product.stock} (Mínimo: {product.minStock || 10})
                        </p>
                      </div>
                      <button
                        onClick={() => router.push('/products')}
                        className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                      >
                        <RotateCcw size={16} />
                        Reabastecer
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Cargando productos...
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
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                Acciones Rápidas
              </h3>
              <button
                onClick={() => setShowQuickActionsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/orders')
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="bg-blue-100 p-3 rounded-lg">
                  <ShoppingCart className="text-blue-600" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Nueva Orden</p>
                  <p className="text-sm text-gray-600">Crear orden de compra</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/products')
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
              >
                <div className="bg-green-100 p-3 rounded-lg">
                  <Package className="text-green-600" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Nuevo Producto</p>
                  <p className="text-sm text-gray-600">Agregar al inventario</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/clients')
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
              >
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Users className="text-purple-600" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Nuevo Cliente</p>
                  <p className="text-sm text-gray-600">Agregar cliente</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/orders')
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors"
              >
                <div className="bg-orange-100 p-3 rounded-lg">
                  <FileText className="text-orange-600" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Nueva Cotización</p>
                  <p className="text-sm text-gray-600">Generar cotización</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/orders')
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                <div className="bg-red-100 p-3 rounded-lg">
                  <RotateCw className="text-red-600" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Registrar Devolución</p>
                  <p className="text-sm text-gray-600">Procesar devolución</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/chat')
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition-colors"
              >
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <MessageSquare className="text-indigo-600" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Ver Chat</p>
                  <p className="text-sm text-gray-600">Mensajes de clientes</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActionsModal(false)
                  router.push('/dashboard')
                }}
                className="w-full flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <div className="bg-gray-100 p-3 rounded-lg">
                  <FileText className="text-gray-600" size={24} />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Generar Reporte</p>
                  <p className="text-sm text-gray-600">Exportar datos</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  )
}