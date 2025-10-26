// ARCHIVO OBSOLETO - Ya no se usa porque el proyecto usa Clerk para autenticación
// Este archivo usaba NextAuth SessionProvider que ha sido reemplazado por ClerkProvider en app/layout.tsx

/*
'use client'

import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  )
}
*/

// Para usar providers personalizados, importa desde:
// - @/components/providers/NotificationProvider para notificaciones
// - @clerk/nextjs para autenticación (ClerkProvider ya está en app/layout.tsx)

export function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
