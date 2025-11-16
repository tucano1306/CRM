/**
 * 🎯 React Hook para Trabajos en Segundo Plano
 * Hook personalizado para gestionar jobs de workers desde el frontend
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export interface Job {
  id: string
  type: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
  progress: number
  createdAt: string
  startedAt?: string
  completedAt?: string
  error?: string
  result?: any
}

export interface UseBackgroundJobOptions {
  pollInterval?: number
  autoCleanup?: boolean
  onComplete?: (job: Job) => void
  onError?: (job: Job) => void
}

export function useBackgroundJob(options: UseBackgroundJobOptions = {}) {
  const {
    pollInterval = 1000,
    autoCleanup = true,
    onComplete,
    onError
  } = options

  const [jobs, setJobs] = useState<Map<string, Job>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const intervalRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  /**
   * Crear nuevo trabajo
   */
  const createJob = useCallback(async (
    type: string,
    data: any,
    jobOptions: {
      priority?: number
      async?: boolean
      useWorker?: boolean
    } = {}
  ) => {
    setIsLoading(true)
    
    try {
      // Endpoint específico o genérico según el tipo
      const endpoint = type === 'pdf-generation' 
        ? `/api/orders/${data.orderId}/invoice`
        : '/api/jobs'

      const requestBody = type === 'pdf-generation'
        ? { async: true, priority: jobOptions.priority || 1, ...jobOptions }
        : { type, data, options: jobOptions }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create job')
      }

      const jobId = result.data.jobId
      
      // Agregar job a la lista
      const newJob: Job = {
        id: jobId,
        type,
        status: 'pending',
        progress: 0,
        createdAt: new Date().toISOString()
      }

      setJobs(prev => new Map(prev.set(jobId, newJob)))

      // Iniciar polling
      startPolling(jobId)

      return {
        jobId,
        pollUrl: result.data.pollUrl,
        downloadUrl: result.data.downloadUrl
      }

    } catch (error) {
      console.error('❌ Error creating job:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Iniciar polling para un trabajo
   */
  const startPolling = useCallback((jobId: string) => {
    // Limpiar polling existente
    const existingInterval = intervalRefs.current.get(jobId)
    if (existingInterval) {
      clearInterval(existingInterval)
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            // Job no encontrado, detener polling
            stopPolling(jobId)
            return
          }
          throw new Error(`HTTP ${response.status}`)
        }

        const result = await response.json()
        
        if (result.success && result.data) {
          const updatedJob: Job = {
            id: result.data.id,
            type: result.data.type,
            status: result.data.status,
            progress: result.data.progress,
            createdAt: result.data.createdAt,
            startedAt: result.data.startedAt,
            completedAt: result.data.completedAt,
            error: result.data.error,
            result: result.data.result
          }

          setJobs(prev => new Map(prev.set(jobId, updatedJob)))

          // Verificar si está completo o falló
          if (updatedJob.status === 'completed') {
            stopPolling(jobId)
            onComplete?.(updatedJob)
            
            if (autoCleanup) {
              setTimeout(() => {
                setJobs(prev => {
                  const newMap = new Map(prev)
                  newMap.delete(jobId)
                  return newMap
                })
              }, 5000) // Limpiar después de 5 segundos
            }
          } else if (updatedJob.status === 'failed') {
            stopPolling(jobId)
            onError?.(updatedJob)
          }
        }

      } catch (error) {
        console.error(`❌ Error polling job ${jobId}:`, error)
        // Continuar polling en caso de error temporal
      }
    }, pollInterval)

    intervalRefs.current.set(jobId, interval)
  }, [pollInterval, onComplete, onError, autoCleanup])

  /**
   * Detener polling para un trabajo
   */
  const stopPolling = useCallback((jobId: string) => {
    const interval = intervalRefs.current.get(jobId)
    if (interval) {
      clearInterval(interval)
      intervalRefs.current.delete(jobId)
    }
  }, [])

  /**
   * Cancelar trabajo
   */
  const cancelJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      stopPolling(jobId)
      
      // Actualizar estado local
      setJobs(prev => {
        const newMap = new Map(prev)
        const job = newMap.get(jobId)
        if (job) {
          newMap.set(jobId, { ...job, status: 'failed', error: 'Cancelled by user' })
        }
        return newMap
      })

      return true
    } catch (error) {
      console.error(`❌ Error cancelling job ${jobId}:`, error)
      return false
    }
  }, [stopPolling])

  /**
   * Descargar resultado de trabajo
   */
  const downloadJobResult = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}/download`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // Obtener filename del header
      const contentDisposition = response.headers.get('Content-Disposition')
      const filename = contentDisposition
        ?.split('filename=')[1]
        ?.replace(/"/g, '') || `job-${jobId}-result`

      // Crear blob y descargar
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(url)

    } catch (error) {
      console.error(`❌ Error downloading job result ${jobId}:`, error)
      throw error
    }
  }, [])

  /**
   * Limpiar todos los intervals al desmontar
   */
  useEffect(() => {
    return () => {
      intervalRefs.current.forEach(interval => clearInterval(interval))
      intervalRefs.current.clear()
    }
  }, [])

  return {
    jobs: Array.from(jobs.values()),
    isLoading,
    createJob,
    cancelJob,
    downloadJobResult,
    getJob: (jobId: string) => jobs.get(jobId)
  }
}

/**
 * 📄 Hook específico para generación de PDFs
 */
export function usePDFGeneration() {
  const backgroundJob = useBackgroundJob({
    onComplete: (job) => {
      console.log('✅ PDF generation completed:', job.id)
    },
    onError: (job) => {
      console.error('❌ PDF generation failed:', job.id, job.error)
    }
  })

  const generatePDF = useCallback(async (orderId: string, options = {}) => {
    return backgroundJob.createJob('pdf-generation', { orderId }, {
      priority: 2, // Alta prioridad para PDFs
      ...options
    })
  }, [backgroundJob])

  return {
    ...backgroundJob,
    generatePDF
  }
}