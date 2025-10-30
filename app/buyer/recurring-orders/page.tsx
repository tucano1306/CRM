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
      
      console.log('Buyer profile response:', result) // Debug
      
      if (result.success && result.data?.id) {
        setClientId(result.data.id)
      } else {
        console.error('No client ID found in profile:', result)
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

  if (!clientId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Perfil no encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              No se pudo cargar tu información de cliente. Por favor, contacta al vendedor para que configure tu cuenta.
            </p>
            <button 
              onClick={() => window.location.href = '/buyer/dashboard'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Volver al Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 py-8 px-4">
      <div className="container mx-auto max-w-7xl">
        <ModernRecurringOrdersManager 
          userRole="CLIENT"
          clientId={clientId}
        />
      </div>
    </div>
  )
}
