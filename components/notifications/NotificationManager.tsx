'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { pushNotificationService } from '@/lib/notifications'

interface NotificationManagerProps {
  userRole?: 'SELLER' | 'CLIENT' | null
}

/**
 * Componente que maneja las notificaciones push, badges y sonidos
 * Debe incluirse en el layout principal de la app
 */
export default function NotificationManager({ userRole }: NotificationManagerProps) {
  const { user, isLoaded } = useUser()
  const initialized = useRef(false)
  const lastNotificationCount = useRef<number>(0)

  // Inicializar servicio de notificaciones
  useEffect(() => {
    if (!isLoaded || !user || initialized.current) return

    const initNotifications = async () => {
      const granted = await pushNotificationService.init()
      if (granted) {
        console.log('🔔 Notificaciones activadas')
        initialized.current = true
      }
    }

    initNotifications()
  }, [isLoaded, user])

  // Verificar cambios periódicamente
  const checkForUpdates = useCallback(async () => {
    if (!user || !initialized.current) return

    try {
      // Obtener conteo de notificaciones no leídas
      const response = await fetch('/api/notifications/unread-count')
      if (!response.ok) return

      const data = await response.json()
      const unreadCount = data.count || 0

      // Si hay nuevas notificaciones
      if (unreadCount > lastNotificationCount.current) {
        // Actualizar badge del ícono
        await pushNotificationService.setBadge(unreadCount)

        // Vibrar y reproducir sonido
        pushNotificationService.vibrate([200, 100, 200])
        pushNotificationService.playSound('/notification.mp3')

        // Mostrar notificación push
        const newCount = unreadCount - lastNotificationCount.current
        await pushNotificationService.sendNotification({
          title: userRole === 'CLIENT' ? '📦 Actualización' : '🛒 Nueva actividad',
          body: `Tienes ${newCount} nueva${newCount > 1 ? 's' : ''} notificación${newCount > 1 ? 'es' : ''}`,
          url: userRole === 'CLIENT' ? '/buyer/orders' : '/orders',
          tag: 'unread-notifications'
        })
      } else if (unreadCount === 0 && lastNotificationCount.current > 0) {
        // Limpiar badge si ya no hay notificaciones
        await pushNotificationService.clearBadge()
      }

      lastNotificationCount.current = unreadCount
    } catch (error) {
      // Intentionally silenced: polling errors are non-critical and should not disrupt UX
      console.debug('Notification polling error:', error)
    }
  }, [user, userRole])

  // Polling cada 30 segundos
  useEffect(() => {
    if (!isLoaded || !user) return

    // Verificar inmediatamente al cargar
    checkForUpdates()

    // Configurar polling
    const interval = setInterval(checkForUpdates, 30000)

    return () => clearInterval(interval)
  }, [isLoaded, user, checkForUpdates])

  // Este componente no renderiza nada visible
  return null
}
