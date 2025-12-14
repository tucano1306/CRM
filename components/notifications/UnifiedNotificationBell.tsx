'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, ExternalLink } from 'lucide-react'
import { NotificationType } from '@prisma/client'
import { useNotifications } from '@/components/providers/NotificationProvider'
import { useRouter } from 'next/navigation'
import { getRelativeTime } from '@/lib/utils'

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

interface NotificationBellProps {
  /** Role determines notification routes and styling */
  readonly role?: 'buyer' | 'seller'
  /** Custom class for the bell button */
  readonly className?: string
}

// Notification type icons
const TYPE_ICONS: Record<string, string> = {
  'NEW_ORDER': '📦',
  'ORDER_MODIFIED': '📝',
  'ORDER_CONFIRMED': '✅',
  'ORDER_COMPLETED': '✅',
  'ORDER_CANCELLED': '❌',
  'CHAT_MESSAGE': '💬',
  'LOW_STOCK_ALERT': '⚠️',
  'RETURN_REQUEST': '🔄',
  'QUOTE_CREATED': '📋',
  'QUOTE_UPDATED': '📋',
  'QUOTE_SENT': '📋',
  'QUOTE_ACCEPTED': '✅',
  'QUOTE_REJECTED': '❌',
  'CREDIT_NOTE_ISSUED': '💰',
}

export default function UnifiedNotificationBell({ role = 'buyer', className = '' }: NotificationBellProps) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead, newNotification, clearNewNotification } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  // Draggable modal state (for seller)
  const [isDragging, setIsDragging] = useState(false)
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 })
  const dragStart = useRef({ x: 0, y: 0 })

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Auto-open modal for new notifications
  useEffect(() => {
    if (newNotification) {
      setSelectedNotification(newNotification)
      setIsOpen(true)
      const timer = setTimeout(() => {
        markAsRead(newNotification.id)
        clearNewNotification()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [newNotification, markAsRead, clearNewNotification])

  // Close dropdown when clicking outside
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

  // Draggable modal handlers (seller only)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (role !== 'seller' || window.innerWidth < 768) return
    setIsDragging(true)
    dragStart.current = { x: e.clientX - modalPosition.x, y: e.clientY - modalPosition.y }
  }, [role, modalPosition])

  useEffect(() => {
    if (!isDragging) return
    const handleMouseMove = (e: MouseEvent) => {
      setModalPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      })
    }
    const handleMouseUp = () => setIsDragging(false)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const getTypeIcon = (type: NotificationType) => TYPE_ICONS[type] || '🔔'

  // Route based on notification type and role
  const getNotificationRoute = useCallback((notification: Notification) => {
    const baseRoutes = {
      buyer: {
        orders: '/buyer/orders',
        chat: '/chat',
        products: '/buyer/catalog',
      },
      seller: {
        orders: '/orders',
        chat: '/chat',
        products: '/products',
      }
    }

    const routes = baseRoutes[role]
    const orderId = notification.orderId

    switch (notification.type) {
      case 'CHAT_MESSAGE':
        return orderId ? `${routes.chat}?orderId=${orderId}` : routes.chat
      case 'LOW_STOCK_ALERT':
        return routes.products
      case 'NEW_ORDER':
      case 'ORDER_MODIFIED':
      case 'ORDER_CONFIRMED':
      case 'ORDER_COMPLETED':
      case 'ORDER_CANCELLED':
      default:
        return orderId ? `${routes.orders}?orderId=${orderId}` : routes.orders
    }
  }, [role])

  // Action button text based on notification type
  const getActionButtonText = (type: NotificationType) => {
    switch (type) {
      case 'CHAT_MESSAGE': return 'Ver Chat'
      case 'LOW_STOCK_ALERT': return 'Ver Productos'
      default: return 'Ver Orden'
    }
  }

  const closeModal = () => {
    setSelectedNotification(null)
    if (newNotification?.id === selectedNotification?.id) {
      clearNewNotification()
    }
    setModalPosition({ x: 0, y: 0 })
  }

  const handleNavigate = () => {
    if (!selectedNotification) return
    router.push(getNotificationRoute(selectedNotification))
    closeModal()
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
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

      {/* Dropdown Panel */}
      {mounted && isOpen && createPortal(
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-transparent z-[9998]"
            onClick={() => setIsOpen(false)}
          />

          {/* Notifications Panel */}
          <div 
            ref={dropdownRef}
            className={`fixed bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 z-[9999] max-h-[calc(100vh-6rem)] overflow-hidden flex flex-col ${
              role === 'seller' 
                ? 'top-16 left-0 right-0 sm:left-auto sm:right-4 w-full sm:w-96 max-w-full sm:max-w-md rounded-none sm:rounded-lg border-t sm:border'
                : 'top-20 right-6 w-96 rounded-lg'
            }`}
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

            {/* Notification List */}
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
        </>,
        document.body
      )}

      {/* Detail Modal */}
      {mounted && selectedNotification && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-[9999] animate-in fade-in duration-300 flex items-center justify-center p-4 sm:p-6"
          onClick={closeModal}
        >
          <div 
            ref={modalRef}
            style={role === 'seller' && window.innerWidth >= 768 && modalPosition.x 
              ? { position: 'fixed', left: modalPosition.x, top: modalPosition.y }
              : {}
            }
            className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-2xl w-full sm:w-[90vw] sm:max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right-4 duration-500 ring-0 sm:ring-4 sm:ring-blue-500/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* New Badge */}
            {newNotification?.id === selectedNotification.id && (
              <div className="absolute top-2 right-2 sm:-top-3 sm:-right-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-bounce z-20">
                ¡NUEVA!
              </div>
            )}
            
            {/* Header */}
            <div 
              onMouseDown={handleMouseDown}
              className={`flex items-start justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700 select-none bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 ${
                role === 'seller' && !isDragging ? 'sm:cursor-grab cursor-default' : isDragging ? 'cursor-grabbing' : ''
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="text-3xl sm:text-4xl animate-bounce flex-shrink-0">{getTypeIcon(selectedNotification.type)}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white break-words leading-tight">
                    {selectedNotification.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {getRelativeTime(selectedNotification.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 z-10 flex-shrink-0 ml-3 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={22} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-white dark:bg-gray-800">
              <p className="text-gray-700 dark:text-gray-300 text-base sm:text-lg leading-relaxed break-words">
                {selectedNotification.message}
              </p>
            </div>

            {/* Actions */}
            <div className="p-4 sm:p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-col gap-3">
              {selectedNotification.orderId && (
                <button
                  onClick={handleNavigate}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-base transition-all hover:scale-105 shadow-lg"
                >
                  <ExternalLink size={18} />
                  {getActionButtonText(selectedNotification.type)}
                </button>
              )}
              <button
                onClick={closeModal}
                className="px-5 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 font-semibold text-base transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
