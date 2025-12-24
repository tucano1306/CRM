import { Metadata } from 'next'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { formatPrice, formatNumber } from '@/lib/utils'
import {
  ShoppingCart,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// 🚀 SSR Configuration with Smart Caching
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard SSR - Food Orders CRM',
  description: 'Panel de control con datos en tiempo real optimizado con Server-Side Rendering',
  keywords: ['dashboard', 'ssr', 'analytics', 'tiempo real'],
}

// Server-side data fetching function
async function getDashboardData() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/ssr/dashboard`, {
      headers: {
        'Cache-Control': 'no-cache', // Asegurar datos frescos en server
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching SSR dashboard data:', error)
    return null
  }
}

export default async function DashboardSSRPage() {
  // 🔐 Server-side auth check
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  // 🚀 Server-side data fetching
  const dashboardData = await getDashboardData()

  if (!dashboardData?.success) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Error al cargar dashboard
            </h2>
            <p className="text-gray-600 mb-4">
              No se pudieron obtener los datos del servidor
            </p>
            <Link href="/dashboard">
              <Button>
                Ir a Dashboard clásico
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  const { overview, recentOrders, generatedAt } = dashboardData.data

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <TrendingUp className="text-green-600" />
              Dashboard SSR
            </h1>
            <p className="text-gray-600 mt-1">
              Datos actualizados server-side • {new Date(generatedAt).toLocaleString('es-ES')}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Dashboard Clásico
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

        {/* Stats Cards - Pre-rendered */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
              <ShoppingCart className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(overview.totalOrders)}</div>
              <p className="text-xs text-blue-100">
                {overview.pendingOrders} pendientes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(overview.totalRevenue)}</div>
              <p className="text-xs text-green-100">
                {overview.completedOrders} completados
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-pastel-blue to-pastel-beige text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productos</CardTitle>
              <Package className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(overview.totalProducts)}</div>
              <p className="text-xs text-gray-600">
                {overview.lowStockProducts} con stock bajo
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Procesando</CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(overview.processingOrders)}</div>
              <p className="text-xs text-orange-100">
                Requieren atención
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders - Pre-rendered */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Pedidos Recientes (SSR)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-lg">{order.orderNumber}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${(() => {
                          if (order.status === 'COMPLETED') return 'bg-green-100 text-green-800';
                          if (order.status === 'PENDING') return 'bg-yellow-100 text-yellow-800';
                          if (order.status === 'CONFIRMED') return 'bg-blue-100 text-blue-800';
                          return 'bg-gray-100 text-gray-800';
                        })()}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mt-1">
                        {order.clientName} • {order.itemCount} productos
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString('es-ES')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-green-600">
                        {formatPrice(order.totalAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay pedidos recientes
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance Notice */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <p className="font-medium text-green-800">
                  🚀 Optimizado con Server-Side Rendering
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Datos pre-renderizados en el servidor con cache inteligente (60s + stale-while-revalidate)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
