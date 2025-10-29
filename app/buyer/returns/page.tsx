'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReturnsManager from '@/components/returns/ReturnsManager'

function BuyerReturnsPageContent() {
  const router = useRouter()

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/buyer')}
          className="mb-4 hover:bg-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Panel
        </Button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          🔄 Mis Devoluciones
        </h1>
        <p className="text-gray-600">
          Gestiona tus solicitudes de devolución y consulta su estado
        </p>
      </div>

      <Suspense fallback={<div className="flex justify-center items-center py-12">Cargando...</div>}>
        <ReturnsManager role="client" />
      </Suspense>
    </div>
  )
}

export default function BuyerReturnsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Cargando...</div>}>
      <BuyerReturnsPageContent />
    </Suspense>
  )
}
