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
  X,
  MessageCircle,
  RefreshCw,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import ThemeToggle from './ThemeToggle'
import UnifiedNotificationBell from '../notifications/UnifiedNotificationBell'
import { NotificationProvider } from '../providers/NotificationProvider'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'
import { UserButton } from '@clerk/nextjs'


const menuItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home
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
    title: 'Productos',
    href: '/products',
    icon: Package
  },
  {
    title: 'Órdenes Recurrentes',
    href: '/recurring-orders',
    icon: RefreshCw
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
          className="bg-gradient-to-r from-pastel-blue to-pastel-beige text-gray-700 shadow-xl border-0 hover:from-pastel-blue/90 hover:to-pastel-beige/90 transition-all hover:scale-105"
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </Button>
      </div>

      {/* Desktop Sidebar - Pastel Theme */}
      <div className={`
        hidden lg:flex lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:h-full 
        bg-gradient-to-b from-pastel-blue/80 via-pastel-cream to-pastel-beige/60 dark:bg-gray-900 border-r border-pastel-sand/30 dark:border-gray-700 
        shadow-lg backdrop-blur-xl transition-all duration-300 ease-in-out z-40
        ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}
      `}>
        {/* Desktop Header - Clean design */}
        <div className="flex flex-col border-b border-gray-200 dark:border-gray-700">
          {/* Logo row */}
          <div className="flex items-center justify-between h-14 px-3">
            {isCollapsed ? (
              <Image 
                src="/logo.png" 
                alt="Bargain Logo" 
                width={32} 
                height={32}
                className="object-contain mx-auto"
                priority
              />
            ) : (
              <Image 
                src="/logo.png" 
                alt="Bargain Logo" 
                width={100} 
                height={32}
                className="object-contain"
                priority
              />
            )}
            {!isCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Contraer menú"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Expand button when collapsed */}
          {isCollapsed && (
            <div className="flex justify-center py-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                title="Expandir menú"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </div>
          )}
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
                  flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-medium relative
                  ${isActive 
                    ? 'bg-white/80 dark:bg-blue-900/50 text-pastel-blue dark:text-blue-300 border border-pastel-blue/30 dark:border-blue-700 shadow-md' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
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

        {/* Desktop Footer - User Profile + Actions */}
        {!isCollapsed && (
          <div className="border-t border-pastel-sand/30 dark:border-gray-700">
            {/* Notifications & Theme row */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/40 dark:bg-gray-800/50">
              <div className="flex items-center gap-1">
                <UnifiedNotificationBell role="seller" />
                <ThemeToggle />
              </div>
              <span className="text-xs text-gray-400">Ajustes</span>
            </div>
            {/* User profile row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9",
                    userButtonPopoverCard: "shadow-lg"
                  }
                }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 truncate">Mi cuenta</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Collapsed Footer - Icons only */}
        {isCollapsed && (
          <div className="border-t border-gray-200 dark:border-gray-700 py-2 space-y-1">
            <div className="flex justify-center">
              <UnifiedNotificationBell role="seller" />
            </div>
            <div className="flex justify-center">
              <ThemeToggle />
            </div>
            <div className="flex justify-center pt-1">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8"
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Sidebar */}
      <div className={`
        lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-pastel-blue/90 via-pastel-cream to-pastel-beige/80 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 
        border-r border-pastel-blue/30 dark:border-gray-700 shadow-xl backdrop-blur-lg
        transform transition-transform duration-300 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Mobile Header - Clean */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-pastel-blue/30 dark:border-gray-700 bg-white/50">
          <Image 
            src="/logo.png" 
            alt="Bargain Logo" 
            width={100} 
            height={32}
            className="object-contain"
            priority
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(false)}
            className="h-8 w-8 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>
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
                    ? 'bg-white/80 dark:bg-blue-900/50 text-pastel-blue dark:text-blue-300 border border-pastel-blue/30 dark:border-blue-700 shadow-md' 
                    : 'text-gray-700 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
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
        
        {/* Mobile Footer - User + Actions */}
        <div className="border-t border-pastel-blue/30 dark:border-gray-700 mt-auto">
          {/* Actions row */}
          <div className="flex items-center justify-around px-4 py-3 bg-white/40 dark:bg-gray-800/50">
            <UnifiedNotificationBell role="seller" />
            <ThemeToggle />
          </div>
          {/* User profile row */}
          <div className="flex items-center gap-3 px-4 py-3">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9",
                  userButtonPopoverCard: "shadow-lg"
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">Mi cuenta</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <button 
          type="button"
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 border-0 cursor-default"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close sidebar"
        />
      )}
    </>
    </NotificationProvider>
  )
}
