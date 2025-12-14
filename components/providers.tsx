// Para usar providers personalizados, importa desde:
// - @/components/providers/NotificationProvider para notificaciones
// - @clerk/nextjs para autenticación (ClerkProvider ya está en app/layout.tsx)

interface ProvidersProps {
  readonly children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return <>{children}</>
}
