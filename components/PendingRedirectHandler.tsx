'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth, useUser } from '@clerk/nextjs'

/**
 * Componente que maneja redirecciones pendientes después de re-login
 * y verifica si un comprador fue aceptado por un vendedor
 */
export default function PendingRedirectHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const { isSignedIn } = useAuth()
  const { user } = useUser()
  const [checkingConnection, setCheckingConnection] = useState(false)

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

  // Verificar si el comprador fue aceptado por un vendedor
  useEffect(() => {
    if (!isSignedIn || !user?.id || checkingConnection) return

    // Obtener el rol del usuario
    const role = (user.publicMetadata as any)?.role

    // Solo verificar para compradores
    if (role !== 'CLIENT') return

    const checkConnectionStatus = async () => {
      try {
        setCheckingConnection(true)
        
        const response = await fetch('/api/clients/check-connection-status')
        if (!response.ok) return

        const data = await response.json()
        
        // Si fue aceptado recientemente, redirigir al dashboard del comprador
        if (data.wasAccepted && data.justAccepted) {
          // Guardar flag para no volver a mostrar este mensaje
          localStorage.setItem('connectionAcceptedShown', 'true')
          
          // Redirigir al dashboard del comprador
          if (!pathname?.startsWith('/buyer/dashboard')) {
            router.push('/buyer/dashboard')
          }
          
          // Mostrar notificación de bienvenida
          setTimeout(() => {
            alert('¡Bienvenido! Tu solicitud ha sido aceptada. Ya puedes comenzar a realizar pedidos.')
          }, 1000)
        }
      } catch (error) {
        console.debug('Error checking connection status:', error)
      } finally {
        setCheckingConnection(false)
      }
    }

    // Verificar inmediatamente al cargar
    checkConnectionStatus()

    // Verificar cada 10 segundos si el comprador está pendiente
    const interval = setInterval(checkConnectionStatus, 10000)
    
    return () => clearInterval(interval)
  }, [isSignedIn, user, router, pathname, checkingConnection])

  return null // Este componente no renderiza nada
}
