'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReturnsManager from '@/components/returns/ReturnsManager'
import CreateManualReturnModal from '@/components/returns/CreateManualReturnModal'

function ReturnsPageContent() {
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

      <Suspense fallback={<div className="flex justify-center items-center py-12">Cargando...</div>}>
        <ReturnsManager key={refreshKey} role="seller" />
      </Suspense>

      <CreateManualReturnModal
        isOpen={showManualReturnModal}
        onClose={() => setShowManualReturnModal(false)}
        onSuccess={handleManualReturnSuccess}
      />
    </div>
  )
}

export default function SellerReturnsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
      <ReturnsPageContent />
    </Suspense>
  )
}