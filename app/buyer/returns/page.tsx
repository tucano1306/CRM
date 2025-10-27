'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReturnsManager from '@/components/returns/ReturnsManager'

export default function BuyerReturnsPage() {
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

      <ReturnsManager role="client" />
    </div>
  )
}
