// app/buyer/credit-notes/page.tsx
'use client'

import CreditNotesViewer from '@/components/returns/CreditNotesViewer'

export default function BuyerCreditNotesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          💰 Mis Créditos
        </h1>
        <p className="text-gray-600">
          Consulta y usa tus créditos disponibles de devoluciones
        </p>
      </div>

      <CreditNotesViewer />
    </div>
  )
}
