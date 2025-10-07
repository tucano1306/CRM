'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, Clock } from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import PageHeader from '@/components/shared/PageHeader'

interface Stats {
  total_products: number;
  total_clients: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number | string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    total_products: 0,
    total_clients: 0,
    total_orders: 0,
    pending_orders: 0,
    total_revenue: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (response.ok) {
        const data = await response.json()
        console.log('Stats recibidas:', data)
        setStats(data)
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  // Convertir total_revenue a número si viene como string
  const totalRevenue = typeof stats.total_revenue === 'string' 
    ? parseFloat(stats.total_revenue) 
    : stats.total_revenue

  const cards = [
    {
      title: 'Total Productos',
      value: stats.total_products,
      description: '+12% desde el mes pasado',
      icon: Package,
      bgClass: 'bg-gradient-to-br from-blue-50 to-blue-100',
      iconClass: 'text-blue-600'
    },
    {
      title: 'Total Clientes',
      value: stats.total_clients,
      description: '+8% desde el mes pasado',
      icon: Users,
      bgClass: 'bg-gradient-to-br from-green-50 to-green-100',
      iconClass: 'text-green-600'
    },
    {
      title: 'Órdenes Totales',
      value: stats.total_orders,
      description: '+23% desde el mes pasado',
      icon: ShoppingCart,
      bgClass: 'bg-gradient-to-br from-purple-50 to-purple-100',
      iconClass: 'text-purple-600'
    },
    {
      title: 'Ingresos',
      value: `$${totalRevenue.toFixed(2)}`,
      description: '+15% desde el mes pasado',
      icon: DollarSign,
      bgClass: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
      iconClass: 'text-emerald-600'
    }
  ]

  return (
    <MainLayout>
      <div className="space-y-6 sm:space-y-8">
        {/* Dashboard header with gradient background */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-100 rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-inner">
          <PageHeader 
            title="Dashboard" 
            description="Resumen general de tu sistema Food Orders CRM"
          />
        </div>

        {/* Responsive stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title} className="shadow-lg hover:shadow-xl transition-all duration-200 border-0">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    {card.title}
                  </CardTitle>
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${card.bgClass}`}>
                    <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.iconClass}`} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 sm:space-y-2">
                  <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">{card.value}</div>
                  <p className="text-xs sm:text-sm text-gray-600">{card.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Responsive content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Actividad Reciente
              </CardTitle>
              <CardDescription className="text-gray-600">
                Últimas acciones en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">Nuevo producto agregado</p>
                    <p className="text-xs text-gray-500">Hace 2 horas</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">Cliente registrado</p>
                    <p className="text-xs text-gray-500">Hace 4 horas</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">Orden procesada</p>
                    <p className="text-xs text-gray-500">Hace 6 horas</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Acciones Rápidas
              </CardTitle>
              <CardDescription className="text-gray-600">
                Operaciones frecuentes del sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base">
                + Crear nuevo producto
              </button>
              <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base">
                + Registrar cliente
              </button>
              <button className="w-full text-left px-4 py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base">
                📊 Ver estadísticas
              </button>
              <button className="w-full text-left px-4 py-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors duration-200 font-medium text-sm sm:text-base">
                📋 Gestionar órdenes
              </button>
            </CardContent>
          </Card>
        </div>

        {/* Mobile-friendly stats summary */}
        <div className="lg:hidden">
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900">Resumen Rápido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_orders}</p>
                  <p className="text-xs text-gray-600">Órdenes Pendientes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_products}</p>
                  <p className="text-xs text-gray-600">Productos Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}