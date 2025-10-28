'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import MainLayout from '@/components/shared/MainLayout'
import ReturnsManager from '@/components/returns/ReturnsManager'
import CreateManualReturnModal from '@/components/returns/CreateManualReturnModal'

export default function ReturnsPage() {
  const [showManualReturnModal, setShowManualReturnModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleManualReturnSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          {/* Header responsivo: vertical en móvil, horizontal en desktop */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🔄 Devoluciones y Créditos
              </h1>
              <p className="text-gray-600">
                Gestiona las devoluciones de productos y notas de crédito de tus clientes
              </p>
            </div>
            
            <Button
              onClick={() => setShowManualReturnModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white whitespace-nowrap md:self-start"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Crear Devolución Manual</span>
              <span className="sm:hidden">Nueva Devolución</span>
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
    </MainLayout>
  )
}
