'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { NotificationType } from '@prisma/client'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  orderId: string | null
  clientId: string | null
  sellerId: string | null
  isRead: boolean
  createdAt: Date
  readAt: string | null
  relatedId: string | null
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  newNotification: Notification | null
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
  clearNewNotification: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newNotification, setNewNotification] = useState<Notification | null>(null)
  const previousNotificationIdsRef = useRef<Set<string>>(new Set())

  const fetchNotifications = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      const response = await fetch('/api/notifications', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' },
      })
      clearTimeout(timeoutId)
      if (!response.ok) throw new Error(`Error ${response.status}`)
      const result = await response.json()
      const notificationsData = result.data?.data?.notifications || result.data?.notifications || result.notifications || []
      
      // Detectar nuevas notificaciones
      const currentIds = new Set<string>(notificationsData.map((n: Notification) => n.id))
      const newIds = Array.from(currentIds).filter(id => !previousNotificationIdsRef.current.has(id))
      
      if (newIds.length > 0 && previousNotificationIdsRef.current.size > 0) {
        // Hay notificaciones nuevas (y no es la primera carga)
        const newestNotification = notificationsData.find((n: Notification) => newIds.includes(n.id))
        if (newestNotification && !newestNotification.isRead) {
          // ⚠️ LOG COMENTADO PARA REDUCIR RUIDO EN DESARROLLO
          // console.log('🔔 [NOTIFICATION PROVIDER] Nueva notificación detectada:', newestNotification)
          setNewNotification(newestNotification)
        }
      }
      
      previousNotificationIdsRef.current = currentIds
      setNotifications(notificationsData)
      setError(null)
    } catch (err: any) {
      setError(err.name === 'AbortError' ? 'Timeout' : err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    } catch (err) {
      console.error('Error:', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (err) {
      console.error('Error:', err)
    }
  }, [])

  const clearNewNotification = useCallback(() => {
    setNewNotification(null)
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000) // Cada 10 segundos
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      error, 
      newNotification,
      markAsRead, 
      markAllAsRead, 
      refreshNotifications: fetchNotifications,
      clearNewNotification
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) throw new Error('useNotifications must be used within a NotificationProvider')
  return context
}