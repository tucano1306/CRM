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
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {clientId && (
        <ModernRecurringOrdersManager 
          userRole="CLIENT"
          clientId={clientId}
        />
      )}
    </div>
  )
}
