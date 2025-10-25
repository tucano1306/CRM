'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ShoppingCart, Package, Clock, CheckCircle, 
  TrendingUp, Store, Heart, MessageCircle, RefreshCw,
  ArrowUpRight, DollarSign, Plus, CreditCard, FileText, AlertCircle
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

  // Productos destacados simulados (en producción vendrían de la API)
  const featuredProducts = [
    { id: 1, name: 'Pizza Margarita', price: 12.99, image: '/placeholder-pizza.jpg', discount: 20 },
    { id: 2, name: 'Hamburguesa Clásica', price: 8.99, image: '/placeholder-burger.jpg', discount: 15 },
    { id: 3, name: 'Ensalada Caesar', price: 6.99, image: '/placeholder-salad.jpg', discount: 10 },
    { id: 4, name: 'Pasta Carbonara', price: 10.99, image: '/placeholder-pasta.jpg', discount: 20 },
  ]

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
  }, [])

  const fetchBuyerData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch('/api/buyer/stats'),
        fetch('/api/buyer/orders') // Obtener todas las órdenes para el gráfico
      ])

      if (statsRes.ok) {
        const result = await statsRes.json()
        if (result.success) setStats(result.data)
      }

      if (ordersRes.ok) {
        const result = await ordersRes.json()
        if (result.success) setRecentOrders(result.data.orders || result.data)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                ¡Hola, {user?.firstName || 'Comprador'}! 👋
              </h1>
              <p className="text-purple-100 text-lg">Bienvenido a tu panel de compras</p>
            </div>
            <Link href="/buyer/cart">
              <Button className="bg-white text-purple-600 hover:bg-purple-50 font-semibold px-6 py-3">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Mi Carrito
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Stats Cards Interactivas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/buyer/orders?status=all">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <Package className="w-12 h-12 opacity-80" />
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <p className="text-4xl font-bold mb-2">{stats?.totalOrders || 0}</p>
              <p className="text-blue-100">Total Órdenes</p>
              <p className="text-xs text-blue-200 mt-2">
                {stats?.totalOrders && stats.totalOrders > 0 ? `↗️ Ver todas` : 'Aún no tienes órdenes'}
              </p>
            </div>
          </Link>

          <Link href="/buyer/orders?status=PENDING">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <Clock className="w-12 h-12 opacity-80" />
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <p className="text-4xl font-bold mb-2">{stats?.pendingOrders || 0}</p>
              <p className="text-orange-100">En Proceso</p>
              <p className="text-xs text-orange-200 mt-2">
                {stats?.pendingOrders && stats.pendingOrders > 0 ? `↗️ ${stats.pendingOrders} pendientes` : 'Todo al día'}
              </p>
            </div>
          </Link>

          <Link href="/buyer/orders?status=COMPLETED">
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <CheckCircle className="w-12 h-12 opacity-80" />
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <p className="text-4xl font-bold mb-2">{stats?.completedOrders || 0}</p>
              <p className="text-green-100">Completadas</p>
              <p className="text-xs text-green-200 mt-2">
                {stats?.completedOrders && stats.completedOrders > 0 ? `↗️ ${stats.completedOrders} exitosas` : 'Sin completar aún'}
              </p>
            </div>
          </Link>

          <Link href="/buyer/orders">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <DollarSign className="w-12 h-12 opacity-80" />
                <ArrowUpRight className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold mb-2">${stats?.totalSpent?.toFixed(2) || '0.00'}</p>
              <p className="text-purple-100">Total Gastado</p>
              <p className="text-xs text-purple-200 mt-2">
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
                        className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t-lg hover:from-purple-600 hover:to-pink-600 transition-all cursor-pointer"
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
                  <p className="text-2xl font-bold text-purple-600">
                    ${getMonthlyData().reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Total del período</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {getMonthlyData().reduce((sum, m) => sum + m.count, 0)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Órdenes realizadas</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    ${(getMonthlyData().reduce((sum, m) => sum + m.amount, 0) / Math.max(getMonthlyData().reduce((sum, m) => sum + m.count, 0), 1)).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Promedio por orden</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Productos Destacados */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900">✨ Productos Destacados</h3>
            <Link href="/buyer/catalog" className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1">
              Ver todos <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featuredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-xl p-4 shadow-md hover:shadow-xl transition-all cursor-pointer group">
                <div className="relative h-32 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center">
                  <Package className="w-16 h-16 text-purple-300 group-hover:scale-110 transition-transform" />
                  {product.discount > 0 && (
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      -{product.discount}%
                    </span>
                  )}
                </div>
                <h4 className="font-medium text-sm mb-2 text-gray-900 line-clamp-2">{product.name}</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-purple-600 font-bold text-lg">${product.price}</span>
                    {product.discount > 0 && (
                      <span className="text-gray-400 text-xs line-through ml-1">
                        ${(product.price / (1 - product.discount / 100)).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <button className="p-2 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors">
                    <Plus className="w-4 h-4 text-purple-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Acciones Rápidas con Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-6">
            <h2 className="text-2xl font-bold text-white">Acciones Rápidas</h2>
          </div>
          
          <div className="flex border-b">
            <button 
              onClick={() => setActiveTab('shop')}
              className={`flex-1 py-4 font-medium transition-colors ${
                activeTab === 'shop' 
                  ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              🛒 Comprar
            </button>
            <button 
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-4 font-medium transition-colors ${
                activeTab === 'manage' 
                  ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50' 
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              📋 Gestionar
            </button>
            <button 
              onClick={() => setActiveTab('support')}
              className={`flex-1 py-4 font-medium transition-colors ${
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
                  <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition cursor-pointer">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-8 w-8 text-white" />
                      <div>
                        <h3 className="font-semibold text-white">Chat con Vendedor</h3>
                        <p className="text-sm text-purple-100">Envía mensajes directos</p>
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
        <div className="grid grid-cols-1 gap-6">
          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <CardTitle className="flex items-center justify-between">
                <span>Órdenes Recientes</span>
                <Link href="/buyer/orders">
                  <Button variant="ghost" className="text-white hover:bg-white/20">
                    Ver todas
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
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
                    <div key={order.id} className="p-4 border rounded-xl hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-semibold">#{order.orderNumber}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                              {statusLabels[order.status]}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {order.itemsCount} productos • {new Date(order.createdAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        // ✅ CORRECTO
                        <p className="text-2xl font-bold">${Number(order.totalAmount).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}