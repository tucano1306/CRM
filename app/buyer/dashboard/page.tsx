'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ShoppingCart, Package, Clock, CheckCircle, 
  TrendingUp, Store, Heart, MessageCircle, RefreshCw,
  ArrowUpRight, DollarSign, Plus, CreditCard, FileText, AlertCircle, ShoppingBag, X, Phone, Lightbulb
} from 'lucide-react'
import Link from 'next/link'
import { DashboardStatsSkeleton } from '@/components/skeletons'

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

export default function BuyerDashboardPage() {
  const { user } = useUser()
  const [stats, setStats] = useState<BuyerStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [chartPeriod, setChartPeriod] = useState<'6months' | 'year' | 'all'>('6months')
  const [activeTab, setActiveTab] = useState<'shop' | 'manage' | 'support'>('shop')
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([])
  const [frequentProducts, setFrequentProducts] = useState<any[]>([])
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  // Datos del programa de fidelidad (en producción vendrían de la API)
  const loyaltyData = {
    currentPoints: 1250,
    nextReward: 1500,
    pointsToNextReward: 250,
    progressPercentage: 83,
    currentLevel: 'Gold',
    nextLevel: 'Platinum'
  }


  // Calcular datos mensuales para el gráfico
  const getMonthlyData = () => {
    const monthsData = []
    const now = new Date()
    const monthCount = chartPeriod === '6months' ? 6 : chartPeriod === 'year' ? 12 : 24

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

    // Calcular porcentajes para la altura de las barras
    const maxAmount = Math.max(...monthsData.map(m => m.amount), 1)
    return monthsData.map(month => ({
      ...month,
      percentage: (month.amount / maxAmount) * 100
    }))
  }

  useEffect(() => {
    fetchBuyerData()
    loadFeaturedProducts()
    loadFrequentProducts()
  }, [])

  const loadFeaturedProducts = async () => {
    try {
      const response = await fetch('/api/products/popular')
      const result = await response.json()
      console.log('🌟 Featured products:', result)
      if (result.success && result.data && Array.isArray(result.data)) {
        // Eliminar duplicados usando Map por ID
        const uniqueProducts = Array.from(
          new Map(result.data.map((p: any) => [p.id, p])).values()
        ).slice(0, 4)
        setFeaturedProducts(uniqueProducts)
      }
    } catch (error) {
      console.error('Error loading featured products:', error)
    }
  }

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
      if (!contentType || !contentType.includes('application/json')) {
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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl">
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

  const statusColors: Record<string, string> = {
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

  const statusLabels: Record<string, string> = {
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

  // Función para obtener el progreso de una orden
  const getOrderProgress = (status: string): number => {
    const progressMap: Record<string, number> = {
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
    return progressMap[status] || 0
  }

  // Función para obtener color de estado
  const getStatusColor = (status: string): string => {
    return statusColors[status] || 'bg-gray-100 text-gray-800'
  }

  // Detectar alertas importantes
  const hasImportantAlerts = recentOrders.some(
    order => order.status === 'PAYMENT_PENDING' || order.status === 'READY_FOR_PICKUP'
  )


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 text-white shadow-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                ¡Hola, {user?.firstName || 'Comprador'}! 👋
              </h1>
              <p className="text-slate-200 text-lg">Bienvenido a tu panel de compras</p>
            </div>
            <Link href="/buyer/cart">
              <Button className="bg-white text-slate-800 hover:bg-slate-100 font-semibold px-6 py-3">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Mi Carrito
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
                <div key={order.id} className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg flex items-start gap-3 shadow-md hover:shadow-lg transition-shadow">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-yellow-800">Orden pendiente de pago</p>
                    <p className="text-sm text-yellow-700">
                      Orden #{order.orderNumber} - ${Number(order.totalAmount).toFixed(2)}
                    </p>
                  </div>
                  <Link href={`/buyer/orders`}>
                    <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors font-medium">
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
                <div key={order.id} className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg flex items-start gap-3 shadow-md hover:shadow-lg transition-shadow">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-green-800">¡Tu orden está lista!</p>
                    <p className="text-sm text-green-700">
                      Orden #{order.orderNumber} - Puedes recogerla hoy
                    </p>
                  </div>
                  <Link href={`/buyer/orders`}>
                    <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium">
                      Ver detalles
                    </button>
                  </Link>
                </div>
              ))}
          </div>
        )}

        {/* Programa de Fidelidad */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">🎁 Programa de Fidelidad</h3>
              <p className="text-emerald-100 mb-4">Acumula puntos con cada compra</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">{loyaltyData.currentPoints.toLocaleString()}</span>
                <span className="text-xl">puntos</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-emerald-100 mb-2">Próxima recompensa en</p>
              <p className="text-3xl font-bold">{loyaltyData.pointsToNextReward}</p>
              <p className="text-sm">puntos</p>
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="mt-6">
            <div className="bg-white/30 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-white h-3 rounded-full transition-all" 
                style={{ width: `${loyaltyData.progressPercentage}%` }} 
              />
            </div>
            <p className="text-sm text-emerald-100 mt-2">
              {loyaltyData.progressPercentage}% hacia tu siguiente nivel ({loyaltyData.nextLevel})
            </p>
          </div>
        </div>

        {/* Stats Cards Interactivas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/buyer/orders?status=all">
            <div className="bg-gradient-to-br from-slate-700 to-slate-800 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <Package className="w-12 h-12 opacity-80" />
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <p className="text-4xl font-bold mb-2">{stats?.totalOrders || 0}</p>
              <p className="text-slate-200">Total Órdenes</p>
              <p className="text-xs text-slate-300 mt-2">
                {stats?.totalOrders && stats.totalOrders > 0 ? `↗️ Ver todas` : 'Aún no tienes órdenes'}
              </p>
            </div>
          </Link>

          <Link href="/buyer/orders?status=PENDING">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-12 h-12 opacity-80" />
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <p className="text-4xl font-bold mb-2">{stats?.pendingOrders || 0}</p>
              <p className="text-amber-100">En Proceso</p>
              <p className="text-xs text-amber-200 mt-2">
                {stats?.pendingOrders && stats.pendingOrders > 0 ? `↗️ ${stats.pendingOrders} pendientes` : 'Todo al día'}
              </p>
            </div>
          </Link>

          <Link href="/buyer/orders?status=COMPLETED">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle className="w-12 h-12 opacity-80" />
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <p className="text-4xl font-bold mb-2">{stats?.completedOrders || 0}</p>
              <p className="text-emerald-100">Completadas</p>
              <p className="text-xs text-emerald-200 mt-2">
                {stats?.completedOrders && stats.completedOrders > 0 ? `↗️ ${stats.completedOrders} exitosas` : 'Sin completar aún'}
              </p>
            </div>
          </Link>

          <Link href="/buyer/orders">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-12 h-12 opacity-80" />
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold mb-2">${stats?.totalSpent?.toFixed(2) || '0.00'}</p>
              <p className="text-blue-100">Total Gastado</p>
              <p className="text-xs text-blue-200 mt-2">
                {stats?.totalSpent && stats.totalSpent > 0 ? `↗️ Ver detalles` : 'Comienza a comprar'}
              </p>
            </div>
          </Link>
        </div>

        {/* Gráfico de Gastos Mensuales */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              📊 Gastos Mensuales
            </h3>
            <select 
              value={chartPeriod}
              onChange={(e) => setChartPeriod(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
            >
              <option value="6months">Últimos 6 meses</option>
              <option value="year">Este año</option>
              <option value="all">Todo el tiempo</option>
            </select>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay datos para mostrar aún</p>
              <p className="text-sm text-gray-400 mt-2">Realiza tu primera compra para ver estadísticas</p>
            </div>
          ) : (
            <>
              {/* Gráfico de barras */}
              <div className="flex items-end justify-between gap-2 h-48 px-4">
                {getMonthlyData().map((month, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center group">
                    <div className="relative w-full">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-3 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        ${month.amount.toFixed(2)}
                        <div className="text-xs text-gray-300">{month.count} órdenes</div>
                      </div>
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-teal-500 rounded-t-lg hover:from-blue-600 hover:to-teal-600 transition-all cursor-pointer"
                        style={{ 
                          height: `${Math.max(month.percentage, 5)}%`,
                          minHeight: month.amount > 0 ? '20px' : '5px'
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 font-medium">{month.name}</p>
                  </div>
                ))}
              </div>

              {/* Resumen del gráfico */}
              <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    ${getMonthlyData().reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Total del período</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-700">
                    {getMonthlyData().reduce((sum, m) => sum + m.count, 0)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Órdenes realizadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${(getMonthlyData().reduce((sum, m) => sum + m.amount, 0) / Math.max(getMonthlyData().reduce((sum, m) => sum + m.count, 0), 1)).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Promedio por orden</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Productos Destacados */}
        <div className="bg-gradient-to-r from-blue-50 to-slate-50 rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">✨ Productos Destacados</h3>
            <Link href="/buyer/catalog" className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1">
              Ver todos <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          {featuredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No hay productos destacados disponibles</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-xl p-4 shadow-md hover:shadow-xl transition-all group">
                  <div className="relative h-32 bg-gradient-to-br from-blue-100 to-slate-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                    <Package className="w-16 h-16 text-slate-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h4 className="font-medium text-sm mb-2 text-gray-900 line-clamp-2">{product.name}</h4>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-600 font-bold text-lg">${Number(product.price).toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => addToCart(product.id)}
                    disabled={addingToCart === product.id}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {addingToCart === product.id ? (
                      <>Agregando...</>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Agregar
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compra Nuevamente - Productos Frecuentes */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6">🔁 Compra Nuevamente</h3>
          
          {frequentProducts.length === 0 ? (
            <div className="text-center py-8">
              <RefreshCw className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Realiza tu primera compra para ver recomendaciones</p>
              <Link href="/buyer/catalog">
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                  Explorar Catálogo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {frequentProducts.map(product => (
                <div key={product.id} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all">
                  <div className="w-full h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium mb-2 line-clamp-2 text-gray-900">{product.name}</p>
                  <p className="text-blue-600 font-bold mb-1">${Number(product.price).toFixed(2)}</p>
                  <button 
                    onClick={() => addToCart(product.id)}
                    disabled={addingToCart === product.id}
                    className="w-full bg-blue-100 text-blue-700 py-2 rounded-lg hover:bg-blue-200 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingToCart === product.id ? 'Agregando...' : 'Agregar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tips/Ayuda Contextual */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-blue-900 mb-2">💡 Tip del día</h4>
              <p className="text-blue-800 mb-3">
                Completa tu perfil para recibir recomendaciones personalizadas y ofertas exclusivas basadas en tus preferencias.
              </p>
              <Link href="/buyer/profile">
                <button className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline transition-all">
                  Completar perfil →
                </button>
              </Link>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas con Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-700 to-blue-800 p-6">
            <h2 className="text-2xl font-bold text-white">Acciones Rápidas</h2>
          </div>
          
          <div className="flex border-b">
            <button 
              onClick={() => setActiveTab('shop')}
              className={`flex-1 py-4 font-medium transition-colors ${
                activeTab === 'shop' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              🛒 Comprar
            </button>
            <button 
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-4 font-medium transition-colors ${
                activeTab === 'manage' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              📋 Gestionar
            </button>
            <button 
              onClick={() => setActiveTab('support')}
              className={`flex-1 py-4 font-medium transition-colors ${
                activeTab === 'support' 
                  ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' 
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
                  <div className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Store className="h-8 w-8 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-blue-900">Ver Catálogo</h3>
                        <p className="text-sm text-blue-700">Explora productos disponibles</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/cart">
                  <div className="p-4 bg-green-50 hover:bg-green-100 rounded-xl transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <ShoppingCart className="h-8 w-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold text-green-900">Mi Carrito</h3>
                        <p className="text-sm text-green-700">Ver productos en carrito</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/recurring-orders">
                  <div className="p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-8 w-8 text-orange-600" />
                      <div>
                        <h3 className="font-semibold text-orange-900">Órdenes Recurrentes</h3>
                        <p className="text-sm text-orange-700">Automatiza tus pedidos</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/catalog?featured=true">
                  <div className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Heart className="h-8 w-8 text-purple-600" />
                      <div>
                        <h3 className="font-semibold text-purple-900">Favoritos</h3>
                        <p className="text-sm text-purple-700">Productos que te gustan</p>
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
                  <div className="p-4 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Package className="h-8 w-8 text-indigo-600" />
                      <div>
                        <h3 className="font-semibold text-indigo-900">Mis Órdenes</h3>
                        <p className="text-sm text-indigo-700">Ver historial de pedidos</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/returns">
                  <div className="p-4 bg-red-50 hover:bg-red-100 rounded-xl transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-8 w-8 text-red-600" />
                      <div>
                        <h3 className="font-semibold text-red-900">Devoluciones</h3>
                        <p className="text-sm text-red-700">Gestionar devoluciones</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/credit-notes">
                  <div className="p-4 bg-teal-50 hover:bg-teal-100 rounded-xl transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-teal-600" />
                      <div>
                        <h3 className="font-semibold text-teal-900">Notas de Crédito</h3>
                        <p className="text-sm text-teal-700">Ver tus créditos</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <Link href="/buyer/orders">
                  <div className="p-4 bg-amber-50 hover:bg-amber-100 rounded-xl transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-8 w-8 text-amber-600" />
                      <div>
                        <h3 className="font-semibold text-amber-900">Pagos</h3>
                        <p className="text-sm text-amber-700">Historial de pagos</p>
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
                  <div className="p-4 bg-gradient-to-r from-slate-700 to-blue-700 hover:from-slate-800 hover:to-blue-800 rounded-xl transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-8 w-8 text-white" />
                      <div>
                        <h3 className="font-semibold text-white">Chat con Vendedor</h3>
                        <p className="text-sm text-slate-200">Envía mensajes directos</p>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">Centro de Ayuda</h3>
                      <p className="text-sm text-blue-700">Preguntas frecuentes</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 hover:bg-green-100 rounded-xl transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Package className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900">Rastreo de Envío</h3>
                      <p className="text-sm text-green-700">Sigue tus pedidos</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 hover:bg-yellow-100 rounded-xl transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
                    <div>
                      <h3 className="font-semibold text-yellow-900">Reportar Problema</h3>
                      <p className="text-sm text-yellow-700">Ayúdanos a mejorar</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Órdenes Recientes */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">📦 Órdenes Recientes</h3>
            <Link href="/buyer/orders" className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1">
              Ver todas <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No hay órdenes aún</p>
              <Link href="/buyer/catalog">
                <Button className="mt-4 bg-purple-600 hover:bg-purple-700">
                  Explorar Catálogo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentOrders.slice(0, 5).map((order) => (
                <Link key={order.id} href="/buyer/orders">
                  <div 
                    className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">#{order.orderNumber}</p>
                          <p className="text-sm text-gray-500">{order.itemsCount} productos</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </div>
                    
                    {/* Barra de progreso */}
                    <div className="mb-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all"
                          style={{ width: `${getOrderProgress(order.status)}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString('es-ES', { 
                          day: 'numeric', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="text-lg font-bold text-blue-600">
                        ${Number(order.totalAmount).toFixed(2)}
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
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setShowQuickActions(!showQuickActions)}
          className="w-14 h-14 bg-gradient-to-r from-slate-700 to-blue-700 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform"
        >
          {showQuickActions ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
        
        {/* Menu de acciones */}
        {showQuickActions && (
          <div className="absolute bottom-20 right-0 space-y-3 animate-scale-in">
            <Link href="/buyer/catalog">
              <button className="flex items-center gap-3 bg-white shadow-lg rounded-full px-6 py-3 hover:shadow-xl transition-all w-full">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-900">Nueva orden</span>
              </button>
            </Link>
            <Link href="/buyer/chat">
              <button className="flex items-center gap-3 bg-white shadow-lg rounded-full px-6 py-3 hover:shadow-xl transition-all w-full">
                <MessageCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Chat</span>
              </button>
            </Link>
            <button className="flex items-center gap-3 bg-white shadow-lg rounded-full px-6 py-3 hover:shadow-xl transition-all w-full">
              <Phone className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900">Ayuda</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}