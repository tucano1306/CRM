// app/buyer/credit-notes/page.tsx
'use client'

import CreditNotesViewer from '@/components/returns/CreditNotesViewer'

export default function BuyerCreditNotesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50">
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8 bg-white rounded-xl shadow-lg border-2 border-purple-200 p-6">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl shadow-md">
              <span className="text-3xl">💰</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Mis Créditos
              </h1>
              <p className="text-gray-600">
                Consulta y usa tus créditos disponibles de devoluciones
              </p>
            </div>
          </div>
        </div>

        <CreditNotesViewer />
      </div>
    </div>
  )
}
