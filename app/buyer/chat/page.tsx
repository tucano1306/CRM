'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useUser } from '@clerk/nextjs'
import { useSearchParams } from 'next/navigation'
import ChatWindow from '@/components/chat/ChatWindow'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle, User, Package, ShoppingBag } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

function BuyerChatContent() {
  const { user: _user } = useUser() // Keep hook call for auth context
  const searchParams = useSearchParams()
  const orderId = searchParams.get('order')
  
  const [seller, setSeller] = useState<any>(null)
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingOrder, setLoadingOrder] = useState(!!orderId)

  const fetchSellerInfo = useCallback(async () => {
    try {
      console.log('🔍 Buyer: Obteniendo información del vendedor...')
      // Obtener información del vendedor asignado
      const response = await fetch('/api/buyer/seller')
      const data = await response.json()

      console.log('📦 Buyer: Respuesta del API:', data)

      if (data.success && data.seller) {
        console.log('✅ Buyer: Vendedor encontrado:', {
          id: data.seller.id,
          name: data.seller.name,
          email: data.seller.email,
          clerkUserId: data.seller.clerkUserId
        })
        setSeller(data.seller)
      } else {
        console.error('❌ Buyer: No se encontró vendedor:', data.error)
      }
    } catch (error) {
      console.error('Error fetching seller:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOrderInfo = useCallback(async () => {
    if (!orderId) return
    
    try {
      console.log('📦 Cargando información de orden:', orderId)
      const response = await fetch(`/api/buyer/orders/${orderId}`)
      const data = await response.json()
      
      if (data.success && data.order) {
        setOrder(data.order)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoadingOrder(false)
    }
  }, [orderId])

  // Helper function to render order context based on loading and order state
  const renderOrderContext = () => {
    if (loadingOrder) {
      return (
        <Card className="bg-white rounded-xl shadow-xl border-2 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent" />
              <p className="text-gray-600">Cargando información de orden...</p>
            </div>
          </CardContent>
        </Card>
      )
    }
    
    if (order) {
      const statusClass = (() => {
        if (order.status === 'COMPLETED' || order.status === 'DELIVERED') return 'bg-green-100 text-green-800';
        if (order.status === 'PENDING') return 'bg-yellow-100 text-yellow-800';
        return 'bg-blue-100 text-blue-800';
      })();
      
      return (
        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl shadow-xl border-2 border-purple-300">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl shadow-md">
                  <ShoppingBag className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-purple-900 mb-1">
                    Orden: {order.orderNumber}
                  </h3>
                  <p className="text-sm text-purple-700 mb-2">
                    {new Date(order.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`px-3 py-1 rounded-full font-medium ${statusClass}`}>
                      {order.status}
                    </span>
                    <span className="text-purple-700 flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      {order.orderItems?.length || 0} productos
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-600 font-medium mb-1">Total</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatPrice(order.totalAmount)}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-purple-200">
              <p className="text-xs text-purple-600 font-medium mb-2">💬 Pregunta sobre esta orden</p>
              <p className="text-sm text-purple-800">
                Este chat está vinculado con la orden <span className="font-bold">{order.orderNumber}</span>. 
                El vendedor verá esta orden cuando reciba tus mensajes.
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }
    
    return (
      <Card className="bg-white rounded-xl shadow-xl border-2 border-yellow-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-yellow-600">
            <span className="text-2xl">⚠️</span>
            <p className="font-medium">No se pudo cargar la información de la orden</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  useEffect(() => {
    fetchSellerInfo()
    if (orderId) {
      fetchOrderInfo()
    }
  }, [fetchSellerInfo, fetchOrderInfo, orderId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-xl shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-white rounded-xl shadow-xl border-2 border-purple-200">
            <CardContent className="p-12 text-center">
              <div className="bg-gradient-to-br from-purple-100 to-indigo-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-10 w-10 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                No tienes vendedor asignado
              </h2>
              <p className="text-gray-600">
                Contacta al administrador para que te asigne un vendedor
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-xl border-2 border-purple-200 p-6 mb-6 transition-all hover:shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl shadow-md">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Chat con tu Vendedor
              </h1>
              <p className="text-gray-600 flex items-center gap-2">
                <span className="font-semibold text-purple-600">{seller.name}</span>
                <span className="text-gray-400">•</span>
                <span className="text-sm">{seller.email}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Order Context Card */}
        {orderId && (
          <div className="mb-6">
            {renderOrderContext()}
          </div>
        )}

        {/* Chat Window */}
        {seller?.clerkUserId ? (
          <ChatWindow 
            receiverId={seller.clerkUserId}
            receiverName={seller.name}
            orderId={orderId || undefined}
          />
        ) : (
          <Card className="bg-white rounded-xl shadow-xl border-2 border-red-200">
            <CardContent className="p-12 text-center">
              <div className="bg-gradient-to-br from-red-100 to-rose-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <p className="text-red-600 font-semibold mb-4">
                Error: No se pudo obtener el ID del vendedor
              </p>
              {seller && (
                <pre className="mt-4 text-xs text-left bg-gradient-to-br from-gray-50 to-slate-50 border-2 border-gray-200 p-4 rounded-xl overflow-x-auto">
                  {JSON.stringify(seller, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function BuyerChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-6 flex items-center justify-center">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-xl shadow-md">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent" />
        </div>
      </div>
    }>
      <BuyerChatContent />
    </Suspense>
  )
}
