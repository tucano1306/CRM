import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Calendar,
  Package
} from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// 🚀 SSR Configuration with Smart Caching
export const dynamic = 'force-dynamic'
export const revalidate = false

export const metadata: Metadata = {
  title: 'Analytics SSR - Food Orders CRM',
  description: 'Análisis avanzado de datos con Server-Side Rendering para mejor performance',
  keywords: ['analytics', 'ssr', 'estadísticas', 'análisis', 'performance'],
}

async function getAnalyticsData() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ssr/analytics`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch analytics data')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching SSR analytics data:', error)
    return null
  }
}

export default async function AnalyticsSSRPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const analyticsData = await getAnalyticsData()

  if (!analyticsData?.success) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Error al cargar analytics
            </h2>
            <p className="text-gray-600 mb-4">
              No se pudieron obtener los datos analíticos
            </p>
            <Link href="/analytics">
              <Button>
                Ir a Analytics clásico
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  const { hourlyStats, dailyStats, topProducts, clientStats, period, generatedAt } = analyticsData.data

  // Procesar datos para visualización
  const totalOrders = dailyStats.reduce((sum: number, day: any) => sum + day.orders, 0)
  const totalRevenue = dailyStats.reduce((sum: number, day: any) => sum + Number(day.revenue), 0)
  const _avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // Encontrar horas pico
  const peakHours = hourlyStats
    .sort((a: any, b: any) => b.orders - a.orders)
    .slice(0, 3)

  // Días más activos
  const topDays = dailyStats
    .sort((a: any, b: any) => b.orders - a.orders)
    .slice(0, 5)

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="text-purple-600" />
              Analytics SSR
            </h1>
            <p className="text-gray-600 mt-1">
              Análisis de {period} • Generado: {new Date(generatedAt).toLocaleString('es-ES')}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/analytics">
              <Button variant="outline" size="sm">
                Analytics Clásico
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              Actualizar
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Pedidos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalOrders}</div>
              <p className="text-blue-100">Últimos {period}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Ingresos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${totalRevenue.toFixed(2)}</div>
              <p className="text-green-100">Últimos {period}</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Clientes Activos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{clientStats.active_clients}</div>
              <p className="text-purple-100">Promedio pedido: ${Number(clientStats.avg_order_value || 0).toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Peak Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Horarios Pico
              </CardTitle>
              <CardDescription>
                Horas con mayor actividad de pedidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {peakHours.map((hour: any, index: number) => (
                  <div key={hour.hour} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                      <span className="font-semibold">
                        {hour.hour}:00 - {hour.hour + 1}:00
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{hour.orders} pedidos</div>
                      <div className="text-sm text-gray-600">${Number(hour.revenue).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Productos Más Vendidos
              </CardTitle>
              <CardDescription>
                Ranking de productos por cantidad vendida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.slice(0, 5).map((product: any, index: number) => (
                  <div key={product.product_name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        #{index + 1}
                      </Badge>
                      <div>
                        <div className="font-semibold truncate max-w-[200px]">
                          {product.product_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          ${Number(product.total_revenue).toFixed(2)} ingresos
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{product.total_sold}</div>
                      <div className="text-sm text-gray-600">vendidos</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Rendimiento Diario
            </CardTitle>
            <CardDescription>
              Los 5 días más activos del período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topDays.map((day: any, index: number) => (
                <div key={day.date} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <Badge variant={index === 0 ? 'default' : 'outline'}>
                      #{index + 1}
                    </Badge>
                    <div>
                      <div className="font-semibold">
                        {new Date(day.date).toLocaleDateString('es-ES', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {day.orders} pedidos
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">
                      ${Number(day.revenue).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Promedio: ${day.orders > 0 ? (Number(day.revenue) / day.orders).toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Notice */}
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-purple-800">
                  🚀 Analytics optimizado con SSR
                </p>
                <p className="text-purple-700 text-sm mt-1">
                  Datos pre-procesados en el servidor con cache de 5 minutos + stale-while-revalidate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}