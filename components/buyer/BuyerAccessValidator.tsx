'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface BuyerAccessValidatorProps {
  readonly children: React.ReactNode
}

export function BuyerAccessValidator({ children }: BuyerAccessValidatorProps) {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [isValidating, setIsValidating] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    if (!isLoaded || !user) return

    async function validateAccess() {
      try {
        const response = await fetch('/api/buyer/validate-access', {
          method: 'GET',
        })

        const data = await response.json()

        if (data.hasAccess) {
          setHasAccess(true)
        } else {
          // Cliente no existe o no tiene conexión activa
          alert(
            '❌ No tienes acceso a esta aplicación.\n\n' +
            'Razón: ' + (data.reason || 'No estás conectado con ningún vendedor') + '\n\n' +
            'Contacta con tu vendedor para que te agregue nuevamente.'
          )
          router.push('/login')
        }
      } catch (error) {
        console.error('Error validando acceso:', error)
        alert('Error al validar tu acceso. Intenta de nuevo.')
        router.push('/login')
      } finally {
        setIsValidating(false)
      }
    }

    validateAccess()
  }, [isLoaded, user, router])

  if (!isLoaded || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pastel-blue via-pastel-cream to-pastel-sand">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Validando acceso...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) {
    return null
  }

  return <>{children}</>
}
