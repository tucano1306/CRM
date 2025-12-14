'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ReactNode, useState } from 'react'

interface QueryProviderProps {
  readonly children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tiempo de cache: 5 minutos
            staleTime: 5 * 60 * 1000,
            // Mantener cache: 10 minutos
            gcTime: 10 * 60 * 1000,
            // Retry automático en caso de error
            retry: 1,
            // Refetch cuando la ventana vuelve a tener foco
            refetchOnWindowFocus: false,
            // Refetch cuando se reconecta
            refetchOnReconnect: true,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools solo en desarrollo */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
