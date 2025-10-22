'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ShoppingCart, Package, Clock, CheckCircle, 
  TrendingUp, Store, Heart, MessageCircle 
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

  useEffect(() => {
    fetchBuyerData()
  }, [])

  const fetchBuyerData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        fetch('/api/buyer/stats'),
        fetch('/api/buyer/orders/recent')
      ])

      if (statsRes.ok) {
        const result = await statsRes.json()
        if (result.success) setStats(result.data)
      }

      if (ordersRes.ok) {
        const result = await ordersRes.json()
        if (result.success) setRecentOrders(result.data)
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
    PLACED: 'bg-blue-100 text-blue-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-emerald-100 text-emerald-800',
    CANCELED: 'bg-red-100 text-red-800',
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Pendiente',
    PLACED: 'Realizada',
    CONFIRMED: 'Confirmada',
    COMPLETED: 'Completada',
    CANCELED: 'Cancelada',
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-lg hover:shadow-xl transition-all border-0">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm mb-1">Total Órdenes</p>
                  <p className="text-4xl font-bold">{stats?.totalOrders || 0}</p>
                </div>
                <Package className="h-12 w-12 text-blue-200" />
              </div>
            </div>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all border-0">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm mb-1">En Proceso</p>
                  <p className="text-4xl font-bold">{stats?.pendingOrders || 0}</p>
                </div>
                <Clock className="h-12 w-12 text-orange-200" />
              </div>
            </div>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all border-0">
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm mb-1">Completadas</p>
                  <p className="text-4xl font-bold">{stats?.completedOrders || 0}</p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-200" />
              </div>
            </div>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-all border-0">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm mb-1">Total Gastado</p>
                  <p className="text-3xl font-bold">${stats?.totalSpent?.toFixed(2) || '0.00'}</p>
                </div>
                <TrendingUp className="h-12 w-12 text-purple-200" />
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Acciones Rápidas */}
          <Card className="shadow-xl border-0">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <Link href="/buyer/catalog">
                <div className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Store className="h-6 w-6 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-900">Ver Catálogo</h3>
                      <p className="text-sm text-blue-700">Explora productos</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/buyer/cart">
                <div className="p-4 bg-green-50 hover:bg-green-100 rounded-xl transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className="h-6 w-6 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-900">Mi Carrito</h3>
                      <p className="text-sm text-green-700">Ver mi carrito</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/buyer/orders">
                <div className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Package className="h-6 w-6 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-purple-900">Mis Órdenes</h3>
                      <p className="text-sm text-purple-700">Ver historial</p>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/buyer/chat">
                <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <MessageCircle className="h-6 w-6 text-white" />
                    <div>
                      <h3 className="font-semibold text-white">Chat con Vendedor</h3>
                      <p className="text-sm text-purple-100">Envía mensajes</p>
                    </div>
                  </div>
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Órdenes Recientes */}
          <Card className="shadow-xl border-0 lg:col-span-2">
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