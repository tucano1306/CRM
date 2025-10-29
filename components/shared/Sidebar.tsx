'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { 
  Home, 
  Package, 
  Users, 
  ShoppingCart, 
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
  MessageCircle,
  RefreshCw,
  FileText,
  RotateCcw,
  DollarSign
} from 'lucide-react'
import { useState, useEffect } from 'react'
import ThemeToggle from './ThemeToggle'
import NotificationBellSeller from '../notifications/NotificationBellSeller'
import { NotificationProvider } from '../providers/NotificationProvider'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'

const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home
  },
  {
    title: 'Productos',
    href: '/products',
    icon: Package
  },
  {
    title: 'Clientes',
    href: '/clients',
    icon: Users
  },
  {
    title: 'Órdenes',
    href: '/orders',
    icon: ShoppingCart
  },
  {
    title: 'Cotizaciones',
    href: '/quotes',
    icon: FileText
  },
  {
    title: 'Órdenes Recurrentes',
    href: '/recurring-orders',
    icon: RefreshCw
  },
  {
    title: 'Devoluciones',
    href: '/returns',
    icon: RotateCcw
  },
  {
    title: 'Chat',
    href: '/chat',
    icon: MessageCircle
  },
  {
    title: 'Estadísticas',
    href: '/stats',
    icon: BarChart3
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { unreadCount } = useUnreadMessages()

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(true)
        setIsMobileOpen(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <NotificationProvider>
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-xl border-0 hover:from-blue-700 hover:to-purple-700 transition-all hover:scale-105"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className={`
        hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-full 
        bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 
        shadow-lg transition-all duration-300 ease-in-out z-40
        ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}
      `}>
        {/* Desktop Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 min-w-full">
          {!isCollapsed ? (
            <div className="flex items-center space-x-3">
              <Image 
                src="/logo.png" 
                alt="Bargain Logo" 
                width={120} 
                height={40}
                className="object-contain"
                priority
              />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Image 
                src="/logo.png" 
                alt="Bargain Logo" 
                width={40} 
                height={40}
                className="object-contain"
                priority
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            {!isCollapsed && <NotificationBellSeller />}
            {!isCollapsed && <ThemeToggle />}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all hover:scale-110 shadow-lg border-0"
              title={isCollapsed ? "Expandir menú" : "Contraer menú"}
            >
              {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isChatItem = item.href === '/chat'
            const showBadge = isChatItem && unreadCount > 0
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center px-4 py-3 rounded-lg transition-all duration-200 font-medium relative
                  ${isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center' : 'space-x-3'}
                `}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {showBadge && isCollapsed && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                {!isCollapsed && (
                  <div className="flex items-center justify-between flex-1">
                    <span>{item.title}</span>
                    {showBadge && (
                      <span className="ml-auto h-5 min-w-[20px] px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Desktop Footer */}
        {!isCollapsed && (
          <div className="p-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sistema</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">v1.0.0 - Food Orders CRM</p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sidebar */}
      <div className={`
        lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 
        border-r border-gray-200 dark:border-gray-700 shadow-xl
        transform transition-transform duration-300 ease-in-out
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Image 
              src="/logo.png" 
              alt="Bargain Logo" 
              width={120} 
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <div className="flex items-center gap-2">
            <NotificationBellSeller />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileOpen(false)}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isChatItem = item.href === '/chat'
            const showBadge = isChatItem && unreadCount > 0
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={`
                  flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium relative
                  ${isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between flex-1">
                  <span>{item.title}</span>
                  {showBadge && (
                    <span className="ml-auto h-5 min-w-[20px] px-1.5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
    </NotificationProvider>
  )
}