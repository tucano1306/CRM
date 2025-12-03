'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Users } from 'lucide-react'

/**
 * Página de productos deshabilitada
 * Los productos se gestionan desde el catálogo de cada cliente
 */
export default function ProductsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirigir a la página de clientes después de 2 segundos
    const timeout = setTimeout(() => {
      router.push('/clients')
    }, 2000)

    return () => clearTimeout(timeout)
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Gestión de Productos por Cliente
          </h2>
          
          <p className="text-gray-600 mb-4">
            Los productos se gestionan desde el <strong>catálogo de cada cliente</strong>. 
            Cada cliente puede tener su propia lista de productos y precios personalizados.
          </p>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-purple-800">
              <strong>💡 Tip:</strong> Ve a <strong>Clientes</strong> → selecciona un cliente → 
              presiona el botón <strong>&quot;Catálogo&quot;</strong> para gestionar sus productos.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-purple-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Redirigiendo a Clientes...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
