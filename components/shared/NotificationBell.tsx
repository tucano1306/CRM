'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, Check, CheckCheck, ExternalLink, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  orderId?: string
  createdAt: string
  metadata?: any
}

// Función helper para formatear tiempo
function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'hace un momento'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} hora${hours > 1 ? 's' : ''}`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} día${days > 1 ? 's' : ''}`
  const weeks = Math.floor(days / 7)
  return `hace ${weeks} semana${weeks > 1 ? 's' : ''}`
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  // Verificar que estamos en el cliente
  useEffect(() => {
    setMounted(true)
  }, [])

  // Cargar notificaciones
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications?limit=10')
      const result = await response.json()

      if (result.success) {
        setNotifications(result.notifications || [])
        setUnreadCount(result.unreadCount || 0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Cargar al montar
  useEffect(() => {
    fetchNotifications()
  }, [])

  // Polling cada 30 segundos para nuevas notificaciones
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications()
    }, 30000) // 30 segundos

    return () => clearInterval(interval)
  }, [])

  // Marcar como leída
  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      })
      const result = await response.json()

      if (result.success) {
        setNotifications(notifications.map(n => 
          n.id === id ? { ...n, isRead: true } : n
        ))
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  // Eliminar notificación
  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        setNotifications(notifications.filter(n => n.id !== id))
        const wasUnread = notifications.find(n => n.id === id)?.isRead === false
        if (wasUnread) {
          setUnreadCount(Math.max(0, unreadCount - 1))
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Manejar clic en notificación
  const handleNotificationClick = async (notification: Notification) => {
    // Marcar como leída si no lo está
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }
    
    // Mostrar modal con detalles
    setSelectedNotification(notification)
  }

  // Navegar a la página correspondiente
  const navigateFromNotification = (notification: Notification) => {
    setSelectedNotification(null)
    setIsOpen(false)

    // Determinar la ruta según el tipo de notificación
    if (notification.orderId) {
      // Ir a la página de órdenes (no hay página individual por orden)
      router.push('/orders')
    } else if (notification.type === 'QUOTE_CREATED' || notification.type === 'QUOTE_UPDATED') {
      router.push('/quotes')
    } else if (notification.type === 'RETURN_REQUEST' || notification.type === 'RETURN_APPROVED' || notification.type === 'RETURN_REJECTED') {
      router.push('/returns')
    } else if (notification.type === 'CREDIT_NOTE_ISSUED') {
      router.push('/credit-notes')
    }
  }

  // Obtener el emoji del estado (para cambios de estado)
  const getStatusEmoji = (status: string) => {
    const statusMap: Record<string, string> = {
      'PENDING': '⏳',
      'CONFIRMED': '✅',
      'PREPARING': '👨‍🍳',
      'READY_FOR_PICKUP': '📦',
      'IN_DELIVERY': '🚚',
      'DELIVERED': '✅',
      'COMPLETED': '🎉',
      'CANCELED': '❌',
      'PAYMENT_PENDING': '💳',
      'PAID': '💰'
    }
    return statusMap[status] || '📋'
  }

  // Icono según tipo de notificación
  const getNotificationIcon = (type: string) => {
    switch (type) {
      // Comprador → Vendedor
      case 'NEW_ORDER':
        return '🛒'
      case 'ORDER_MODIFIED':
        return '📝'
      case 'ORDER_CANCELLED':
        return '❌'
      case 'RETURN_REQUEST':
        return '↩️'
      
      // Vendedor → Comprador
      case 'ORDER_STATUS_CHANGED':
        return '�'
      case 'ORDER_CONFIRMED':
        return '✅'
      case 'ORDER_COMPLETED':
        return '🎉'
      case 'QUOTE_CREATED':
        return '📄'
      case 'QUOTE_UPDATED':
        return '📝'
      case 'RETURN_APPROVED':
        return '✅'
      case 'RETURN_REJECTED':
        return '❌'
      case 'CREDIT_NOTE_ISSUED':
        return '💳'
      
      // Bidireccional
      case 'CHAT_MESSAGE':
        return '💬'
      case 'PAYMENT_RECEIVED':
        return '�'
      
      // Sistema
      case 'LOW_STOCK_ALERT':
        return '⚠️'
      
      default:
        return '🔔'
    }
  }

  return (
    <>
      <div className="relative">
        {/* Botón de campana */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Bell className="h-6 w-6 text-gray-700 dark:text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Panel de notificaciones usando Portal */}
      {mounted && isOpen && createPortal(
        <>
          {/* Overlay para cerrar al hacer click afuera */}
          <div
            className="fixed inset-0 bg-black/20 z-[9998]"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel - Responsive: centrado en móvil, esquina en desktop */}
          <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] max-h-[calc(100vh-2rem)] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Notificaciones
                  </h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                      >
                        <CheckCheck className="h-4 w-4" />
                        Marcar todas
                      </button>
                    )}
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                    >
                      <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
                {unreadCount > 0 && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Tienes {unreadCount} notificación{unreadCount !== 1 ? 'es' : ''} sin leer
                  </p>
                )}
              </div>

              {/* Lista de notificaciones */}
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2">Cargando...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="font-medium">No hay notificaciones</p>
                    <p className="text-sm mt-1">Todas las notificaciones aparecerán aquí</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                          !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icono */}
                          <div className="text-2xl flex-shrink-0">
                            {getNotificationIcon(notification.type)}
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-semibold ${
                                !notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.title}
                              </h4>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                              {getTimeAgo(notification.createdAt)}
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </p>
                          </div>
                        </div>

                        {/* Acciones rápidas */}
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteNotification(notification.id)
                            }}
                            className="text-xs text-red-600 hover:text-red-700 ml-auto"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <button
                    onClick={() => {
                      setIsOpen(false)
                      // Aquí podrías navegar a una página completa de notificaciones
                    }}
                    className="w-full text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    Ver todas las notificaciones
                  </button>
                </div>
              )}
            </div>
          </>,
        document.body
      )}

      {/* Modal de detalles de notificación usando Portal */}
      {mounted && selectedNotification && createPortal(
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4"
            onClick={() => setSelectedNotification(null)}
          >
            {/* Modal - Responsive y centrado */}
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 relative transform transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Botón cerrar */}
              <button
                onClick={() => setSelectedNotification(null)}
                className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>

              {/* Icono grande */}
              <div className="text-center mb-4">
                <div className="text-6xl mb-3">
                  {getNotificationIcon(selectedNotification.type)}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedNotification.title}
                </h2>
              </div>

              {/* Mensaje detallado */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
                <p className="text-gray-700 dark:text-gray-300 text-center leading-relaxed">
                  {selectedNotification.message}
                </p>

                {/* Información adicional según el tipo */}
                {selectedNotification.type === 'ORDER_STATUS_CHANGED' && selectedNotification.metadata && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <div className="flex items-center justify-center gap-4">
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado anterior</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getStatusEmoji(selectedNotification.metadata.oldStatus)}</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {selectedNotification.metadata.oldStatus}
                          </span>
                        </div>
                      </div>
                      <div className="text-3xl text-gray-400">→</div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estado nuevo</p>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getStatusEmoji(selectedNotification.metadata.newStatus)}</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">
                            {selectedNotification.metadata.newStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Información de monto (para créditos, devoluciones, etc) */}
                {selectedNotification.metadata?.amount && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Monto</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      ${Number(selectedNotification.metadata.amount).toFixed(2)}
                    </p>
                  </div>
                )}

                {/* Razón de rechazo */}
                {selectedNotification.metadata?.reason && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Motivo:</p>
                    <p className="text-gray-700 dark:text-gray-300 italic">
                      "{selectedNotification.metadata.reason}"
                    </p>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                {getTimeAgo(selectedNotification.createdAt)}
              </p>

              {/* Botones de acción */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => navigateFromNotification(selectedNotification)}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium transition-all flex items-center justify-center gap-2"
                >
                  Ver detalles
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
