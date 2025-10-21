/**
 * API Timeout Utilities
 * Implementa timeouts de 5 segundos para todas las operaciones API
 */

export class TimeoutError extends Error {
  constructor(message: string = 'Request timed out') {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Envuelve una promesa con un timeout
 * @param promise - Promesa a ejecutar
 * @param ms - Tiempo máximo en milisegundos (default: 5000)
 * @returns La promesa original o rechaza con TimeoutError
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 5000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new TimeoutError()), ms)
    ),
  ])
}

/**
 * Wrapper para operaciones de Prisma con timeout
 * @param operation - Operación de Prisma a ejecutar
 * @param ms - Tiempo máximo en milisegundos (default: 5000)
 */
export async function withPrismaTimeout<T>(
  operation: () => Promise<T>,
  ms: number = 5000
): Promise<T> {
  const startTime = Date.now()
  
  try {
    const result = await withTimeout(operation(), ms)
    const duration = Date.now() - startTime
    
    // Log operaciones lentas (> 3 segundos)
    if (duration > 3000) {
      console.warn(`⚠️ Slow database operation: ${duration}ms`)
    }
    
    return result
  } catch (error) {
    if (error instanceof TimeoutError) {
      const duration = Date.now() - startTime
      console.error(`❌ Database operation timeout after ${duration}ms`)
      throw error
    }
    throw error
  }
}

/**
 * Maneja errores de timeout en rutas API
 * Retorna respuesta 504 Gateway Timeout
 */
export function handleTimeoutError(error: unknown): {
  error: string
  code: string
  status: number
} {
  if (error instanceof TimeoutError) {
    return {
      error: 'La operación tardó demasiado tiempo. Por favor, intenta de nuevo.',
      code: 'TIMEOUT_ERROR',
      status: 504,
    }
  }
  
  // Error genérico
  return {
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
    status: 500,
  }
}

/**
 * Middleware helper para aplicar timeout a handlers de API
 */
export function withApiTimeout<T>(
  handler: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<T> {
  return withTimeout(handler(), timeoutMs)
}
