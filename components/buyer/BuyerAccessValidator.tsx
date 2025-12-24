'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react'

interface BuyerAccessValidatorProps {
  readonly children: React.ReactNode
}

type AccessState = 'loading' | 'validating' | 'granted' | 'denied'

export function BuyerAccessValidator({ children }: BuyerAccessValidatorProps) {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [accessState, setAccessState] = useState<AccessState>('loading')
  const [errorReason, setErrorReason] = useState<string>('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  const validateAccess = useCallback(async () => {
    if (!isLoaded || !user) return

    setAccessState('validating')
    
    try {
      const response = await fetch('/api/buyer/validate-access', {
        method: 'GET',
      })

      const data = await response.json()

      if (data.hasAccess) {
        setAccessState('granted')
      } else {
        setErrorReason(data.reason || 'Tu cuenta de cliente no existe en el sistema')
        setAccessState('denied')
      }
    } catch (error) {
      console.error('Error validando acceso:', error)
      setErrorReason('Error de conexión. Intenta de nuevo.')
      setAccessState('denied')
    }
  }, [isLoaded, user])

  useEffect(() => {
    validateAccess()
  }, [validateAccess])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      setIsSigningOut(false)
    }
  }

  const handleRetry = () => {
    validateAccess()
  }

  // Loading state
  if (!isLoaded || accessState === 'loading' || accessState === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastel-blue via-pastel-cream to-pastel-sand">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando acceso...</p>
        </div>
      </div>
    )
  }

  // Access denied - show full-screen error (no redirect to avoid loop)
  if (accessState === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center border border-red-100">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Acceso Denegado
          </h1>
          
          <p className="text-gray-600 mb-4">
            {errorReason}
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <strong>¿Qué puedes hacer?</strong>
              <br />
              Contacta con tu vendedor para que te agregue como cliente nuevamente.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={handleRetry}
              disabled={isSigningOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              Verificar de nuevo
            </button>
            
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isSigningOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                  Cerrando sesión...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión e iniciar con otra cuenta
                </>
              )}
            </button>
          </div>
          
          <p className="mt-6 text-xs text-gray-400">
            Si crees que esto es un error, contacta con soporte técnico.
          </p>
        </div>
      </div>
    )
  }

  // Access granted - render children
  return <>{children}</>
}
