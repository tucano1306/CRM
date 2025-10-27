'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReturnsManager from '@/components/returns/ReturnsManager'
import CreateManualReturnModal from '@/components/returns/CreateManualReturnModal'

export default function SellerReturnsPage() {
  const router = useRouter()
  const [showManualReturnModal, setShowManualReturnModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleManualReturnSuccess = () => {
    setRefreshKey(prev => prev + 1) // Forzar re-render de ReturnsManager
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard')}
          className="mb-4 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Dashboard
        </Button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🔄 Devoluciones Recibidas
            </h1>
            <p className="text-gray-600">
              Gestiona las solicitudes de devolución de tus clientes
            </p>
          </div>
          
          <Button
            onClick={() => setShowManualReturnModal(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear Devolución Manual
          </Button>
        </div>
      </div>

      <ReturnsManager key={refreshKey} role="seller" />

      <CreateManualReturnModal
        isOpen={showManualReturnModal}
        onClose={() => setShowManualReturnModal(false)}
        onSuccess={handleManualReturnSuccess}
      />
    </div>
  )
}
