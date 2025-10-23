// app/buyer/recurring-orders/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import RecurringOrdersManager from '@/components/recurring-orders/RecurringOrdersManager'
import { RefreshCw } from 'lucide-react'

export default function BuyerRecurringOrdersPage() {
  const { userId } = useAuth()
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClientId()
  }, [userId])

  const fetchClientId = async () => {
    try {
      const response = await fetch('/api/buyer/profile')
      const result = await response.json()
      
      if (result.success && result.data?.id) {
        setClientId(result.data.id)
      }
    } catch (error) {
      console.error('Error fetching client ID:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Mis Órdenes Recurrentes
        </h1>
        <p className="text-gray-600">
          Programa y gestiona tus pedidos automáticos
        </p>
      </div>

      {clientId && (
        <RecurringOrdersManager 
          userRole="CLIENT"
          clientId={clientId}
        />
      )}
    </div>
  )
}
