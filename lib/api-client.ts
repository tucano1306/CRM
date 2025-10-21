'use client'

import { useState } from 'react'

/**
 * Frontend API Client con timeout, retry y manejo de errores
 */

export class FetchTimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}

export class FetchRetryError extends Error {
  constructor(message: string = 'All retry attempts failed') {
    super(message)
    this.name = 'FetchRetryError'
  }
}

interface FetchWithTimeoutOptions extends RequestInit {
  timeout?: number // milisegundos
  retries?: number // número de reintentos
  retryDelay?: number // delay entre reintentos en ms
  onTimeout?: () => void
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Fetch con timeout usando AbortController
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const {
    timeout = 5000,
    retries = 0,
    retryDelay = 1000,
    onTimeout,
    onRetry,
    ...fetchOptions
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
    if (onTimeout) onTimeout()
  }, timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)

    // Si fue abort por timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchTimeoutError(`Request to ${url} timed out after ${timeout}ms`)
    }

    // Si hay reintentos disponibles
    if (retries > 0) {
      if (onRetry) onRetry(retries, error as Error)
      
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
      
      return fetchWithTimeout(url, {
        ...options,
        retries: retries - 1,
      })
    }

    throw error
  }
}

/**
 * Wrapper para llamadas API con manejo completo de errores
 */
export async function apiCall<T = any>(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<{
  success: boolean
  data?: T
  error?: string
  status: number
}> {
  try {
    const response = await fetchWithTimeout(url, options)

    // Parsear respuesta JSON
    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP ${response.status}`,
        status: response.status,
      }
    }

    return {
      success: true,
      data,
      status: response.status,
    }
  } catch (error) {
    if (error instanceof FetchTimeoutError) {
      return {
        success: false,
        error: 'La solicitud tardó demasiado. Por favor, intenta de nuevo.',
        status: 504,
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      status: 500,
    }
  }
}

/**
 * Hook personalizado para manejar estados de carga y timeout
 */
export function useApiCall() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const execute = async <T,>(
    url: string,
    options: FetchWithTimeoutOptions = {}
  ) => {
    setLoading(true)
    setError(null)
    setTimedOut(false)

    const result = await apiCall<T>(url, {
      ...options,
      onTimeout: () => {
        setTimedOut(true)
      },
    })

    setLoading(false)

    if (!result.success) {
      setError(result.error || 'Error en la solicitud')
    }

    return result
  }

  return { loading, error, timedOut, execute }
}

/**
 * Utilidad para crear mensaje de error amigable
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof FetchTimeoutError) {
    return '⏱️ La operación está tardando más de lo esperado. Por favor, intenta de nuevo.'
  }

  if (error instanceof FetchRetryError) {
    return '🔄 No se pudo completar la operación después de varios intentos.'
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Ocurrió un error inesperado'
}
