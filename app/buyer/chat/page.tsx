'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import ChatWindow from '@/components/chat/ChatWindow'
import { Card, CardContent } from '@/components/ui/card'
import { MessageCircle, User } from 'lucide-react'

export default function BuyerChatPage() {
  const { user } = useUser()
  const [seller, setSeller] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSellerInfo()
  }, [])

  const fetchSellerInfo = async () => {
    try {
      // Obtener información del vendedor asignado
      const response = await fetch('/api/buyer/seller')
      const data = await response.json()

      if (data.success && data.seller) {
        setSeller(data.seller)
      }
    } catch (error) {
      console.error('Error fetching seller:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    )
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-full">
              <MessageCircle className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Chat con tu Vendedor
              </h1>
              <p className="text-gray-600">
                {seller.name} - {seller.email}
              </p>
            </div>
          </div>
        </div>

        {/* Chat Window */}
        {seller && seller.clerkUserId ? (
          <>
            {/* ✅ AGREGAR ESTE LOG TEMPORAL */}
            {console.log('Renderizando ChatWindow con receiverId:', seller.clerkUserId)}
            
            <ChatWindow 
              receiverId={seller.clerkUserId}
              receiverName={seller.name}
            />
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-red-600">
                Error: No se pudo obtener el ID del vendedor
              </p>
              {seller && (
                <pre className="mt-4 text-xs text-left bg-gray-100 p-4 rounded">
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
