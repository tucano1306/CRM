import { Inter } from 'next/font/google'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { initializeEventHandlers } from '@/lib/events/handlers'

const inter = Inter({ subsets: ['latin'] })

// Initialize event handlers (server-side only)
if (typeof window === 'undefined') {
  initializeEventHandlers()
}

export const metadata = {
  title: 'Food Orders CRM',
  description: 'Sistema de gestión de pedidos de comida',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
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
        </body>
      </html>
    </ClerkProvider>
  )
}