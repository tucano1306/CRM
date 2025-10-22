'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

// Spinner con delay - Solo aparece si tarda más de 500ms
export function DelayedSpinner({ delay = 500 }: { delay?: number }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!show) return null

  return (
    <div className="flex items-center justify-center">
      <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
    </div>
  )
}

// Progress bar con porcentaje
export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  )
}

// Spinner inline para botones
export function ButtonSpinner() {
  return (
    <Loader2 className="animate-spin h-4 w-4" />
  )
}

// Loading overlay con mensaje
export function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl">
        <Loader2 className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4" />
        {message && (
          <p className="text-gray-700 text-center">{message}</p>
        )}
      </div>
    </div>
  )
}

// Loading dots animados
export function LoadingDots() {
  return (
    <div className="flex space-x-2">
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

// Hook para mostrar loading automático después de delay
export function useDelayedLoading(isLoading: boolean, delay = 500) {
  const [showLoading, setShowLoading] = useState(false)

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => setShowLoading(true), delay)
      return () => clearTimeout(timer)
    } else {
      setShowLoading(false)
    }
  }, [isLoading, delay])

  return showLoading
}

// Componente de acción con loading automático
interface ActionButtonProps {
  onClick: () => Promise<void>
  children: React.ReactNode
  className?: string
  loadingText?: string
}

export function ActionButton({ 
  onClick, 
  children, 
  className = '',
  loadingText = 'Cargando...'
}: ActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await onClick()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`${className} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
    >
      {isLoading ? (
        <>
          <ButtonSpinner />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Ejemplo de uso:
/*
// 1. Con delay automático:
function MyComponent() {
  const [loading, setLoading] = useState(true)
  const showSpinner = useDelayedLoading(loading, 500)

  return showSpinner ? <Loader /> : <Content />
}

// 2. Botón con loading:
<ActionButton 
  onClick={async () => await createOrder()}
  className="bg-blue-600 text-white px-4 py-2 rounded"
  loadingText="Creando..."
>
  Crear Orden
</ActionButton>

// 3. Progress bar:
<ProgressBar progress={uploadProgress} />
*/
