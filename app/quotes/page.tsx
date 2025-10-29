// app/quotes/page.tsx
'use client'

import QuotesManager from '@/components/quotes/QuotesManager'
import MainLayout from '@/components/shared/MainLayout'

export default function QuotesPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            💰 Cotizaciones
          </h1>
          <p className="text-gray-700 font-medium">
            Crea, envía y gestiona cotizaciones para tus clientes
          </p>
        </div>

        <QuotesManager />
      </div>
    </MainLayout>
  )
}
