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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastel-cream via-pastel-blue/20 to-pastel-beige/40 p-4 page-transition">
      <Card className="max-w-md w-full shadow-xl bg-white/90 backdrop-blur-sm border border-pastel-blue/20">
        <CardContent className="pt-6 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pastel-blue to-pastel-beige rounded-full flex items-center justify-center mb-4 shadow-lg">
            <Users className="w-8 h-8 text-gray-700" />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Gestión de Productos por Cliente
          </h2>
          
          <p className="text-gray-600 mb-4">
            Los productos se gestionan desde el <strong>catálogo de cada cliente</strong>. 
            Cada cliente puede tener su propia lista de productos y precios personalizados.
          </p>

          <div className="bg-pastel-blue/20 border border-pastel-blue/40 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700">
              <strong>💡 Tip:</strong> Ve a <strong>Clientes</strong> → selecciona un cliente → 
              presiona el botón <strong>&quot;Catálogo&quot;</strong> para gestionar sus productos.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-pastel-blue">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm text-gray-600">Redirigiendo a Clientes...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
