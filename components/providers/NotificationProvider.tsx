'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { NotificationType } from '@prisma/client'
import { useUser } from '@clerk/nextjs'
import { useRealtimeSubscription, RealtimeEvents } from '@/lib/supabase-realtime'

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
  realtimeConnected: boolean
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  refreshNotifications: () => Promise<void>
  clearNewNotification: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  readonly children: React.ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useUser()
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
      
      // Actualizar IDs previos
      const currentIds = new Set<string>(notificationsData.map((n: Notification) => n.id))
      previousNotificationIdsRef.current = currentIds
      
      setNotifications(notificationsData)
      setError(null)
    } catch (err: any) {
      setError(err.name === 'AbortError' ? 'Timeout' : err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  // 📡 REALTIME: Escuchar nuevas notificaciones via Supabase
  const { isConnected: realtimeConnected } = useRealtimeSubscription(
    `notifications-${user?.id}`,
    RealtimeEvents.NOTIFICATION_NEW,
    useCallback((payload: any) => {
      console.log('🔔 Realtime: Nueva notificación recibida', payload)
      
      // Crear objeto de notificación desde el payload
      const newNotif: Notification = {
        id: payload.id,
        type: payload.type as NotificationType,
        title: payload.title,
        message: payload.message,
        orderId: payload.orderId || null,
        clientId: null,
        sellerId: null,
        isRead: false,
        createdAt: new Date(payload.createdAt),
        readAt: null,
        relatedId: payload.relatedId || null,
      }
      
      // Agregar al principio de la lista
      setNotifications(prev => {
        // Evitar duplicados
        if (prev.some(n => n.id === newNotif.id)) return prev
        return [newNotif, ...prev]
      })
      
      // Mostrar como nueva notificación
      setNewNotification(newNotif)
      
      // Reproducir sonido
      try {
        const audio = new Audio('/notification.mp3')
        audio.volume = 0.5
        audio.play().catch(() => {})
      } catch {
        // Ignorar si no hay sonido
      }
    }, []),
    !!user?.id
  )

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
    
    // 📡 POLLING DE RESPALDO: Solo cada 60 segundos como fallback
    const backupInterval = setInterval(() => {
      if (!realtimeConnected) {
        console.log('🔄 Notifications backup polling (realtime disconnected)')
        fetchNotifications()
      }
    }, 60000)
    
    return () => clearInterval(backupInterval)
  }, [fetchNotifications, realtimeConnected])

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      loading, 
      error, 
      newNotification,
      realtimeConnected,
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