/**
 * 🎯 Background Job Processing System
 * Sistema de colas de trabajo para tareas asíncronas
 */

import { EventEmitter } from 'node:events'
import { workerPoolManager } from './worker-pool'

export interface JobData {
  id: string
  type: JobType
  data: any
  priority: number
  status: JobStatus
  progress: number
  result?: any
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  retryCount: number
  maxRetries: number
}

export type JobType = 'pdf-generation' | 'email-send' | 'data-export' | 'image-processing' | 'report-generation'

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'

export interface JobOptions {
  priority?: number
  maxRetries?: number
  timeout?: number
  delay?: number
}

class JobQueue extends EventEmitter {
  private readonly jobs = new Map<string, JobData>()
  private processing = false
  private readonly maxConcurrentJobs = 5
  private currentJobs = 0
  private readonly initialized = false

  constructor() {
    super()
    // Schedule processing to start asynchronously after construction
    setImmediate(() => this.startProcessing())
  }

  /**
   * Agregar nuevo trabajo a la cola
   */
  public async addJob(
    type: JobType,
    data: any,
    options: JobOptions = {}
  ): Promise<string> {
    const jobId = this.generateJobId()
    
    const job: JobData = {
      id: jobId,
      type,
      data,
      priority: options.priority || 0,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: options.maxRetries || 3
    }

    // Aplicar delay si se especifica
    if (options.delay && options.delay > 0) {
      setTimeout(() => {
        this.jobs.set(jobId, job)
        this.emit('jobAdded', job)
      }, options.delay)
    } else {
      this.jobs.set(jobId, job)
      this.emit('jobAdded', job)
    }

    console.log(`📋 Job added: ${jobId} (${type})`)
    return jobId
  }

  /**
   * Obtener estado del trabajo
   */
  public getJob(jobId: string): JobData | undefined {
    return this.jobs.get(jobId)
  }

  /**
   * Obtener todos los trabajos con filtros
   */
  public getJobs(filters: {
    status?: JobStatus
    type?: JobType
    limit?: number
  } = {}): JobData[] {
    let jobs = Array.from(this.jobs.values())

    if (filters.status) {
      jobs = jobs.filter(job => job.status === filters.status)
    }

    if (filters.type) {
      jobs = jobs.filter(job => job.type === filters.type)
    }

    // Ordenar por prioridad y fecha
    jobs.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority
      }
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    if (filters.limit) {
      jobs = jobs.slice(0, filters.limit)
    }

    return jobs
  }

  /**
   * Cancelar trabajo
   */
  public cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId)
    if (!job) return false

    if (job.status === 'pending') {
      job.status = 'failed'
      job.error = 'Job cancelled by user'
      job.completedAt = new Date()
      this.emit('jobCancelled', job)
      return true
    }

    return false
  }

  /**
   * Procesar cola de trabajos
   */
  private async startProcessing() {
    this.processing = true

    const processNext = async () => {
      if (this.currentJobs >= this.maxConcurrentJobs) {
        setTimeout(processNext, 1000)
        return
      }

      const pendingJobs = this.getJobs({ status: 'pending', limit: 1 })
      if (pendingJobs.length === 0) {
        setTimeout(processNext, 1000)
        return
      }

      const job = pendingJobs[0]
      await this.processJob(job)
      
      // Continue processing
      setImmediate(processNext)
    }

    processNext()
  }

  /**
   * Procesar trabajo individual
   */
  private async processJob(job: JobData) {
    this.currentJobs++
    job.status = 'processing'
    job.startedAt = new Date()
    
    console.log(`⚡ Processing job ${job.id} (${job.type})`)
    this.emit('jobStarted', job)

    try {
      // Obtener worker pool apropiado
      const workerScript = this.getWorkerScript(job.type)
      const pool = workerPoolManager.getPool(job.type, workerScript)

      // Ejecutar en worker thread
      const result = await pool.executeTask(job.type, job.data, {
        priority: job.priority,
        timeout: 30000
      })

      if (result.success) {
        job.status = 'completed'
        job.result = result.data
        job.progress = 100
        job.completedAt = new Date()
        console.log(`✅ Job completed: ${job.id}`)
        this.emit('jobCompleted', job)
      } else {
        throw new Error(result.error || 'Worker execution failed')
      }

    } catch (error) {
      console.error(`❌ Job failed: ${job.id}`, error)
      await this.handleJobFailure(job, error as Error)
    } finally {
      this.currentJobs--
    }
  }

  /**
   * Manejar fallos de trabajo
   */
  private async handleJobFailure(job: JobData, error: Error) {
    job.error = error.message

    if (job.retryCount < job.maxRetries) {
      job.retryCount++
      job.status = 'retrying'
      
      // Exponential backoff
      const delay = Math.pow(2, job.retryCount) * 1000
      console.log(`🔄 Retrying job ${job.id} in ${delay}ms (attempt ${job.retryCount}/${job.maxRetries})`)
      
      setTimeout(() => {
        job.status = 'pending'
        this.emit('jobRetry', job)
      }, delay)
    } else {
      job.status = 'failed'
      job.completedAt = new Date()
      this.emit('jobFailed', job)
    }
  }

  /**
   * Obtener script del worker apropiado
   */
  private getWorkerScript(type: JobType): string {
    const workerScripts = {
      'pdf-generation': 'lib/workers/pdf-worker.js',
      'email-send': 'lib/workers/email-worker.js',
      'data-export': 'lib/workers/export-worker.js',
      'image-processing': 'lib/workers/image-worker.js',
      'report-generation': 'lib/workers/report-worker.js'
    }

    return workerScripts[type] || 'lib/workers/generic-worker.js'
  }

  /**
   * Generar ID único para trabajo
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Limpiar trabajos completados (older than 1 hour)
   */
  public cleanupOldJobs() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    let cleaned = 0

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        job.completedAt < oneHourAgo
      ) {
        this.jobs.delete(jobId)
        cleaned++
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} old jobs`)
    }
  }

  /**
   * Obtener estadísticas de la cola
   */
  public getStats() {
    const jobs = Array.from(this.jobs.values())
    
    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'pending').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      retrying: jobs.filter(j => j.status === 'retrying').length,
      currentJobs: this.currentJobs,
      maxConcurrentJobs: this.maxConcurrentJobs
    }
  }
}

// Singleton instance
export const jobQueue = new JobQueue()

// Auto cleanup every 30 minutes
setInterval(() => {
  jobQueue.cleanupOldJobs()
}, 30 * 60 * 1000)

// Job queue helper functions
export async function queuePDFGeneration(data: any, options?: JobOptions): Promise<string> {
  return jobQueue.addJob('pdf-generation', data, options)
}

export async function queueEmailSend(data: any, options?: JobOptions): Promise<string> {
  return jobQueue.addJob('email-send', data, options)
}

export async function queueDataExport(data: any, options?: JobOptions): Promise<string> {
  return jobQueue.addJob('data-export', data, options)
}

export async function queueImageProcessing(data: any, options?: JobOptions): Promise<string> {
  return jobQueue.addJob('image-processing', data, options)
}

export async function queueReportGeneration(data: any, options?: JobOptions): Promise<string> {
  return jobQueue.addJob('report-generation', data, options)
}