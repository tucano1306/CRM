'use client'

import { useState, useEffect, useRef } from 'react'
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

export default function NotificationBellSeller() {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, newNotification, clearNewNotification } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const router = useRouter()

  // Estado para drag & drop del modal
  const [isDragging, setIsDragging] = useState(false)
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const modalRef = useRef<HTMLDivElement>(null)

  // 🆕 Detectar nueva notificación y abrir modal automáticamente
  useEffect(() => {
    if (newNotification) {
      console.log('🔔 [AUTO MODAL SELLER] Nueva notificación recibida, abriendo modal...', newNotification)
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

  // Manejadores de drag & drop para el modal
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    console.log('🖱️ MouseDown detected')
    if (modalRef.current) {
      const target = e.target as HTMLElement
      console.log('🖱️ Target:', target.tagName, target.className)
      // Solo permitir arrastrar si no es un botón
      if (target.tagName !== 'BUTTON' && !target.closest('button')) {
        console.log('✅ Starting drag')
        setIsDragging(true)
        const rect = modalRef.current.getBoundingClientRect()
        setDragOffset({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        })
      } else {
        console.log('❌ Click on button, not dragging')
      }
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && modalRef.current) {
        console.log('🖱️ Moving:', e.clientX, e.clientY)
        const newX = e.clientX - dragOffset.x
        const newY = e.clientY - dragOffset.y
        
        // Limitar el movimiento dentro de la ventana
        const maxX = window.innerWidth - modalRef.current.offsetWidth
        const maxY = window.innerHeight - modalRef.current.offsetHeight
        
        setModalPosition({
          x: Math.max(0, Math.min(newX, maxX)),
          y: Math.max(0, Math.min(newY, maxY))
        })
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        console.log('🖱️ Mouse up - stopping drag')
      }
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, dragOffset])

  // Resetear posición cuando se abre un nuevo modal
  useEffect(() => {
    if (selectedNotification) {
      setModalPosition({ x: 0, y: 0 })
    }
  }, [selectedNotification])

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
        onClick={() => setIsOpen(!isOpen)}
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

      {/* Dropdown Panel - Vendedor (responsive - pantalla completa en móvil) */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="fixed top-16 left-0 right-0 sm:left-auto sm:right-4 w-full sm:w-96 max-w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-none sm:rounded-lg shadow-2xl border-t sm:border border-gray-200 dark:border-gray-700 z-[9999] max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="font-bold text-base text-gray-900 dark:text-white">Notificaciones</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold"
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
                {notifications.map((notification) => (
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
                      <span className="text-2xl flex-shrink-0">{getTypeIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium text-gray-900 dark:text-white ${!notification.isRead ? 'font-bold' : ''}`}>
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
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
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal de detalles - Vendedor (con margen arriba y abajo en móvil) */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-[9999] animate-in fade-in duration-300 flex items-center justify-center p-4 sm:p-6">
          <div 
            ref={modalRef}
            style={{
              position: window.innerWidth >= 768 && modalPosition.x ? 'fixed' : 'relative',
              left: window.innerWidth >= 768 && modalPosition.x ? modalPosition.x : 'auto',
              top: window.innerWidth >= 768 && modalPosition.x ? modalPosition.y : 'auto'
            }}
            className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-2xl w-full sm:w-[90vw] sm:max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right-4 duration-500 ring-0 sm:ring-4 sm:ring-blue-500/50"
          >
            {/* Badge de "Nueva" si es una notificación nueva */}
            {newNotification?.id === selectedNotification.id && (
              <div className="absolute top-2 right-2 sm:-top-3 sm:-right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce z-20">
                ¡NUEVA!
              </div>
            )}
            
            <div 
              onMouseDown={handleMouseDown}
              className={`flex items-start justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 select-none bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${isDragging ? 'cursor-grabbing' : 'sm:cursor-grab cursor-default'}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-3xl sm:text-4xl animate-bounce flex-shrink-0">{getTypeIcon(selectedNotification.type)}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words leading-tight">{selectedNotification.title}</h2>
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
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10 flex-shrink-0 ml-3 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-white dark:bg-gray-800">
              <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed break-words">{selectedNotification.message}</p>
              {selectedNotification.orderId && (
                <div className="mt-5 p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-semibold mb-2 text-sm sm:text-base">
                    <Package size={18} />
                    <span>Orden relacionada</span>
                  </div>
                  <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-400 font-mono break-all bg-white dark:bg-blue-950/30 p-2 rounded">ID: {selectedNotification.orderId}</p>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col gap-3">
              {selectedNotification.orderId && (
                <button
                  onClick={() => {
                    router.push(getNotificationRoute(selectedNotification))
                    setSelectedNotification(null)
                    if (newNotification?.id === selectedNotification.id) {
                      clearNewNotification()
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-base transition-all hover:scale-105 shadow-lg"
                >
                  <ExternalLink size={18} />
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
                className="px-5 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold text-base transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
