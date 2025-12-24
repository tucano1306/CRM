import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Package,
  DollarSign,
  Calendar,
  Target,
  Award
} from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
// Progress component inline implementation

// 🚀 SSR Configuration with Longer Cache (Stats change less frequently)
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Estadísticas SSR - Food Orders CRM',
  description: 'Estadísticas avanzadas con pre-cálculos server-side para máximo rendimiento',
  keywords: ['estadísticas', 'ssr', 'métricas', 'performance', 'análisis'],
}

async function getStatsData() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ssr/stats`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch stats data')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching SSR stats data:', error)
    return null
  }
}

export default async function StatsSSRPage() {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const statsData = await getStatsData()

  if (!statsData?.success) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Error al cargar estadísticas
            </h2>
            <p className="text-gray-600 mb-4">
              No se pudieron obtener las estadísticas del servidor
            </p>
            <Link href="/stats">
              <Button>
                Ir a Stats clásico
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  const { summary, trends, products, clients, period, generatedAt } = statsData.data

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <BarChart3 className="text-indigo-600" />
              Estadísticas SSR
            </h1>
            <p className="text-gray-600 mt-1">
              Análisis completo de {period} • Pre-calculado: {new Date(generatedAt).toLocaleString('es-ES')}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/stats">
              <Button variant="outline" size="sm">
                Stats Clásico
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => globalThis.location.reload()}
            >
              Actualizar
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4" />
                Ingresos Totales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Number(summary.total_revenue).toFixed(2)}</div>
              <div className="flex items-center gap-1 mt-1">
                {summary.growth_rate >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="text-sm">
                  {summary.growth_rate >= 0 ? '+' : ''}{Number(summary.growth_rate).toFixed(1)}% vs mes anterior
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4" />
                Pedidos Completados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.completed_orders}</div>
              <div className="text-sm text-blue-100 mt-1">
                de {summary.total_orders} totales ({((summary.completed_orders / summary.total_orders) * 100).toFixed(1)}%)
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-pastel-blue to-pastel-beige text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4" />
                Clientes Únicos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.unique_clients}</div>
              <div className="text-sm text-gray-600 mt-1">
                {clients.active_clients} activos ({((clients.active_clients / summary.unique_clients) * 100).toFixed(1)}%)
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="w-4 h-4" />
                Valor Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Number(summary.avg_order_value).toFixed(2)}</div>
              <div className="text-sm text-orange-100 mt-1">
                por pedido completado
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Client Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Insights de Clientes
              </CardTitle>
              <CardDescription>Análisis del comportamiento de clientes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Tasa de Retención</span>
                <span className="font-bold">{Number(summary.retention_rate).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min(Number(summary.retention_rate), 100)}%` }}
                ></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{clients.loyal_clients}</div>
                  <div className="text-sm text-blue-800">Clientes Leales</div>
                  <div className="text-xs text-gray-600">5+ pedidos</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ${Number(clients.avg_spent_per_client).toFixed(0)}
                  </div>
                  <div className="text-sm text-green-800">Gasto Promedio</div>
                  <div className="text-xs text-gray-600">por cliente</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Patterns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pastel-blue" />
                Patrones Semanales
              </CardTitle>
              <CardDescription>Días de la semana más activos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trends.weekly
                  .sort((a: any, b: any) => b.orders - a.orders)
                  .map((day: any, index: number) => (
                  <div key={day.day_of_week} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? 'default' : 'secondary'}>
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{day.day_name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{day.orders} pedidos</div>
                      <div className="text-sm text-gray-600">
                        ${Number(day.revenue).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Tendencias Mensuales
            </CardTitle>
            <CardDescription>Evolución de ventas por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trends.monthly.slice(0, 6).map((month: any, index: number) => (
                <div key={month.month} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-lg">{month.month_name}</span>
                    {index === 0 && <Badge>Actual</Badge>}
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pedidos:</span>
                      <span className="font-medium">{month.orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Ingresos:</span>
                      <span className="font-medium text-green-600">
                        ${Number(month.revenue).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Clientes:</span>
                      <span className="font-medium">{month.unique_clients}</span>
                    </div>
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
              <Award className="w-5 h-5 text-yellow-600" />
              Top Productos
            </CardTitle>
            <CardDescription>Los productos más exitosos del período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {products.performance.slice(0, 8).map((product: any, index: number) => (
                <div key={product.product_name} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <Badge variant={index < 3 ? 'default' : 'outline'}>
                      #{index + 1}
                    </Badge>
                    <div>
                      <div className="font-semibold">{product.product_name}</div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{product.category}</span>
                        <span>•</span>
                        <span>{product.total_sold} vendidos</span>
                        <span>•</span>
                        <span>{product.unique_buyers} compradores únicos</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">
                      ${Number(product.total_revenue).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      ${Number(product.avg_item_value).toFixed(2)} promedio
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Notice */}
        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-indigo-800">
                  🚀 Estadísticas ultra-optimizadas con SSR
                </p>
                <p className="text-indigo-700 text-sm mt-1">
                  Datos pre-calculados con agregaciones complejas • Cache de 10 minutos + stale-while-revalidate
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
