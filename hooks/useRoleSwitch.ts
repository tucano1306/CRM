import { useState } from 'react'
import { useAuth, useUser } from '@clerk/nextjs'

export type UserRole = 'CLIENT' | 'SELLER' | 'ADMIN'

export function useRoleSwitch() {
  const { getToken, signOut } = useAuth()
  const { user } = useUser()
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentRole = (user?.publicMetadata?.role as UserRole) || 'CLIENT'

  /**
   * Cambia el rol del usuario con actualización completa de sesión
   */
  const switchRole = async (newRole: UserRole) => {
    try {
      setSwitching(true)
      setError(null)

      // 1. Actualizar el rol en Clerk
      const response = await fetch('/api/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar rol')
      }

      // 2. Forzar actualización del token JWT
      await getToken({ skipCache: true })

      // 3. Recargar información del usuario
      await user?.reload()

      // 4. Pequeña espera para asegurar propagación
      await new Promise(resolve => setTimeout(resolve, 300))

      // 5. Redireccionar con recarga completa
      window.location.href = data.redirect

      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      setSwitching(false)
      return false
    }
  }

  /**
   * Método alternativo: cambia rol con logout/login
   * Más lento pero 100% confiable
   */
  const switchRoleWithReauth = async (newRole: UserRole) => {
    try {
      setSwitching(true)
      setError(null)

      // 1. Actualizar el rol
      const response = await fetch('/api/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cambiar rol')
      }

      // 2. Guardar redirección en localStorage
      localStorage.setItem('pendingRedirect', data.redirect)

      // 3. Hacer logout (fuerza re-login)
      await signOut({ redirectUrl: '/sign-in' })

      return true

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      setSwitching(false)
      return false
    }
  }

  return {
    currentRole,
    switching,
    error,
    switchRole,
    switchRoleWithReauth,
    clearError: () => setError(null)
  }
}
