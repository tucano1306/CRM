'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { 
  ShoppingCart, Package, Clock, CheckCircle, 
  TrendingUp, Store, Heart, MessageCircle, RefreshCw,
  ArrowUpRight, DollarSign, Plus, CreditCard, AlertCircle, ShoppingBag, X, Phone
} from 'lucide-react'
import Link from 'next/link'
import { DashboardStatsSkeleton } from '@/components/skeletons'
import { formatPrice } from '@/lib/utils'
import { useCartCount } from '@/hooks/useCartCount'

interface BuyerStats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalSpent: number
  lastOrderDate: string | null
}

interface RecentOrder {
  id: string
  orderNumber: string
  status: string
  totalAmount: number
  itemsCount: number
  createdAt: string
}

// ============ Helper Constants ============

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PREPARING: 'bg-indigo-100 text-indigo-800',
  READY_FOR_PICKUP: 'bg-cyan-100 text-cyan-800',
  IN_DELIVERY: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-teal-100 text-teal-800',
  PARTIALLY_DELIVERED: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELED: 'bg-red-100 text-red-800',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  PREPARING: 'Preparando',
  READY_FOR_PICKUP: 'Listo para Recoger',
  IN_DELIVERY: 'En Entrega',
  DELIVERED: 'Entregado',
  PARTIALLY_DELIVERED: 'Entrega Parcial',
  COMPLETED: 'Completada',
  CANCELED: 'Cancelada',
  PAYMENT_PENDING: 'Pago Pendiente',
  PAID: 'Pagado',
}

const ORDER_PROGRESS_MAP: Record<string, number> = {
  PENDING: 0,
  PAYMENT_PENDING: 10,
  CONFIRMED: 25,
  PREPARING: 50,
  READY_FOR_PICKUP: 65,
  IN_DELIVERY: 75,
  DELIVERED: 90,
  COMPLETED: 100,
  CANCELED: 0,
  PAID: 20,
}

// ============ Helper Functions ============

function getOrderProgress(status: string): number {
  return ORDER_PROGRESS_MAP[status] ?? 0
}

function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'
}

type ChartPeriod = '6months' | 'year' | 'all'

function getMonthCount(chartPeriod: ChartPeriod): number {
  if (chartPeriod === '6months') return 6
  if (chartPeriod === 'year') return 12
  return 24
}

function calculateMonthlyData(
  recentOrders: RecentOrder[],
  chartPeriod: ChartPeriod
) {
  const monthsData = []
  const now = new Date()
  const monthCount = getMonthCount(chartPeriod)

  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthOrders = recentOrders.filter(order => {
      const orderDate = new Date(order.createdAt)
      return orderDate.getMonth() === date.getMonth() && 
             orderDate.getFullYear() === date.getFullYear()
    })

    const totalAmount = monthOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0)
    
    monthsData.push({
      name: date.toLocaleDateString('es-ES', { month: 'short' }),
      amount: totalAmount,
      count: monthOrders.length
    })
  }

  const maxAmount = Math.max(...monthsData.map(m => m.amount), 1)
  return monthsData.map(month => ({
    ...month,
    percentage: (month.amount / maxAmount) * 100
  }))
}

function getCartLabel(cartCount: number): string {
  if (cartCount === 0) return 'Ver productos en carrito'
  const label = cartCount === 1 ? 'producto' : 'productos'
  return `${cartCount} ${label}`
}

// ============ Main Component ============

export default function BuyerDashboardPage() {
  const { user } = useUser()
  const { cartCount } = useCartCount()
  const [stats, setStats] = useState<BuyerStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('6months')
  const [activeTab, setActiveTab] = useState<'shop' | 'manage' | 'support'>('shop')
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [frequentProducts, setFrequentProducts] = useState<any[]>([])
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  const getMonthlyData = () => calculateMonthlyData(recentOrders, chartPeriod)

  useEffect(() => {
    fetchBuyerData()
    loadFrequentProducts()
  }, [])

  const loadFrequentProducts = async () => {
    try {
      const response = await fetch('/api/products/suggested')
      const result = await response.json()
      console.log('🔁 Frequent products:', result)
      if (result.success && result.data && Array.isArray(result.data)) {
        // Eliminar duplicados usando Map por ID
        const uniqueProducts = Array.from(
          new Map(result.data.map((p: any) => [p.id, p])).values()
        ).slice(0, 5)
        setFrequentProducts(uniqueProducts)
      }
    } catch (error) {
      console.error('Error loading frequent products:', error)
    }
  }

  const addToCart = async (productId: string) => {
    try {
      setAddingToCart(productId)
      
      console.log('🛒 Adding product to cart:', productId)
      
      const response = await fetch('/api/buyer/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 })
      })

      console.log('🛒 Response status:', response.status, response.statusText)
      
      // Verificar si la respuesta es JSON
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Server returned non-JSON response:', text.substring(0, 200))
        alert('❌ Error del servidor. Por favor, verifica que estés autenticado.')
        return
      }

      const result = await response.json()
      console.log('🛒 Cart API result:', result)

      if (result.success) {
        alert('✅ Producto agregado al carrito')
      } else {
        alert('❌ ' + (result.error || 'Error al agregar producto'))
      }
    } catch (error) {
      console.error('❌ Error adding to cart:', error)
      alert('❌ Error al agregar producto al carrito. Verifica tu conexión.')
    } finally {
      setAddingToCart(null)
    }
  }

  const fetchBuyerData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch('/api/buyer/stats'),
        fetch('/api/buyer/orders') // Obtener todas las órdenes para el gráfico
      ])

      if (statsRes.ok) {
        const result = await statsRes.json()
        console.log('📊 Stats response:', result)
        if (result.success) setStats(result.data)
      }

      if (ordersRes.ok) {
        const result = await ordersRes.json()
        console.log('📦 Orders response:', result)
        if (result.success) {
          // La API retorna { success: true, orders: [...] }
          const orders = result.orders || []
          console.log('📦 Processed orders:', orders.length, orders)
          setRecentOrders(orders)
        } else {
          setRecentOrders([])
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl">
          <div className="container mx-auto px-6 py-8">
            <h1 className="text-4xl font-bold mb-2">
              ¡Hola, Comprador! 👋
            </h1>
            <p className="text-purple-100 text-lg">Cargando tu panel de compras...</p>
          </div>
        </div>
        <div className="container mx-auto px-6 py-8">
          <DashboardStatsSkeleton />
        </div>
      </div>
    )
  }

  const hasImportantAlerts = recentOrders.some(
    order => order.status === 'PAYMENT_PENDING' || order.status === 'READY_FOR_PICKUP'
  )


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                ¡Hola, {user?.firstName || 'Comprador'}! 👋
              </h1>
              <p className="text-purple-100 text-lg">Bienvenido a tu panel de compras</p>
            </div>
            <Link href="/buyer/cart">
              <Button className="bg-white text-purple-600 hover:bg-purple-50 font-semibold px-6 py-3 relative shadow-lg hover:shadow-xl transition-all">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Mi Carrito
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 h-6 min-w-[24px] px-1.5 bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Notificaciones/Alertas Importantes */}
        {hasImportantAlerts && (
          <div className="space-y-3">
            {/* Órdenes pendientes de pago */}
            {recentOrders
              .filter(order => order.status === 'PAYMENT_PENDING')
              .slice(0, 2)
              .map(order => (
                <div key={order.id} className="bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-start gap-3 shadow-lg hover:shadow-xl transition-all">
                  <div className="bg-gradient-to-br from-amber-500 to-yellow-600 p-2 rounded-xl shadow-md">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-amber-900">Orden pendiente de pago</p>
                    <p className="text-sm text-amber-700 font-medium">
                      Orden #{order.orderNumber} - {formatPrice(Number(order.totalAmount))}
                    </p>
                  </div>
                  <Link href={`/buyer/orders`}>
                    <button className="bg-gradient-to-r from-amber-600 to-yellow-600 text-white px-4 py-2 rounded-lg hover:from-amber-700 hover:to-yellow-700 transition-all font-semibold shadow-md">
                      Pagar ahora
                    </button>
                  </Link>
                </div>
              ))}

            {/* Órdenes listas para recoger */}
            {recentOrders
              .filter(order => order.status === 'READY_FOR_PICKUP')
              .slice(0, 2)
              .map(order => (
                <div key={order.id} className="bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-500 p-4 rounded-xl flex items-start gap-3 shadow-lg hover:shadow-xl transition-all">
                  <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-xl shadow-md">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-emerald-900">¡Tu orden está lista!</p>
                    <p className="text-sm text-emerald-700 font-medium">
                      Orden #{order.orderNumber} - Puedes recogerla hoy
                    </p>
                  </div>
                  <Link href={`/buyer/orders`}>
                    <button className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-lg hover:from-emerald-700 hover:to-green-700 transition-all font-semibold shadow-md">
                      Ver detalles
                    </button>
                  </Link>
                </div>
              ))}
          </div>
        )}

        {/* Stats Cards Interactivas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Link href="/buyer/orders?status=all">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-purple-500 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-2 rounded-xl shadow-md">
                  <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Total Órdenes</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats?.totalOrders || 0}</p>
              <p className="text-xs text-gray-500 font-medium">
                {stats?.totalOrders && stats.totalOrders > 0 ? `↗️ Ver todas` : 'Aún no tienes órdenes'}
              </p>
            </div>
          </Link>

          <Link href="/buyer/orders?status=PENDING">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-amber-500 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-amber-500 to-amber-700 p-2 rounded-xl shadow-md">
                  <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">En Proceso</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats?.pendingOrders || 0}</p>
              <p className="text-xs text-gray-500 font-medium">
                {stats?.pendingOrders && stats.pendingOrders > 0 ? `↗️ ${stats.pendingOrders} pendientes` : 'Todo al día'}
              </p>
            </div>
          </Link>

          <Link href="/buyer/orders?status=COMPLETED">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-emerald-500 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-xl shadow-md">
                  <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Completadas</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{stats?.completedOrders || 0}</p>
              <p className="text-xs text-gray-500 font-medium">
                {stats?.completedOrders && stats.completedOrders > 0 ? `↗️ ${stats.completedOrders} exitosas` : 'Sin completar aún'}
              </p>
            </div>
          </Link>

          <Link href="/buyer/orders">
            <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-cyan-500 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl shadow-md">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Total Gastado</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{formatPrice(stats?.totalSpent || 0)}</p>
              <p className="text-xs text-gray-500 font-medium">
                {stats?.totalSpent && stats.totalSpent > 0 ? `↗️ Ver detalles` : 'Comienza a comprar'}
              </p>
            </div>
          </Link>
        </div>

        {/* Gráfico de Gastos Mensuales */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
              📊 Gastos Mensuales
            </h3>
            <select 
              value={chartPeriod}
              onChange={(e) => setChartPeriod(e.target.value as ChartPeriod)}
              className="px-4 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-medium text-gray-700 bg-white shadow-sm hover:border-purple-400 transition-colors"
            >
              <option value="6months">Últimos 6 meses</option>
              <option value="year">Este año</option>
              <option value="all">Todo el tiempo</option>
            </select>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-purple-200 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No hay datos para mostrar aún</p>
              <p className="text-sm text-gray-500 mt-2">Realiza tu primera compra para ver estadísticas</p>
            </div>
          ) : (
            <>
              {/* Gráfico de barras */}
              <div className="flex items-end justify-between gap-2 h-48 px-4">
                {getMonthlyData().map((month, index) => (
                  <div key={month.name} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                        {formatPrice(month.amount)}
                        <div className="text-xs text-purple-100">{month.count} órdenes</div>
                      </div>
                      <div 
                        className="w-full bg-gradient-to-t from-purple-500 to-indigo-500 rounded-t-lg hover:from-purple-600 hover:to-indigo-600 transition-all cursor-pointer shadow-md"
                        style={{ 
                          height: `${Math.max(month.percentage, 5)}%`,
                          minHeight: month.amount > 0 ? '20px' : '5px'
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-2 font-semibold">{month.name}</p>
                  </div>
                ))}
              </div>

              {/* Resumen del gráfico */}
              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {formatPrice(getMonthlyData().reduce((sum, m) => sum + m.amount, 0))}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 font-medium">Total del período</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {getMonthlyData().reduce((sum, m) => sum + m.count, 0)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 font-medium">Órdenes realizadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatPrice(getMonthlyData().reduce((sum, m) => sum + m.amount, 0) / Math.max(getMonthlyData().reduce((sum, m) => sum + m.count, 0), 1))}
                  </p>
                  <p className="text-sm text-gray-600 mt-1 font-medium">Promedio por orden</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Compra Nuevamente - Productos Frecuentes */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6 mb-8">
          <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-6">🔁 Compra Nuevamente</h3>
          
          {frequentProducts.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-purple-200 mx-auto mb-3" />
              <p className="text-gray-600 text-sm font-medium">Realiza tu primera compra para ver recomendaciones</p>
              <Link href="/buyer/catalog">
                <Button className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md">
                  Explorar Catálogo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {frequentProducts.map(product => (
                <div key={product.id} className="border-2 border-gray-200 rounded-xl p-4 hover:border-purple-400 hover:shadow-lg transition-all">
                  <div className="w-full h-24 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg mb-3 flex items-center justify-center">
                    <Package className="w-12 h-12 text-purple-400" />
                  </div>
                  <p className="text-sm font-semibold mb-2 line-clamp-2 text-gray-900">{product.name}</p>
                  <p className="text-purple-600 font-bold mb-1">{formatPrice(Number(product.price))}</p>
                  <button 
                    onClick={() => addToCart(product.id)}
                    disabled={addingToCart === product.id}
                    className="w-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 py-2 rounded-lg hover:from-purple-200 hover:to-indigo-200 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingToCart === product.id ? 'Agregando...' : 'Agregar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acciones Rápidas con Tabs */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6">
            <h2 className="text-2xl font-bold text-white">Acciones Rápidas</h2>
          </div>
          
          <div className="flex border-b border-gray-200">
            <button 
              onClick={() => setActiveTab('shop')}
              className={`flex-1 py-4 font-semibold transition-all ${
                activeTab === 'shop' 
                  ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              🛒 Comprar
            </button>
            <button 
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-4 font-semibold transition-all ${
                activeTab === 'manage' 
                  ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              📋 Gestionar
            </button>
            <button 
              onClick={() => setActiveTab('support')}
              className={`flex-1 py-4 font-semibold transition-all ${
                activeTab === 'support' 
                  ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              💬 Soporte
            </button>
          </div>
          
          <div className="p-6">
            {/* Tab: Comprar */}
            {activeTab === 'shop' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/buyer/catalog">
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
                        <Store className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-purple-900">Ver Catálogo</h3>
                        <p className="text-sm text-purple-700 font-medium">Explora productos disponibles</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/cart">
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 rounded-xl transition-all cursor-pointer relative shadow-md hover:shadow-lg border border-emerald-200">
                    <div className="flex items-center gap-3">
                      <div className="relative bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-lg">
                        <ShoppingCart className="h-6 w-6 text-white" />
                        {cartCount > 0 && (
                          <span className="absolute -top-2 -right-2 h-5 min-w-[20px] px-1 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                            {cartCount > 9 ? '9+' : cartCount}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-emerald-900">Mi Carrito</h3>
                        <p className="text-sm text-emerald-700 font-medium">
                          {getCartLabel(cartCount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/recurring-orders">
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg border border-amber-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-lg">
                        <RefreshCw className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-900">Órdenes Recurrentes</h3>
                        <p className="text-sm text-amber-700 font-medium">Automatiza tus pedidos</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/catalog?featured=true">
                  <div className="p-4 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg border border-rose-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-2 rounded-lg">
                        <Heart className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-rose-900">Favoritos</h3>
                        <p className="text-sm text-rose-700 font-medium">Productos que te gustan</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Tab: Gestionar */}
            {activeTab === 'manage' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/buyer/orders">
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg border border-indigo-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-lg">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-indigo-900">Mis Órdenes</h3>
                        <p className="text-sm text-indigo-700 font-medium">Ver historial de pedidos</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/recurring-orders">
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg border border-amber-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-lg">
                        <RefreshCw className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-900">Órdenes Recurrentes</h3>
                        <p className="text-sm text-amber-700 font-medium">Automatiza tus pedidos</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/orders">
                  <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 hover:from-teal-100 hover:to-cyan-100 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg border border-teal-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-teal-500 to-cyan-600 p-2 rounded-lg">
                        <CreditCard className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-teal-900">Pagos</h3>
                        <p className="text-sm text-teal-700 font-medium">Historial de pagos</p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}

            {/* Tab: Soporte */}
            {activeTab === 'support' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/buyer/chat">
                  <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl transition-all cursor-pointer shadow-lg hover:shadow-xl">
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                        <MessageCircle className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Chat con Vendedor</h3>
                        <p className="text-sm text-purple-100 font-medium">Envía mensajes directos</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-2 rounded-lg">
                      <MessageCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900">Centro de Ayuda</h3>
                      <p className="text-sm text-blue-700 font-medium">Preguntas frecuentes</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-green-900">Rastreo de Envío</h3>
                      <p className="text-sm text-green-700 font-medium">Sigue tus pedidos</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg border border-yellow-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-yellow-500 to-amber-600 p-2 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-yellow-900">Reportar Problema</h3>
                      <p className="text-sm text-yellow-700 font-medium">Ayúdanos a mejorar</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Órdenes Recientes */}
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">📦 Órdenes Recientes</h3>
            <Link href="/buyer/orders" className="text-purple-600 hover:text-purple-700 font-semibold text-sm flex items-center gap-1 transition-colors">
              Ver todas <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-purple-200 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No hay órdenes aún</p>
              <Link href="/buyer/catalog">
                <Button className="mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md">
                  Explorar Catálogo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.slice(0, 5).map((order) => (
                <Link key={order.id} href="/buyer/orders">
                  <div 
                    className="border-2 border-gray-200 rounded-xl p-3 sm:p-4 hover:border-purple-400 hover:shadow-lg transition-all cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm sm:text-base">#{order.orderNumber}</p>
                          <p className="text-xs sm:text-sm text-gray-600 font-medium">{order.itemsCount} productos</p>
                        </div>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap flex-shrink-0 ${getStatusColor(order.status)}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    
                    {/* Barra de progreso */}
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all shadow-sm"
                          style={{ width: `${getOrderProgress(order.status)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs sm:text-sm text-gray-600 font-medium">
                        {new Date(order.createdAt).toLocaleDateString('es-ES', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="text-base sm:text-lg font-bold text-purple-600">
                        {formatPrice(Number(order.totalAmount))}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Flotantes */}
      <div className="fixed bottom-6 right-4 sm:right-6 z-50">
        <button 
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-all hover:shadow-purple-500/50"
        >
          {showQuickActions ? <X className="w-5 h-5 sm:w-6 sm:w-6" /> : <Plus className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
        
        {/* Menu de acciones */}
        {showQuickActions && (
          <div className="absolute bottom-16 sm:bottom-20 right-0 space-y-2 sm:space-y-3 animate-scale-in min-w-[180px] sm:min-w-[200px]">
            <Link href="/buyer/catalog">
              <button className="flex items-center gap-2 sm:gap-3 bg-white shadow-lg rounded-full px-4 sm:px-6 py-2 sm:py-3 hover:shadow-xl transition-all w-full whitespace-nowrap border-2 border-purple-200 hover:border-purple-400">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                <span className="font-semibold text-gray-900 text-sm sm:text-base">Nueva orden</span>
              </button>
            </Link>
            <Link href="/buyer/chat">
              <button className="flex items-center gap-2 sm:gap-3 bg-white shadow-lg rounded-full px-4 sm:px-6 py-2 sm:py-3 hover:shadow-xl transition-all w-full whitespace-nowrap border-2 border-indigo-200 hover:border-indigo-400">
                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                <span className="font-semibold text-gray-900 text-sm sm:text-base">Chat</span>
              </button>
            </Link>
            <button className="flex items-center gap-2 sm:gap-3 bg-white shadow-lg rounded-full px-4 sm:px-6 py-2 sm:py-3 hover:shadow-xl transition-all w-full whitespace-nowrap border-2 border-emerald-200 hover:border-emerald-400">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold text-gray-900 text-sm sm:text-base">Ayuda</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}