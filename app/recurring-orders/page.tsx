// app/recurring-orders/page.tsx
'use client'

import RecurringOrdersManager from '@/components/recurring-orders/RecurringOrdersManager'
import MainLayout from '@/components/shared/MainLayout'

export default function SellerRecurringOrdersPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Órdenes Recurrentes de Clientes
          </h1>
          <p className="text-gray-600">
            Gestiona todas las órdenes programadas de tus clientes
          </p>
        </div>

        <RecurringOrdersManager userRole="SELLER" />
      </div>
    </MainLayout>
  )
}
