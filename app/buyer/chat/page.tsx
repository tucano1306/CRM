'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import ChatWindow from '@/components/chat/ChatWindow'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle, User } from 'lucide-react'

export default function BuyerChatPage() {
  const { user } = useUser()
  const [seller, setSeller] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    fetchSellerInfo()
  }, [fetchSellerInfo])

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

        {/* Chat Window */}
        {seller && seller.clerkUserId ? (
          <ChatWindow 
            receiverId={seller.clerkUserId}
            receiverName={seller.name}
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
