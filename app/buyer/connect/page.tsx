'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, UserPlus } from 'lucide-react'
import { apiCall } from '@/lib/api-client'

function ConnectPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sellerInfo, setSellerInfo] = useState<{
    name: string
    email: string
    phone?: string
  } | null>(null)

  const token = searchParams.get('token')
  const sellerId = searchParams.get('seller')

  useEffect(() => {
    if (!isLoaded) return

    // Verificar si hay una invitación pendiente después del login
    if (userId && typeof window !== 'undefined') {
      const pending = sessionStorage.getItem('pendingInvitation')
      if (pending) {
        const { token: pendingToken, sellerId: pendingSellerId } = JSON.parse(pending)
        sessionStorage.removeItem('pendingInvitation')
        
        // Si no hay token en la URL pero sí en sessionStorage, redirigir con el token
        if (!token && pendingToken) {
          router.push(`/buyer/connect?token=${pendingToken}&seller=${pendingSellerId}`)
          return
        }
      }
    }

    // Si no hay token o sellerId, mostrar error
    if (!token || !sellerId) {
      setError('Link de invitación inválido')
      setLoading(false)
      return
    }

    // Validar el token y obtener info del vendedor
    validateInvitation()
  }, [isLoaded, token, sellerId, userId])

  const validateInvitation = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('🔍 Validando invitación:', { token, sellerId })

      // Validar formato del token
      if (!token?.startsWith('inv_')) {
        throw new Error('Token de invitación inválido')
      }

      // Obtener información del vendedor
      console.log('📞 Llamando a:', `/api/sellers/${sellerId}`)
      const response = await apiCall(`/api/sellers/${sellerId}`)
      
      console.log('📡 Respuesta de validación:', response)
      console.log('📡 response.success:', response.success)
      console.log('📡 response.data:', response.data)
      console.log('📡 response.error:', response.error)
      
      if (!response.success) {
        throw new Error('Vendedor no encontrado')
      }

      setSellerInfo(response.data)
      setLoading(false)

    } catch (err: any) {
      console.error('Error validando invitación:', err)
      setError(err.message || 'Error al validar la invitación')
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (!userId) {
      // Guardar el token en sessionStorage para recuperarlo después del login
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingInvitation', JSON.stringify({ token, sellerId }))
      }
      // Redirigir a sign-in con redirect_url para volver aquí
      const currentUrl = window.location.href
      router.push(`/sign-in?redirect_url=${encodeURIComponent(currentUrl)}`)
      return
    }

    try {
      setConnecting(true)
      setError(null)

      console.log('🔗 Conectando con vendedor:', { token, sellerId, userId })

      // Conectar el comprador con el vendedor
      const response = await apiCall('/api/buyer/connect-seller', {
        method: 'POST',
        body: JSON.stringify({
          token,
          sellerId
        })
      })

      console.log('📡 Respuesta del servidor:', response)

      if (!response.success) {
        throw new Error(response.error || 'Error al conectar con el vendedor')
      }

      setSuccess(true)

      // Redirigir al dashboard del comprador después de 1.5 segundos
      setTimeout(() => {
        router.push('/buyer/dashboard')
      }, 1500)

    } catch (err: any) {
      console.error('Error conectando con vendedor:', err)
      setError(err.message || 'Error al conectar con el vendedor')
    } finally {
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Validando invitación...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error && !sellerInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <CardTitle>Link Inválido</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline" className="w-full">
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle>¡Conexión Exitosa!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Te has conectado exitosamente con <span className="font-semibold">{sellerInfo?.name}</span>.
            </p>
            <p className="text-sm text-gray-500">
              Redirigiendo a tu dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <CardTitle>Invitación de Vendedor</CardTitle>
          </div>
          <CardDescription>
            Has sido invitado a conectarte con un vendedor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sellerInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Vendedor:</p>
              <p className="font-semibold text-lg">{sellerInfo.name}</p>
              {sellerInfo.email && (
                <p className="text-sm text-gray-600 mt-1">{sellerInfo.email}</p>
              )}
              {sellerInfo.phone && (
                <p className="text-sm text-gray-600">{sellerInfo.phone}</p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!userId ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Para conectarte con este vendedor, necesitas iniciar sesión o crear una cuenta.
              </p>
              <Button 
                onClick={handleConnect} 
                className="w-full"
                size="lg"
              >
                Continuar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Al aceptar, podrás realizar pedidos y comunicarte directamente con este vendedor.
              </p>
              <Button 
                onClick={handleConnect} 
                disabled={connecting}
                className="w-full"
                size="lg"
              >
                {connecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  'Aceptar y Conectar'
                )}
              </Button>
              <Button 
                onClick={() => router.push('/')} 
                variant="outline"
                className="w-full"
              >
                Cancelar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Cargando...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ConnectPageContent />
    </Suspense>
  )
}
