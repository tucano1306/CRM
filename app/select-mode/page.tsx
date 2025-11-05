'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, ShoppingCart, ArrowRight, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SelectModeContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Bargain CRM
          </h1>
          <p className="text-xl text-gray-600">
            Sistema de gestión de pedidos de comida
          </p>
          <p className="text-md text-gray-500 mt-2">
            Selecciona tu tipo de acceso
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-8 mx-auto max-w-2xl">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  {error === 'not_seller' && 'No tienes permisos de vendedor'}
                  {error === 'not_buyer' && 'No tienes permisos de comprador'}
                  {!error.startsWith('not_') && 'Acceso no autorizado'}
                </h3>
                <p className="text-sm text-red-700">
                  {error === 'not_seller' && 'Tu cuenta está registrada como comprador. Selecciona la opción de comprador para continuar.'}
                  {error === 'not_buyer' && 'Tu cuenta está registrada como vendedor. Selecciona la opción de vendedor para continuar.'}
                  {!error.startsWith('not_') && 'Por favor, selecciona el tipo de acceso que corresponde a tu cuenta.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tarjetas de Selección */}
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Opción Vendedor */}
          <Link href="/?mode=seller" className="transform transition-transform hover:scale-105">
            <Card className="h-full cursor-pointer border-2 border-transparent hover:border-violet-500 hover:shadow-2xl">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center">
                  <Store className="w-10 h-10 text-violet-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Soy Vendedor
                </CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Gestiona tu negocio y ventas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-violet-500 mr-2">✓</span>
                    <span>Administra productos y catálogo</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-violet-500 mr-2">✓</span>
                    <span>Gestiona clientes y pedidos</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-violet-500 mr-2">✓</span>
                    <span>Crea cotizaciones y facturas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-violet-500 mr-2">✓</span>
                    <span>Reportes y estadísticas</span>
                  </li>
                </ul>
                
                <div className="pt-4">
                  <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white">
                    Acceder como Vendedor
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Opción Comprador */}
          <Link href="/?mode=buyer" className="transform transition-transform hover:scale-105">
            <Card className="h-full cursor-pointer border-2 border-transparent hover:border-blue-500 hover:shadow-2xl">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-4 w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <ShoppingCart className="w-10 h-10 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Soy Comprador
                </CardTitle>
                <CardDescription className="text-base text-gray-600">
                  Realiza pedidos fácilmente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    <span>Explora productos disponibles</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    <span>Realiza pedidos en línea</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    <span>Revisa cotizaciones recibidas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-500 mr-2">✓</span>
                    <span>Historial de compras</span>
                  </li>
                </ul>
                
                <div className="pt-4">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Acceder como Comprador
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>

        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            ¿Primera vez? El sistema te pedirá iniciar sesión o registrarte
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Versión de prueba - Deployment en Vercel
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SelectModePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    }>
      <SelectModeContent />
    </Suspense>
  )
}
