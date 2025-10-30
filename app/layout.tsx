import { Inter } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { initializeEventHandlers } from '@/lib/events/handlers'
import RoleSwitcher from '@/components/RoleSwitcher'

const inter = Inter({ subsets: ['latin'] })

// Initialize event handlers (server-side only)
if (typeof window === 'undefined') {
  initializeEventHandlers()
}

export const metadata = {
  title: 'Bargain - Food Orders CRM',
  description: 'Sistema de gestión de pedidos de comida',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: 'any' },
      { url: '/logo.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.png',
  },
  manifest: '/site.webmanifest',
  themeColor: '#7c3aed',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bargain',
  },
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
          {children}
          <RoleSwitcher />
        </body>
      </html>
    </ClerkProvider>
  )
}