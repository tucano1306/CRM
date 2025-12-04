import { Inter } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { initializeEventHandlers } from '@/lib/events/handlers'
import PendingRedirectHandler from '@/components/PendingRedirectHandler'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { QueryProvider } from '@/components/providers/QueryProvider'
import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt'
import NotificationInitializer from '@/components/notifications/NotificationInitializer'

const inter = Inter({ subsets: ['latin'] })

// Initialize event handlers (server-side only)
if (typeof window === 'undefined') {
  initializeEventHandlers()
}

export const metadata = {
  title: 'Bargain - Food Orders CRM',
  description: 'Sistema de gestión de pedidos de comida',
  icons: {
    icon: [
      { url: '/favicon.png', sizes: 'any' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.png',
  },
  manifest: '/site.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bargain',
  },
}

// Next.js 15+: move viewport-related settings to the `viewport` export
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#7c3aed',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="es" suppressHydrationWarning>
        <body className={inter.className}>
          <QueryProvider>
            <PendingRedirectHandler />
            <NotificationInitializer />
            {children}
            <PWAInstallPrompt />
          </QueryProvider>
          <Analytics />
          <SpeedInsights />
        </body>
      </html>
    </ClerkProvider>
  )
}