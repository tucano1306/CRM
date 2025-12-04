'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import NotificationManager from '@/components/notifications/NotificationManager'

/**
 * Wrapper que inicializa el sistema de notificaciones push
 */
export default function NotificationInitializer() {
  const { user, isLoaded } = useUser()
  const [userRole, setUserRole] = useState<'SELLER' | 'CLIENT' | null>(null)

  useEffect(() => {
    if (isLoaded && user) {
      const role = (user.publicMetadata?.role as string) || null
      setUserRole(role as 'SELLER' | 'CLIENT' | null)
    }
  }, [isLoaded, user])

  if (!isLoaded || !user) return null

  return <NotificationManager userRole={userRole} />
}
