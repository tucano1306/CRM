'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Users } from 'lucide-react'

/**
 * Página de importación de productos deshabilitada
 * La importación se hace desde el catálogo de cada cliente
 */
export default function ImportProductsPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/clients')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="pt-6 text-center">
          <div className="flex items-center justify-center gap-2 text-purple-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Redirigiendo a Clientes...</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
