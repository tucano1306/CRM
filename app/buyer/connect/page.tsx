'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, UserPlus, Clock, Send } from 'lucide-react'
import { apiCall } from '@/lib/api-client'

type ConnectionStatus = 'loading' | 'ready' | 'connecting' | 'request_sent' | 'pending' | 'already_connected' | 'error'

function ConnectPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  
  const [status, setStatus] = useState<ConnectionStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [sellerInfo, setSellerInfo] = useState<{
    name: string
    email: string
    phone?: string
  } | null>(null)
  const [requestInfo, setRequestInfo] = useState<{
    requestId?: string
    createdAt?: string
  } | null>(null)

  const token = searchParams.get('token')
  const sellerId = searchParams.get('seller')

  const validateInvitation = useCallback(async () => {
    try {
      setStatus('loading')
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
      
      if (!response.success) {
        throw new Error('Vendedor no encontrado')
      }

      setSellerInfo(response.data)
      setStatus('ready')

    } catch (err: any) {
      console.error('Error validando invitación:', err)
      setError(err.message || 'Error al validar la invitación')
      setStatus('error')
    }
  }, [token, sellerId])

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
      setStatus('error')
      return
    }

    // Validar el token y obtener info del vendedor
    validateInvitation()
  }, [isLoaded, token, sellerId, userId, router, validateInvitation])

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
      setStatus('connecting')
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

      // Manejar diferentes estados de respuesta
      switch (response.status) {
        case 'ALREADY_CONNECTED':
          setStatus('already_connected')
          setTimeout(() => {
            router.push('/buyer/dashboard')
          }, 2000)
          break
          
        case 'PENDING':
          setStatus('pending')
          setRequestInfo({
            requestId: response.data?.requestId,
            createdAt: response.data?.createdAt
          })
          break
          
        case 'REQUEST_SENT':
          setStatus('request_sent')
          setRequestInfo({
            requestId: response.data?.requestId
          })
          break
          
        default:
          setStatus('request_sent')
      }

    } catch (err: any) {
      console.error('Error conectando con vendedor:', err)
      setError(err.message || 'Error al conectar con el vendedor')
      setStatus('error')
    }
  }

  // Estado: Cargando
  if (status === 'loading') {
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

  // Estado: Error
  if (status === 'error' && !sellerInfo) {
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

  // Estado: Solicitud enviada
  if (status === 'request_sent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-white">¡Solicitud Enviada!</CardTitle>
                <CardDescription className="text-green-100">
                  Tu solicitud está pendiente de aprobación
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-gray-700">
                Hemos enviado tu solicitud a <span className="font-bold text-green-700">{sellerInfo?.name}</span>.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Te notificaremos cuando el vendedor apruebe tu solicitud. Esto puede tomar unos minutos.
              </p>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-800">Esperando respuesta del vendedor...</span>
            </div>

            <Button 
              onClick={() => router.push('/')} 
              variant="outline"
              className="w-full"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: Ya tenía solicitud pendiente
  if (status === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-white">Solicitud Pendiente</CardTitle>
                <CardDescription className="text-amber-100">
                  Ya tienes una solicitud en proceso
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-gray-700">
                Ya enviaste una solicitud a <span className="font-bold text-amber-700">{sellerInfo?.name}</span>.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                El vendedor aún no ha respondido. Te notificaremos cuando lo haga.
              </p>
            </div>

            <Button 
              onClick={() => router.push('/')} 
              variant="outline"
              className="w-full"
            >
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: Ya conectado
  if (status === 'already_connected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-white">¡Ya Estás Conectado!</CardTitle>
                <CardDescription className="text-blue-100">
                  Ya eres cliente de este vendedor
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-gray-700">
                Ya estás conectado con <span className="font-bold text-blue-700">{sellerInfo?.name}</span>.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Redirigiendo a tu dashboard...
              </p>
            </div>
            
            <div className="flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Estado: Listo para conectar
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-full">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-white">Invitación de Vendedor</CardTitle>
              <CardDescription className="text-purple-100">
                Has sido invitado a conectarte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {sellerInfo && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-5">
              <p className="text-sm text-gray-500 mb-1">Vendedor:</p>
              <p className="font-bold text-xl text-purple-800">{sellerInfo.name}</p>
              {sellerInfo.email && (
                <p className="text-sm text-gray-600 mt-2">📧 {sellerInfo.email}</p>
              )}
              {sellerInfo.phone && (
                <p className="text-sm text-gray-600">📱 {sellerInfo.phone}</p>
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  📝 Para conectarte necesitas iniciar sesión o crear una cuenta.
                </p>
              </div>
              <Button 
                onClick={handleConnect} 
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                size="lg"
              >
                Continuar
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  ✅ Al enviar la solicitud, el vendedor recibirá una notificación y podrá aceptarte como cliente.
                </p>
              </div>
              <Button 
                onClick={handleConnect} 
                disabled={status === 'connecting'}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                size="lg"
              >
                {status === 'connecting' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando solicitud...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Solicitud de Conexión
                  </>
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
