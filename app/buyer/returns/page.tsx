'use client'

import ReturnsManager from '@/components/returns/ReturnsManager'

export default function BuyerReturnsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
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
