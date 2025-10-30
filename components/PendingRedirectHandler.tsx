'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'

/**
 * Componente que maneja redirecciones pendientes después de re-login
 * Se debe incluir en el layout principal
 */
export default function PendingRedirectHandler() {
  const router = useRouter()
  const { isSignedIn } = useAuth()

  useEffect(() => {
    // Solo ejecutar si el usuario acaba de iniciar sesión
    if (isSignedIn) {
      const pendingRedirect = localStorage.getItem('pendingRedirect')
      
      if (pendingRedirect) {
        // Limpiar el localStorage
        localStorage.removeItem('pendingRedirect')
        
        // Esperar un momento para que la sesión esté completamente cargada
        setTimeout(() => {
          router.push(pendingRedirect)
        }, 500)
      }
    }
  }, [isSignedIn, router])

  return null // Este componente no renderiza nada
}
