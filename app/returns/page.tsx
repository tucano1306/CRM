import MainLayout from '@/components/shared/MainLayout'
import ReturnsManager from '@/components/returns/ReturnsManager'

export default function ReturnsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔄 Devoluciones y Créditos
          </h1>
          <p className="text-gray-600">
            Gestiona las devoluciones de productos y notas de crédito de tus clientes
          </p>
        </div>

        <ReturnsManager role="seller" />
      </div>
    </MainLayout>
  )
}
