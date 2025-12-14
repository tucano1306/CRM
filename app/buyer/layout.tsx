'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import { Home, Package, ShoppingCart, Menu, X, Store, RefreshCw, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import UnifiedNotificationBell from '@/components/notifications/UnifiedNotificationBell'
import { NotificationProvider } from '@/components/providers/NotificationProvider'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'
import { useCartCount } from '@/hooks/useCartCount'
import ThemeToggle from '@/components/shared/ThemeToggle'

interface BuyerLayoutProps {
  readonly children: React.ReactNode
}

export default function BuyerLayout({ children }: BuyerLayoutProps) {
  const { user } = useUser()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { unreadCount } = useUnreadMessages()
  const { cartCount } = useCartCount()

  const navigation = [
    { name: 'Inicio', href: '/buyer/dashboard', icon: Home },
    { name: 'Catálogo', href: '/buyer/catalog', icon: Store },
    { name: 'Carrito', href: '/buyer/cart', icon: ShoppingCart },
    { name: 'Órdenes', href: '/buyer/orders', icon: Package },
    { name: 'Órdenes Recurrentes', href: '/buyer/recurring-orders', icon: RefreshCw },
    { name: 'Chat con Vendedor', href: '/buyer/chat', icon: MessageCircle },
  ]

  return (
    <NotificationProvider>
      <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Enter' && setSidebarOpen(false)}
          role="button"
          tabIndex={0}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-purple-600 to-indigo-600 shadow-2xl transition-transform lg:translate-x-0 lg:static flex flex-col`}>
        {/* Header with logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-purple-500/30">
          <Image 
            src="/logo.png" 
            alt="Bargain Logo" 
            width={100} 
            height={32}
            style={{ height: 'auto' }}
            className="object-contain"
            priority
          />
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white hover:bg-white/20 p-2 rounded-lg transition">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isChatItem = item.href === '/buyer/chat'
            const isCartItem = item.href === '/buyer/cart'
            const showChatBadge = isChatItem && unreadCount > 0
            const showCartBadge = isCartItem && cartCount > 0
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition relative ${
                  isActive 
                    ? 'bg-white text-purple-700 shadow-lg' 
                    : 'text-white/90 hover:bg-white/20 hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {(showChatBadge || showCartBadge) && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-md">
                      {showChatBadge 
                        ? (unreadCount > 9 ? '9+' : unreadCount) 
                        : (cartCount > 9 ? '9+' : cartCount)
                      }
                    </span>
                  )}
                </div>
                <span className="flex-1">{item.name}</span>
                {showChatBadge && (
                  <span className="h-5 min-w-[20px] px-1.5 bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {showCartBadge && (
                  <span className="h-5 min-w-[20px] px-1.5 bg-gradient-to-r from-rose-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer with notifications, theme and user */}
        <div className="border-t border-purple-500/30">
          {/* Notifications & Theme row */}
          <div className="flex items-center justify-between px-4 py-3 bg-purple-700/30">
            <div className="flex items-center gap-2">
              <UnifiedNotificationBell role="buyer" />
              <ThemeToggle />
            </div>
            <span className="text-xs text-purple-200">Ajustes</span>
          </div>
          {/* User profile row */}
          <div className="flex items-center gap-3 px-4 py-3 bg-purple-700/50">
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9 ring-2 ring-white/30"
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.firstName || 'Usuario'}</p>
              <p className="text-xs text-purple-200 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 lg:hidden shadow-sm">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
          >
            <Menu className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
          
          <Image 
            src="/logo.png" 
            alt="Bargain Logo" 
            width={80} 
            height={26}
            className="object-contain"
            priority
          />
          
          <div className="flex items-center gap-2">
            <UnifiedNotificationBell role="buyer" />
            <UserButton 
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8"
                }
              }}
            />
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
    </NotificationProvider>
  )
}