'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, AlertTriangle, Activity } from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface DashboardData {
  overview: {
    totalClients: number
    activeClients: number
    totalProducts: number
    lowStockProducts: number
    totalSellers: number
    totalOrders: number
    pendingOrders: number
    completedOrders: number
    canceledOrders: number
    totalRevenue: number
    averageOrderValue: number
  }
  ordersByStatus: Array<{
    status: string
    count: number
    totalAmount: number
  }>
  recentPerformance: {
    last7Days: {
      orders: number
      revenue: number
      
    }
    currentMonth: {
      orders: number
      revenue: number
    }
     dailyStats: Array<{
    date: string
    orders: number
    revenue: number
  }>
  
  }
  topProducts: Array<{
    productId: string
    productName: string
    totalSold: number
    totalRevenue: number
    ordersCount: number
  }>
}

interface SalesData {
  dailySales: Array<{
    date: string
    orders: number
    revenue: number
  }>
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [salesData, setSalesData] = useState<SalesData | null>(null)

  useEffect(() => {
    fetchDashboardData()
    fetchSalesData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setDashboardData(result.data)
        }
      }
    } catch (error) {
      console.error('Error al cargar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSalesData = async () => {
    try {
      const response = await fetch('/api/analytics/sales?period=month')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSalesData(result.data)
        }
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando dashboard...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!dashboardData) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">No se pudieron cargar los datos del dashboard</p>
        </div>
      </MainLayout>
    )
  }

  const { overview, recentPerformance, topProducts } = dashboardData

  const cards = [
    {
      title: 'Total Productos',
      value: overview.totalProducts,
      description: `${overview.lowStockProducts} con stock bajo`,
      icon: Package,
      bgClass: 'bg-gradient-to-br from-blue-50 to-blue-100',
      iconClass: 'text-blue-600',
      alert: overview.lowStockProducts > 0
    },
    {
      title: 'Total Clientes',
      value: overview.totalClients,
      description: `${overview.activeClients} activos`,
      icon: Users,
      bgClass: 'bg-gradient-to-br from-green-50 to-green-100',
      iconClass: 'text-green-600'
    },
    {
      title: 'Órdenes Totales',
      value: overview.totalOrders,
      description: `${overview.pendingOrders} pendientes`,
      icon: ShoppingCart,
      bgClass: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconClass: 'text-purple-600',
      alert: overview.pendingOrders > 0
    },
    {
      title: 'Ingresos Totales',
      value: `$${Number(overview.totalRevenue).toFixed(2)}`,
      description: `Promedio: $${Number(overview.averageOrderValue).toFixed(2)}`,
      icon: DollarSign,
      bgClass: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      iconClass: 'text-emerald-600'
    }
  ]

  // Preparar datos para gráfica
const chartData = recentPerformance.dailyStats.map((day: any) => ({
  fecha: new Date(day.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
  ventas: Number(day.revenue),
  ordenes: Number(day.orders)
}))

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-inner">
          <PageHeader 
            title="Dashboard" 
            description="Resumen general de tu sistema Food Orders CRM"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title} className="shadow-lg hover:shadow-xl transition-all duration-200 border-0">
                <CardContent className={`${card.bgClass} p-6`}>
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">{card.title}</p>
                      <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                      <div className="flex items-center gap-2">
                        {card.alert && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                        <p className={`text-xs ${card.alert ? 'text-orange-600 font-semibold' : 'text-gray-500'}`}>
                          {card.description}
                        </p>
                      </div>
                    </div>
                    <Icon className={`h-12 w-12 ${card.iconClass}`} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Gráfica de Ventas */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Ventas de los Últimos 7 Días
            </CardTitle>
            <CardDescription>
              Últimos 7 días: {recentPerformance.last7Days.orders} órdenes por ${recentPerformance.last7Days.revenue.toFixed(2)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="ventas" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Ingresos ($)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="ordenes" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Órdenes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Productos y Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Productos */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Top 5 Productos Más Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.slice(0, 5).map((product, index) => (
                  <div key={product.productId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-100 text-purple-700 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{product.productName}</p>
                        <p className="text-xs text-gray-500">{product.ordersCount} órdenes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{product.totalSold} unidades</p>
                      <p className="text-xs text-green-600">${Number(product.totalRevenue).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Reciente */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                Performance Reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Últimos 7 Días</p>
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  ${recentPerformance.last7Days.revenue.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  {recentPerformance.last7Days.orders} órdenes completadas
                </p>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Mes Actual</p>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  ${Number(recentPerformance.currentMonth.revenue).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  {recentPerformance.currentMonth.orders} órdenes completadas
                </p>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Estado de Órdenes</p>
                  <ShoppingCart className="h-5 w-5 text-purple-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{overview.pendingOrders}</p>
                    <p className="text-xs text-gray-600">Pendientes</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{overview.completedOrders}</p>
                    <p className="text-xs text-gray-600">Completadas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{overview.canceledOrders}</p>
                    <p className="text-xs text-gray-600">Canceladas</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}