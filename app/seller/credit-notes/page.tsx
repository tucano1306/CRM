import MainLayout from '@/components/shared/MainLayout'
import CreditNotesViewer from '@/components/returns/CreditNotesViewer'

export default function SellerCreditNotesPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            💰 Notas de Crédito
          </h1>
          <p className="text-gray-600">
            Consulta y gestiona las notas de crédito generadas para tus clientes
          </p>
        </div>

        <CreditNotesViewer />
      </div>
    </MainLayout>
  )
}
