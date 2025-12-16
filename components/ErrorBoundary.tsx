// components/ErrorBoundary.tsx
'use client'

import React, { Component, ErrorInfo, ReactNode, useState, useEffect } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error a servicio de monitoreo (ej: Sentry)
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      // Usar fallback personalizado si existe
      if (this.props.fallback) {
        return this.props.fallback
      }

      // UI por defecto
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <div className="flex items-center gap-3 mb-6">
              <AlertCircle className="h-12 w-12 text-red-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Algo salió mal
                </h1>
                <p className="text-gray-600 text-sm">
                  La aplicación encontró un error inesperado
                </p>
              </div>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
                <p className="text-sm font-mono text-red-800">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                Reintentar
              </button>
              <button
                onClick={() => globalThis.location.href = '/'}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center justify-center gap-2"
              >
                <Home size={16} />
                Inicio
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

// Hook para usar error boundary en componentes funcionales
export function useErrorHandler() {
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return setError
}

// Ejemplo de uso:
/*
// 1. Envolver toda la app:
<ErrorBoundary>
  <App />
</ErrorBoundary>

// 2. Envolver componentes específicos:
<ErrorBoundary fallback={<CustomErrorUI />}>
  <RiskyComponent />
</ErrorBoundary>

// 3. Envolver con logging:
<ErrorBoundary onError={(error) => logToSentry(error)}>
  <App />
</ErrorBoundary>

// 4. En componente funcional:
function MyComponent() {
  const throwError = useErrorHandler()
  
  const handleAction = async () => {
    try {
      await riskyOperation()
    } catch (err) {
      throwError(err)
    }
  }
}
*/
