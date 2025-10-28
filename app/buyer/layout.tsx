'use client'

import { useUser, UserButton } from '@clerk/nextjs'
import { Home, Package, ShoppingCart, User, Menu, X, Store, RefreshCw, RotateCcw, DollarSign, FileText, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import NotificationBell from '@/components/notifications/NotificationBell'
import { NotificationProvider } from '@/components/providers/NotificationProvider'

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navigation = [
    { name: 'Inicio', href: '/buyer/dashboard', icon: Home },
    { name: 'Catálogo', href: '/buyer/catalog', icon: Store },
    { name: 'Carrito', href: '/buyer/cart', icon: ShoppingCart },
    { name: 'Órdenes', href: '/buyer/orders', icon: Package },
    { name: 'Cotizaciones', href: '/buyer/quotes', icon: FileText },
    { name: 'Órdenes Recurrentes', href: '/buyer/recurring-orders', icon: RefreshCw },
    { name: 'Devoluciones', href: '/buyer/returns', icon: RotateCcw },
    { name: 'Mis Créditos', href: '/buyer/credit-notes', icon: DollarSign },
    { name: 'Chat con Vendedor', href: '/buyer/chat', icon: MessageCircle },
    { name: 'Perfil', href: '/buyer/profile', icon: User },
  ]

  return (
    <NotificationProvider>
      <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-800 to-blue-900 shadow-2xl transition-transform lg:translate-x-0 lg:static`}>
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between px-6 border-b border-slate-700">
            <div>
              <h1 className="text-2xl font-bold text-white">Food CRM</h1>
              <p className="text-xs text-slate-300">Comprador</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white">
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-2 px-3 py-6">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition ${
                    isActive ? 'bg-white text-slate-800 shadow-lg' : 'text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-slate-700 p-4 bg-slate-900">
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/sign-in" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user?.firstName}</p>
                <p className="text-xs text-slate-400">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
              <NotificationBell />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="font-bold">Food CRM</h1>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <UserButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
    </NotificationProvider>
  )
}