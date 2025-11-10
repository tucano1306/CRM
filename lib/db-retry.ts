import { Prisma } from '@prisma/client'
import logger, { LogCategory } from './logger'

// Error classifiers
export function isPrismaInitError(err: unknown): boolean {
  const message = (err as Error)?.message || ''
  // Common init/connection errors: P1000, P1001, P1003, TLS/handshake
  return /P100[0-3]|getaddrinfo|ENOTFOUND|ECONNREFUSED|the database server was not reached/i.test(message)
}

export function isTransientPrismaError(err: unknown): boolean {
  const message = (err as Error)?.message || ''
  // Retry-worthy transient errors: query cancel/timeouts, connection closed, read ECONNRESET
  return /P1008|P1017|read ECONNRESET|ETIMEDOUT|Connection terminated unexpectedly|canceling statement due to user request/i.test(message)
}

export type RetryOptions = {
  retries?: number
  initialDelayMs?: number
  backoffFactor?: number
}

export async function withDbRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const retries = opts.retries ?? 2
  const backoff = opts.backoffFactor ?? 2
  let delay = opts.initialDelayMs ?? 150

  let attempt = 0
  while (true) {
    try {
      const result = await fn()
      if (attempt > 0) {
        logger.debug(LogCategory.DATABASE, 'DB operation succeeded after retries', {
          attempts: attempt + 1
        })
      }
      return result
    } catch (err) {
      attempt++
      const transient = isTransientPrismaError(err) || isPrismaInitError(err)
      if (!transient) {
        // No es recuperable
        logger.error(LogCategory.DATABASE, 'Non-retryable DB error', err, undefined, {
          attempt,
          retries
        })
        throw err
      }
      if (attempt > retries) {
        logger.error(LogCategory.DATABASE, 'Max DB retry attempts exceeded', err, undefined, {
          attempts: attempt,
          retries,
          finalDelay: delay
        })
        throw err
      }

      logger.warn(LogCategory.DATABASE, 'Transient DB error, scheduling retry', {
        attempt,
        retries,
        nextDelayMs: delay,
        error: (err as Error)?.message?.slice(0, 180)
      })

      await new Promise((res) => setTimeout(res, delay))
      delay = Math.min(1000, delay * backoff)
    }
  }
}

// Helper que combina timeout + retry si se quiere en una sola llamada (composable)
export async function withResilientDb<T>(
  op: () => Promise<T>,
  opts: RetryOptions & { timeoutMs?: number } = {}
): Promise<T> {
  // Para evitar dependencia circular, import dinámico del timeout
  const { withPrismaTimeout } = await import('./timeout')
  const timeoutMs = opts.timeoutMs ?? 5000
  return withDbRetry(() => withPrismaTimeout(op, timeoutMs), opts)
}
