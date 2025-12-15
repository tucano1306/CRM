'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, Clock, Calendar, Package, Download } from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts'
import { exportToExcel } from '@/lib/excelExport'

const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#84cc16']

interface HourlyData {
  hour: string
  orders: number
  revenue: number
}

interface DayOfWeekData {
  day: string
  orders: number
  revenue: number
}

interface ProductTrendData {
  month: string
  [key: string]: string | number
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([])
  const [weeklyData, setWeeklyData] = useState<DayOfWeekData[]>([])
  const [productTrends, setProductTrends] = useState<ProductTrendData[]>([])
  const [topProducts, setTopProducts] = useState<any[]>([])

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)

      // Obtener todas las órdenes
      const response = await fetch('/api/orders')
      const data = await response.json()

      if (data.success) {
        const orders = data.orders || []
        
        // Calcular horarios pico
        const hourlyStats = calculateHourlyStats(orders)
        setHourlyData(hourlyStats)

        // Calcular días más activos
        const weeklyStats = calculateWeeklyStats(orders)
        setWeeklyData(weeklyStats)

        // Calcular tendencias de productos
        const trends = calculateProductTrends(orders)
        setProductTrends(trends)

        // Top productos
        const topProds = calculateTopProducts(orders)
        setTopProducts(topProds)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const calculateHourlyStats = (orders: any[]): HourlyData[] => {
    const hourMap = new Map<number, { orders: number; revenue: number }>()

    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours()
      const existing = hourMap.get(hour) || { orders: 0, revenue: 0 }
      hourMap.set(hour, {
        orders: existing.orders + 1,
        revenue: existing.revenue + Number(order.totalAmount)
      })
    })

    const result: HourlyData[] = []
    for (let i = 0; i < 24; i++) {
      const stats = hourMap.get(i) || { orders: 0, revenue: 0 }
      result.push({
        hour: `${i.toString().padStart(2, '0')}:00`,
        orders: stats.orders,
        revenue: Math.round(stats.revenue)
      })
    }

    return result
  }

  const calculateWeeklyStats = (orders: any[]): DayOfWeekData[] => {
    const dayMap = new Map<string, { orders: number; revenue: number }>()
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

    orders.forEach(order => {
      const dayIndex = new Date(order.createdAt).getDay()
      const dayName = days[dayIndex]
      const existing = dayMap.get(dayName) || { orders: 0, revenue: 0 }
      dayMap.set(dayName, {
        orders: existing.orders + 1,
        revenue: existing.revenue + Number(order.totalAmount)
      })
    })

    return days.map(day => ({
      day,
      orders: dayMap.get(day)?.orders || 0,
      revenue: Math.round(dayMap.get(day)?.revenue || 0)
    }))
  }

  const calculateProductTrends = (orders: any[]): ProductTrendData[] => {
    const monthMap = new Map<string, Map<string, number>>()
    const now = new Date()

    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      monthMap.set(monthKey, new Map())
    }

    orders.forEach(order => {
      const orderDate = new Date(order.createdAt)
      const monthKey = orderDate.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      
      if (monthMap.has(monthKey)) {
        order.orderItems?.forEach((item: any) => {
          const productMap = monthMap.get(monthKey)!
          const current = productMap.get(item.productName) || 0
          productMap.set(item.productName, current + item.quantity)
        })
      }
    })

    const result: ProductTrendData[] = []
    monthMap.forEach((products, month) => {
      const entry: ProductTrendData = { month }
      products.forEach((quantity, productName) => {
        entry[productName] = quantity
      })
      result.push(entry)
    })

    return result
  }

  const calculateTopProducts = (orders: any[]) => {
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>()

    orders.forEach(order => {
      order.orderItems?.forEach((item: any) => {
        const existing = productMap.get(item.productId) || { 
          name: item.productName, 
          quantity: 0, 
          revenue: 0 
        }
        productMap.set(item.productId, {
          name: item.productName,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + Number(item.subtotal)
        })
      })
    })

    return Array.from(productMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </MainLayout>
    )
  }

  const peakHour = hourlyData.reduce((max, curr) => curr.orders > max.orders ? curr : max, hourlyData[0])
  const peakDay = weeklyData.reduce((max, curr) => curr.orders > max.orders ? curr : max, weeklyData[0])

  const exportAnalyticsData = () => {
    exportToExcel([
      {
        name: 'Ventas por Hora',
        columns: [
          { header: 'Hora', key: 'hour', width: 12 },
          { header: 'Órdenes', key: 'orders', width: 12 },
          { header: 'Ingresos', key: 'revenue', width: 15 }
        ],
        data: hourlyData
      },
      {
        name: 'Ventas por Día',
        columns: [
          { header: 'Día', key: 'day', width: 15 },
          { header: 'Órdenes', key: 'orders', width: 12 },
          { header: 'Ingresos', key: 'revenue', width: 15 }
        ],
        data: weeklyData
      },
      {
        name: 'Top Productos',
        columns: [
          { header: 'Producto', key: 'name', width: 30 },
          { header: 'Cantidad', key: 'quantity', width: 12 },
          { header: 'Ingresos', key: 'revenue', width: 15 }
        ],
        data: topProducts
      }
    ], `analytics-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <PageHeader 
            title="Analytics" 
            description="Análisis de tendencias y patrones de ventas"
          />
          <Button
            onClick={exportAnalyticsData}
            variant="outline"
            className="text-green-600 hover:bg-green-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar a Excel
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Horario Pico</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{peakHour?.hour || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {peakHour?.orders || 0} órdenes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Día Más Activo</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{peakDay?.day || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {peakDay?.orders || 0} órdenes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Producto Top</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{topProducts[0]?.name || 'N/A'}</div>
              <p className="text-xs text-muted-foreground">
                {topProducts[0]?.quantity || 0} unidades vendidas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tendencia</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+12%</div>
              <p className="text-xs text-muted-foreground">
                vs. mes anterior
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Horarios Pico */}
        <Card>
          <CardHeader>
            <CardTitle>Horarios Pico de Pedidos</CardTitle>
            <CardDescription>
              Distribución de pedidos por hora del día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#8b5cf6" name="Órdenes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Días más Activos */}
        <Card>
          <CardHeader>
            <CardTitle>Actividad por Día de la Semana</CardTitle>
            <CardDescription>
              Comparación de pedidos por día
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="orders" fill="#6366f1" name="Órdenes" />
                  <Bar dataKey="revenue" fill="#10b981" name="Ingresos ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Productos */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Productos Más Vendidos</CardTitle>
            <CardDescription>
              Productos con mayor volumen de ventas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProducts}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="quantity"
                  >
                    {topProducts.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tendencias de Productos */}
        {productTrends.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tendencias de Productos (Últimos 6 Meses)</CardTitle>
              <CardDescription>
                Evolución de ventas por producto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {topProducts.slice(0, 3).map((product, index) => (
                      <Line
                        key={product.name}
                        type="monotone"
                        dataKey={product.name}
                        stroke={COLORS[index]}
                        name={product.name}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  )
}
