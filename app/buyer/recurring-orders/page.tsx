// app/buyer/recurring-orders/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import ModernRecurringOrdersManager from '@/components/recurring-orders/ModernRecurringOrdersManager'
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-xl shadow-md">
          <RefreshCw className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        {clientId && (
          <ModernRecurringOrdersManager 
            userRole="CLIENT"
            clientId={clientId}
          />
        )}
      </div>
    </div>
  )
}
