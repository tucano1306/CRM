/**
 * Background Task Queue
 * 
 * Handles async operations that don't need to block API responses.
 * Uses Promise.allSettled to execute multiple tasks in parallel without blocking.
 */

import logger, { LogCategory } from './logger'

type BackgroundTask = () => Promise<void>

/**
 * Execute tasks in the background without blocking the response.
 * Logs errors but doesn't throw.
 */
export async function executeInBackground(
  tasks: BackgroundTask[],
  context: string
): Promise<void> {
  // Fire and forget - don't await
  Promise.allSettled(tasks.map(task => task())).then(results => {
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(
          LogCategory.SYSTEM,
          `Background task ${index + 1}/${tasks.length} failed in ${context}`,
          result.reason
        )
      }
    })
  }).catch(err => {
    logger.error(LogCategory.SYSTEM, `Background task executor failed in ${context}`, err)
  })
}

/**
 * Execute tasks in parallel and wait for all to complete.
 * Returns results with errors for failed tasks.
 */
export async function executeInParallel<T>(
  tasks: (() => Promise<T>)[],
  context: string
): Promise<Array<{ success: boolean; data?: T; error?: unknown }>> {
  const results = await Promise.allSettled(tasks.map(task => task()))
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return { success: true, data: result.value }
    } else {
      logger.warn(
        LogCategory.SYSTEM,
        `Parallel task ${index + 1}/${tasks.length} failed in ${context}`,
        result.reason
      )
      return { success: false, error: result.reason }
    }
  })
}
