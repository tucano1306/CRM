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
  summary: {
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
    period: string
  }
  dailySales: Array<{
    date: string
    orders: number
    revenue: number
  }>
  topSellers: Array<{
    seller: {
      id: string
      name: string
      email: string
    }
    totalOrders: number
    totalRevenue: number
    commission: number
  }>
  topClients: Array<{
    client: {
      id: string
      name: string
      email: string
    }
    totalOrders: number
    totalSpent: number
  }>
}

interface ProductStats {
  summary: {
    totalProducts: number
    activeProducts: number
    averagePrice: number
    averageStock: number
  }
  topSelling: Array<{
    product: {
      id: string
      name: string
      price: number
      stock: number
    }
    stats: {
      totalSold: number
      totalRevenue: number
      ordersCount: number
    }
  }>
  lowStock: Array<{
    id: string
    name: string
    stock: number
    price: number
  }>
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
            <p className="mt-4 text-gray-600">Cargando...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  if (!salesData || !productStats) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Error al cargar datos</p>
        </div>
      </MainLayout>
    )
  }

  const salesChartData = salesData.dailySales.slice(0, 15).reverse().map(day => ({
    fecha: new Date(day.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    ventas: Number(day.revenue),
    ordenes: Number(day.orders)
  }))

  const topProductsChartData = productStats.topSelling.slice(0, 5).map(item => ({
    name: item.product.name.substring(0, 15),
    vendidos: item.stats.totalSold
  }))

  const topClientsChartData = salesData.topClients.slice(0, 5).map(item => ({
    name: item.client.name.substring(0, 15),
    gastado: item.totalSpent
  }))

  return (
    <MainLayout>
      <div className="space-y-6">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Ingresos</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${salesData.summary.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Órdenes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {salesData.summary.totalOrders}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Promedio</p>
                  <p className="text-3xl font-bold text-gray-900">
                    ${salesData.summary.averageOrderValue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Productos</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {productStats.summary.activeProducts}
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Package className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Ventas - Últimos 15 Días
            </CardTitle>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-600" />
                Top 5 Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="vendidos" fill="#8b5cf6" name="Vendidos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-600" />
                Top 5 Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topClientsChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="gastado" fill="#10b981" name="Gastado ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {productStats.lowStock.length > 0 && (
          <Card className="shadow-lg border-0 border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Package className="h-5 w-5" />
                Stock Bajo
              </CardTitle>
              <CardDescription>
                {productStats.lowStock.length} productos necesitan reabastecimiento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {productStats.lowStock.slice(0, 6).map((product) => (
                  <div key={product.id} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-gray-900">{product.name}</p>
                      <span className="bg-orange-200 text-orange-800 px-2 py-1 rounded text-xs font-bold">
                        {product.stock}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">${product.price}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Performance de Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesData.topSellers.slice(0, 5).map((seller, index) => (
                <div key={seller.seller.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="bg-blue-100 text-blue-700 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{seller.seller.name}</p>
                    <p className="text-sm text-gray-600">{seller.seller.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{seller.totalOrders} órdenes</p>
                    <p className="text-sm text-green-600">${seller.totalRevenue.toFixed(2)}</p>
                    <p className="text-xs text-purple-600">Comisión: ${seller.commission.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}