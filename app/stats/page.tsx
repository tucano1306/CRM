'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, TrendingUp, Users, Package, ShoppingCart, DollarSign, Calendar } from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { 
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts'

interface SalesData {
  dailySales: Array<{
    date: string
    orders: number
    revenue: number
  }>
  period: string
  startDate: string
  endDate: string
}

interface ProductStats {
  topSelling: Array<{
    productId: string
    productName: string
    totalSold: number
    totalRevenue: number
    ordersCount: number
  }>
  lowStock: Array<{
    id: string
    name: string
    stock: number
    price: number
    sku: string | null
  }>
  noSales: Array<{
    id: string
    name: string
    stock: number
    price: number
  }>
  stats: {
    totalProducts: number
    totalStock: number
    lowStockCount: number
    noSalesCount: number
  }
}

export default function StatsPage() {
  const [period, setPeriod] = useState('month')
  const [loading, setLoading] = useState(true)
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [productStats, setProductStats] = useState<ProductStats | null>(null)

  useEffect(() => {
    fetchData()
  }, [period])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [salesResponse, productsResponse] = await Promise.all([
        fetch(`/api/analytics/sales?period=${period}`),
        fetch('/api/analytics/products')
      ])

      if (salesResponse.ok) {
        const result = await salesResponse.json()
        if (result.success) setSalesData(result.data)
      }

      if (productsResponse.ok) {
        const result = await productsResponse.json()
        if (result.success) setProductStats(result.data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando estadísticas...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!salesData || !productStats) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <Package className="mx-auto text-gray-400 mb-4" size={64} />
          <p className="text-gray-600 text-lg">Error al cargar datos</p>
          <Button onClick={fetchData} className="mt-4">
            Reintentar
          </Button>
        </div>
      </MainLayout>
    )
  }

  // Calcular resumen de ventas
  const totalRevenue = salesData.dailySales.reduce((sum, day) => sum + Number(day.revenue), 0)
  const totalOrders = salesData.dailySales.reduce((sum, day) => sum + day.orders, 0)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Preparar datos para gráficos
 const salesChartData = salesData.dailySales.map((day: any) => ({
  fecha: day.fecha,
  ventas: Number(day.ventas) || 0,
  ordenes: Number(day.ordenes) || 0
}))

  const topProductsChartData = productStats.topSelling.slice(0, 5).map(item => ({
    name: item.productName.length > 15 ? item.productName.substring(0, 15) + '...' : item.productName,
    vendidos: item.totalSold,
    ingresos: item.totalRevenue
  }))

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <PageHeader 
            title="Estadísticas Avanzadas" 
            description="Análisis detallado del negocio"
          />
          <div className="flex gap-2">
            <Button
              variant={period === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('week')}
            >
              Semana
            </Button>
            <Button
              variant={period === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('month')}
            >
              Mes
            </Button>
            <Button
              variant={period === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('year')}
            >
              Año
            </Button>
          </div>
        </div>

        {/* Cards de resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-emerald-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-2 rounded-xl shadow-md">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Ingresos</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              ${Number(totalRevenue).toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-cyan-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-xl shadow-md">
                <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Órdenes</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {totalOrders}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-gradient-to-br from-purple-500 to-purple-700 p-2 rounded-xl shadow-md">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Promedio</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              ${averageOrderValue.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:-translate-y-1 p-4 sm:p-6 border-l-4 border-amber-500">
            <div className="flex items-center justify-between mb-2">
              <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-2 rounded-xl shadow-md">
                <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <p className="text-gray-600 text-xs sm:text-sm font-semibold uppercase tracking-wide mb-1">Productos</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">
              {productStats.stats.totalProducts}
            </p>
            <p className="text-xs text-amber-600 font-semibold mt-1 px-2 py-0.5 bg-amber-100 rounded-full inline-block">
              {productStats.stats.lowStockCount} con stock bajo
            </p>
          </div>
        </div>

        {/* Gráfico de ventas */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Ventas - Últimos 15 Días
            </CardTitle>
            <CardDescription>
              Período: {new Date(salesData.startDate).toLocaleDateString('es-ES')} - {new Date(salesData.endDate).toLocaleDateString('es-ES')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="ventas" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Ingresos ($)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="ordenes" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Órdenes"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos de productos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Top 5 Productos Más Vendidos
              </CardTitle>
              <CardDescription>
                Por cantidad de unidades vendidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topProductsChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="vendidos" fill="#8b5cf6" name="Unidades Vendidas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Package size={48} className="mx-auto mb-2" />
                    <p>No hay datos de ventas aún</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Top 5 Productos Por Ingresos
              </CardTitle>
              <CardDescription>
                Por ingresos totales generados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topProductsChartData.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductsChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="ingresos" fill="#10b981" name="Ingresos ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-80 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <DollarSign size={48} className="mx-auto mb-2" />
                    <p>No hay datos de ingresos aún</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alerta de stock bajo */}
        {productStats.lowStock.length > 0 && (
          <Card className="shadow-lg border-0 border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Package className="h-5 w-5" />
                ⚠️ Alerta de Stock Bajo
              </CardTitle>
              <CardDescription>
                {productStats.lowStock.length} productos necesitan reabastecimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productStats.lowStock.slice(0, 6).map((product) => (
                  <div key={product.id} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs font-bold">
                        {product.stock} unidades
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Precio: ${product.price.toFixed(2)}</p>
                    {product.sku && (
                      <p className="text-xs text-gray-500 mt-1">SKU: {product.sku}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabla detallada de productos más vendidos */}
        {productStats.topSelling.length > 0 && (
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Detalle de Productos Más Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {productStats.topSelling.slice(0, 10).map((product, index) => (
                  <div key={product.productId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="bg-blue-100 text-blue-700 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{product.productName}</p>
                      <p className="text-sm text-gray-600">{product.ordersCount} órdenes</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{product.totalSold} unidades</p>
                      <p className="text-sm text-green-600">${Number(product.totalRevenue).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}