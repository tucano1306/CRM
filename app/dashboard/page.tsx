'use client'

import { useEffect, useState } from 'react'
import { apiCall, getErrorMessage } from '@/lib/api-client'
import {
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  TrendingUp,
  Loader2,
  Clock,
  AlertCircle,
} from 'lucide-react'
import MainLayout from '@/components/shared/MainLayout'
import { DashboardStatsSkeleton } from '@/components/skeletons'

type Stats = {
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  completedOrders: number
  totalRevenue: number
  totalProducts: number
  lowStockProducts: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timedOut, setTimedOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboard()
  }, [])

  // ✅ fetchDashboard CON TIMEOUT
  const fetchDashboard = async () => {
    try {
      setLoading(true)
      setTimedOut(false)
      setError(null)

      const result = await apiCall('/api/analytics/dashboard', {
        timeout: 8000, // 8 segundos para dashboard (muchas queries)
        onTimeout: () => setTimedOut(true)
      })

      setLoading(false)

      if (result.success) {
        setStats(result.data.data.overview)
      } else {
        setError(result.error || 'Error cargando dashboard')
      }
    } catch (err) {
      setLoading(false)
      setError(getErrorMessage(err))
    }
  }

  // ✅ UI States
  if (loading) {
    return (
      <MainLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={36} />
            Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Cargando datos...
          </p>
        </div>
        <DashboardStatsSkeleton />
      </MainLayout>
    )
  }

  if (timedOut) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-8 bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-8 w-8 text-yellow-600" />
            <h2 className="text-xl font-bold text-yellow-900">
              Tiempo de espera excedido
            </h2>
          </div>
          <p className="text-gray-700 mb-4">
            La carga del dashboard está tardando más de lo esperado.
          </p>
          <button
            onClick={fetchDashboard}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-md mx-auto mt-8 bg-red-50 border border-red-200 p-6 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
            <h2 className="text-xl font-bold text-red-900">Error</h2>
          </div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchDashboard}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </MainLayout>
    )
  }

  if (!stats) {
    return null
  }

  const statCards = [
    {
      title: 'Órdenes Totales',
      value: stats.totalOrders,
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Pendientes',
      value: stats.pendingOrders,
      icon: Clock,
      color: 'bg-yellow-500',
    },
    {
      title: 'En Proceso',
      value: stats.processingOrders,
      icon: Package,
      color: 'bg-purple-500',
    },
    {
      title: 'Completadas',
      value: stats.completedOrders,
      icon: Package,
      color: 'bg-green-500',
    },
    {
      title: 'Ingresos Totales',
      value: `$${Number(stats.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-emerald-500',
    },
    {
      title: 'Productos',
      value: stats.totalProducts,
      icon: Package,
      color: 'bg-indigo-500',
    },
    {
      title: 'Stock Bajo',
      value: stats.lowStockProducts,
      icon: AlertCircle,
      color: 'bg-red-500',
    },
  ]

  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <TrendingUp className="text-blue-600" size={36} />
          Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Resumen general de tu negocio
        </p>
      </div>

      {/* Grid de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          const Icon = card.icon
          return (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
              <h3 className="text-gray-600 text-sm font-medium">
                {card.title}
              </h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {card.value}
              </p>
            </div>
          )
        })}
      </div>

      {/* Alertas */}
      {stats.lowStockProducts > 0 && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <p className="text-red-800 font-semibold">
              ⚠️ Tienes {stats.lowStockProducts} producto(s) con stock bajo
            </p>
          </div>
        </div>
      )}

      {stats.pendingOrders > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="text-yellow-600" size={20} />
            <p className="text-yellow-800 font-semibold">
              📦 Tienes {stats.pendingOrders} orden(es) pendiente(s) de atención
            </p>
          </div>
        </div>
      )}
    </MainLayout>
  )
}