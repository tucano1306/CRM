'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

function ConnectPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { isLoaded, userId } = useAuth()
  
  const [status, setStatus] = useState<'loading' | 'connecting' | 'success' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const token = searchParams.get('token')
  const sellerId = searchParams.get('seller')

  useEffect(() => {
    if (!isLoaded) return

    // Si no hay usuario, guardar datos y redirigir a sign-up
    if (!userId) {
      const redirectUrl = `/buyer/connect?token=${token}&seller=${sellerId}`
      sessionStorage.setItem('pendingInvitation', JSON.stringify({ token, sellerId }))
      router.push(`/buyer/sign-up?redirect_url=${encodeURIComponent(redirectUrl)}`)
      return
    }

    // Si hay usuario, conectar automáticamente
    connectToSeller()
  }, [isLoaded, userId, token, sellerId])

  const connectToSeller = async () => {
    if (!token || !sellerId) {
      setError('Link de invitación inválido')
      setStatus('error')
      return
    }

    try {
      setStatus('connecting')

      console.log('🔗 Conectando con vendedor:', { token, sellerId, userId })

      const response = await fetch('/api/buyer/connect-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, sellerId })
      })

      const data = await response.json()
      console.log('📡 Respuesta:', data)

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al conectar')
      }

      // Éxito - limpiar sessionStorage y redirigir
      sessionStorage.removeItem('pendingInvitation')
      setStatus('success')
      
      setTimeout(() => {
        router.push('/buyer/dashboard')
      }, 2000)

    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Error al conectar')
      setStatus('error')
    }
  }

  if (status === 'loading' || status === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-gray-600">
                {status === 'loading' ? 'Cargando...' : 'Conectando con el vendedor...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <CardTitle className="text-green-800">¡Conexión Exitosa!</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Redirigiendo al dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-6 w-6 text-red-600" />
            <CardTitle>Error</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => router.push('/')} variant="outline" className="w-full">
            Volver al inicio
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <ConnectPageContent />
    </Suspense>
  )
}
