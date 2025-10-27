// app/recurring-orders/page.tsx
'use client'

import ModernRecurringOrdersManager from '@/components/recurring-orders/ModernRecurringOrdersManager'
import MainLayout from '@/components/shared/MainLayout'

export default function SellerRecurringOrdersPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <ModernRecurringOrdersManager userRole="SELLER" />
      </div>
    </MainLayout>
  )
}
