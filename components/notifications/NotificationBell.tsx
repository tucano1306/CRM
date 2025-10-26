'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, ExternalLink, Package } from 'lucide-react'
import { NotificationType } from '@prisma/client'
import { useNotifications } from '@/components/providers/NotificationProvider'
import { useRouter } from 'next/navigation'

type Notification = {
  id: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  createdAt: Date
  readAt: string | null
  orderId: string | null
  relatedId: string | null
}

export default function NotificationBell() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, newNotification, clearNewNotification } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Asegurar que el componente está montado (para Portal)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Debug: log cuando el componente renderiza
  useEffect(() => {
    console.log('🔔 NotificationBell COMPRADOR rendered. Notifications:', notifications.length, 'Unread:', unreadCount)
    console.log('🔔 Este es el componente del COMPRADOR (NotificationBell.tsx)')
  }, [notifications, unreadCount])

  // 🆕 Detectar nueva notificación y abrir modal automáticamente
  useEffect(() => {
    if (newNotification) {
      console.log('🔔 [AUTO MODAL] Nueva notificación recibida, abriendo modal...', newNotification)
      setSelectedNotification(newNotification)
      setIsOpen(true) // También abrir el dropdown
      
      // Marcar como leída después de 5 segundos
      const timer = setTimeout(() => {
        markAsRead(newNotification.id)
        clearNewNotification()
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [newNotification, markAsRead, clearNewNotification])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Formatear fecha relativa
  const getRelativeTime = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    if (diffDays === 1) return 'Ayer'
    if (diffDays < 7) return `Hace ${diffDays} días`
    return dateObj.toLocaleDateString()
  }

  // Icono según tipo
  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'NEW_ORDER':
      case 'ORDER_MODIFIED':
        return '📦'
      case 'ORDER_CONFIRMED':
      case 'ORDER_COMPLETED':
        return '✅'
      case 'ORDER_CANCELLED':
        return '❌'
      case 'CHAT_MESSAGE':
        return '💬'
      case 'LOW_STOCK_ALERT':
        return '⚠️'
      case 'RETURN_REQUEST':
        return '🔄'
      case 'QUOTE_CREATED':
      case 'QUOTE_UPDATED':
        return '📋'
      case 'CREDIT_NOTE_ISSUED':
        return '💰'
      default:
        return '🔔'
    }
  }

  // Determinar ruta según tipo de notificación
  const getNotificationRoute = (notification: Notification) => {
    switch (notification.type) {
      case 'QUOTE_CREATED':
      case 'QUOTE_UPDATED':
        return `/dashboard/quotes${notification.orderId ? `?id=${notification.orderId}` : ''}`
      case 'RETURN_REQUEST':
        return `/dashboard/returns${notification.orderId ? `?id=${notification.orderId}` : ''}`
      case 'CREDIT_NOTE_ISSUED':
        return `/buyer/credit-notes${notification.orderId ? `?id=${notification.orderId}` : ''}`
      case 'CHAT_MESSAGE':
        return `/chat${notification.orderId ? `?orderId=${notification.orderId}` : ''}`
      case 'LOW_STOCK_ALERT':
        return `/products`
      case 'NEW_ORDER':
      case 'ORDER_MODIFIED':
      case 'ORDER_CONFIRMED':
      case 'ORDER_COMPLETED':
      case 'ORDER_CANCELLED':
      default:
        return `/orders${notification.orderId ? `?id=${notification.orderId}` : ''}`
    }
  }

  // Obtener texto del botón según tipo
  const getActionButtonText = (type: NotificationType) => {
    switch (type) {
      case 'QUOTE_CREATED':
      case 'QUOTE_UPDATED':
        return 'Ver Cotización'
      case 'RETURN_REQUEST':
        return 'Ver Devolución'
      case 'CREDIT_NOTE_ISSUED':
        return 'Ver Nota de Crédito'
      case 'CHAT_MESSAGE':
        return 'Ver Chat'
      case 'LOW_STOCK_ALERT':
        return 'Ver Productos'
      default:
        return 'Ver Orden'
    }
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => {
          console.log('🔔 Bell clicked. Current isOpen:', isOpen, 'Will toggle to:', !isOpen)
          console.log('🔔 Current notifications:', notifications.length)
          setIsOpen(!isOpen)
        }}
        className="relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        aria-label="Notificaciones"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel - Con Portal */}
      {mounted && isOpen && createPortal(
        <>
          {/* Overlay transparente para cerrar al hacer clic fuera */}
          <div
            className="fixed inset-0 bg-transparent z-[9998]"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel de notificaciones */}
          <div 
            ref={dropdownRef}
            className="fixed top-20 right-6 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col"
          >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="font-bold text-gray-900 dark:text-white">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold"
                >
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Cargando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                No hay notificaciones
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                      !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id)
                      }
                      setSelectedNotification(notification)
                      setIsOpen(false)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {getTypeIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.isRead ? 'font-semibold' : 'font-medium'} text-gray-900 dark:text-white`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {getRelativeTime(notification.createdAt)}
                        </p>
                      </div>
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
                onClick={() => setIsOpen(false)}
                className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold"
              >
                Ver todas
              </button>
            </div>
          )}
        </div>
        </>,
        document.body
      )}

      {/* Modal de detalles - Centrado y responsive */}
      {mounted && selectedNotification && createPortal(
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={() => {
              setSelectedNotification(null)
              if (newNotification?.id === selectedNotification.id) {
                clearNewNotification()
              }
            }}
          >
            {/* Modal - Responsive y centrado con animación */}
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative transform transition-all animate-in slide-in-from-bottom-4 duration-500 ring-4 ring-blue-500/50"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Badge de "Nueva" si es una notificación nueva */}
              {newNotification?.id === selectedNotification.id && (
                <div className="absolute -top-3 -right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce">
                  ¡NUEVA!
                </div>
              )}
              
              <div className="flex items-start justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3 sm:gap-4">
                  <span className="text-3xl sm:text-4xl animate-bounce">{getTypeIcon(selectedNotification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words">{selectedNotification.title}</h2>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">{getRelativeTime(selectedNotification.createdAt)}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedNotification(null)
                    if (newNotification?.id === selectedNotification.id) {
                      clearNewNotification()
                    }
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-4 sm:p-6">
                <p className="text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed break-words">{selectedNotification.message}</p>
                {selectedNotification.orderId && (
                  <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-semibold mb-2 text-sm sm:text-base">
                      <Package size={18} className="sm:w-5 sm:h-5" />
                      <span>Orden relacionada</span>
                    </div>
                    <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-400 font-mono break-all">ID: {selectedNotification.orderId}</p>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col sm:flex-row gap-2 sm:gap-3">
                {selectedNotification.orderId && (
                  <button
                    onClick={() => {
                      router.push(getNotificationRoute(selectedNotification))
                      setSelectedNotification(null)
                      setIsOpen(false)
                      if (newNotification?.id === selectedNotification.id) {
                        clearNewNotification()
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm sm:text-base transition-all hover:scale-105"
                  >
                    <ExternalLink size={16} className="sm:w-[18px] sm:h-[18px]" />
                    {getActionButtonText(selectedNotification.type)}
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedNotification(null)
                    if (newNotification?.id === selectedNotification.id) {
                      clearNewNotification()
                    }
                  }}
                  className="px-6 py-2.5 sm:py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold text-sm sm:text-base transition-all"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}