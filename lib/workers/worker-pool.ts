/**
 * 🚀 Worker Thread Pool Manager
 * Sistema de pool de workers para tareas CPU-intensivas
 * Integrado con monitoreo de rendimiento y detección de bloqueos
 */

import { Worker, isMainThread } from 'worker_threads'
import { EventEmitter } from 'events'
import path from 'path'
import os from 'os'
import { performanceProfiler, measureAsync } from '../monitoring/performance-profiler'

export interface WorkerTask {
  id: string
  type: string
  data: any
  priority?: number
  timeout?: number
}

export interface WorkerResult {
  success: boolean
  data?: any
  error?: string
  executionTime?: number
}

export interface WorkerPoolOptions {
  maxWorkers?: number
  workerTimeout?: number
  taskQueueLimit?: number
  enableProfiling?: boolean
  performanceThresholds?: {
    taskExecutionWarning?: number  // ms
    taskExecutionCritical?: number // ms
    queueWaitWarning?: number      // ms
  }
}

export interface WorkerPoolStats {
  totalWorkers: number
  busyWorkers: number
  queueSize: number
  pendingTasks: number
  totalTasksExecuted: number
  averageExecutionTime: number
  averageQueueTime: number
  performanceMetrics?: {
    eventLoopLag: number
    memoryUsage: number
    cpuUsage: number
  }
}

class WorkerInstance extends EventEmitter {
  public worker: Worker
  public busy: boolean = false
  public currentTask: WorkerTask | null = null
  private timeoutId: NodeJS.Timeout | null = null

  constructor(scriptPath: string) {
    super()
    this.worker = new Worker(scriptPath)
    this.setupWorkerListeners()
  }

  private setupWorkerListeners() {
    this.worker.on('message', (result: WorkerResult) => {
      this.clearTimeout()
      this.busy = false
      this.emit('taskComplete', this.currentTask?.id, result)
      this.currentTask = null
    })

    this.worker.on('error', (error) => {
      this.clearTimeout()
      this.busy = false
      this.emit('taskError', this.currentTask?.id, error)
      this.currentTask = null
    })

    this.worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ Worker exited with code ${code}`)
      }
    })
  }

  public executeTask(task: WorkerTask): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      if (this.busy) {
        reject(new Error('Worker is busy'))
        return
      }

      this.busy = true
      this.currentTask = task

      // Setup timeout
      if (task.timeout) {
        this.timeoutId = setTimeout(() => {
          this.worker.terminate()
          reject(new Error(`Task ${task.id} timed out after ${task.timeout}ms`))
        }, task.timeout)
      }

      // Listen for completion
      const onComplete = (taskId: string, result: WorkerResult) => {
        if (taskId === task.id) {
          this.removeListener('taskComplete', onComplete)
          this.removeListener('taskError', onError)
          resolve(result)
        }
      }

      const onError = (taskId: string, error: Error) => {
        if (taskId === task.id) {
          this.removeListener('taskComplete', onComplete)
          this.removeListener('taskError', onError)
          reject(error)
        }
      }

      this.on('taskComplete', onComplete)
      this.on('taskError', onError)

      // Send task to worker
      this.worker.postMessage(task)
    })
  }

  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  public terminate() {
    this.clearTimeout()
    return this.worker.terminate()
  }
}

export class WorkerPool {
  private workers: WorkerInstance[] = []
  private taskQueue: WorkerTask[] = []
  private pendingTasks = new Map<string, { resolve: Function, reject: Function, queueTime: number }>()
  private options: Required<WorkerPoolOptions>
  private totalTasksExecuted = 0
  private totalExecutionTime = 0
  private totalQueueTime = 0

  constructor(
    private scriptPath: string,
    options: WorkerPoolOptions = {}
  ) {
    this.options = {
      maxWorkers: options.maxWorkers || Math.max(2, os.cpus().length - 1),
      workerTimeout: options.workerTimeout || 30000,
      taskQueueLimit: options.taskQueueLimit || 100,
      enableProfiling: options.enableProfiling ?? true,
      performanceThresholds: {
        taskExecutionWarning: options.performanceThresholds?.taskExecutionWarning || 1000,
        taskExecutionCritical: options.performanceThresholds?.taskExecutionCritical || 5000,
        queueWaitWarning: options.performanceThresholds?.queueWaitWarning || 500
      }
    }

    this.initializeWorkers()
    
    if (this.options.enableProfiling) {
      this.setupPerformanceMonitoring()
    }
    
    console.log(`🔧 WorkerPool initialized with ${this.options.maxWorkers} workers`)
    console.log(`📊 Performance monitoring: ${this.options.enableProfiling ? 'enabled' : 'disabled'}`)
  }

  private setupPerformanceMonitoring(): void {
    // Start performance profiler if not already running
    if (!performanceProfiler.listenerCount('alert')) {
      performanceProfiler.on('alert', (alert) => {
        console.warn(`🚨 WorkerPool Performance Alert: ${alert.message}`)
      })
    }

    // Monitor worker pool metrics every 5 seconds
    setInterval(() => {
      const stats = this.getDetailedStats()
      
      // Check queue wait times
      if (stats.averageQueueTime > this.options.performanceThresholds.queueWaitWarning!) {
        console.warn(`⚠️ High queue wait time: ${stats.averageQueueTime.toFixed(2)}ms`)
      }
      
      // Check execution times
      if (stats.averageExecutionTime > this.options.performanceThresholds.taskExecutionWarning!) {
        console.warn(`⚠️ High task execution time: ${stats.averageExecutionTime.toFixed(2)}ms`)
      }
    }, 5000)
  }

  private initializeWorkers() {
    for (let i = 0; i < this.options.maxWorkers; i++) {
      const worker = new WorkerInstance(this.scriptPath)
      
      worker.on('taskComplete', (taskId: string, result: WorkerResult) => {
        const pending = this.pendingTasks.get(taskId)
        if (pending) {
          // Track performance metrics
          const queueTime = Date.now() - pending.queueTime
          const executionTime = result.executionTime || 0
          
          this.totalTasksExecuted++
          this.totalQueueTime += queueTime
          this.totalExecutionTime += executionTime
          
          // Log performance warnings
          if (this.options.enableProfiling) {
            if (executionTime > this.options.performanceThresholds.taskExecutionCritical!) {
              console.error(`🚨 Critical: Task ${taskId} took ${executionTime}ms to execute`)
            } else if (executionTime > this.options.performanceThresholds.taskExecutionWarning!) {
              console.warn(`⚠️ Warning: Task ${taskId} took ${executionTime}ms to execute`)
            }
            
            if (queueTime > this.options.performanceThresholds.queueWaitWarning!) {
              console.warn(`⚠️ Warning: Task ${taskId} waited ${queueTime}ms in queue`)
            }
          }
          
          pending.resolve(result)
          this.pendingTasks.delete(taskId)
        }
        this.processNextTask()
      })

      worker.on('taskError', (taskId: string, error: Error) => {
        const pending = this.pendingTasks.get(taskId)
        if (pending) {
          const queueTime = Date.now() - pending.queueTime
          this.totalQueueTime += queueTime
          
          console.error(`❌ Task ${taskId} failed after ${queueTime}ms in queue:`, error.message)
          pending.reject(error)
          this.pendingTasks.delete(taskId)
        }
        this.processNextTask()
      })

      this.workers.push(worker)
    }
  }

  public async executeTask(
    type: string,
    data: any,
    options: { priority?: number, timeout?: number } = {}
  ): Promise<WorkerResult> {
    // Use performance profiler if enabled
    if (this.options.enableProfiling) {
      return measureAsync(`WorkerPool.executeTask.${type}`, () => this.executeTaskInternal(type, data, options))
    } else {
      return this.executeTaskInternal(type, data, options)
    }
  }

  private async executeTaskInternal(
    type: string,
    data: any,
    options: { priority?: number, timeout?: number } = {}
  ): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      if (this.taskQueue.length >= this.options.taskQueueLimit) {
        reject(new Error('Task queue is full'))
        return
      }

      const task: WorkerTask = {
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        priority: options.priority || 0,
        timeout: options.timeout || this.options.workerTimeout
      }

      this.pendingTasks.set(task.id, { resolve, reject, queueTime: Date.now() })

      // Add to queue with priority
      this.taskQueue.push(task)
      this.taskQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0))

      this.processNextTask()
    })
  }

  private processNextTask() {
    if (this.taskQueue.length === 0) return

    const availableWorker = this.workers.find(w => !w.busy)
    if (!availableWorker) return

    const task = this.taskQueue.shift()!
    
    availableWorker.executeTask(task).catch(error => {
      const pending = this.pendingTasks.get(task.id)
      if (pending) {
        pending.reject(error)
        this.pendingTasks.delete(task.id)
      }
    })
  }

  public getStats() {
    return {
      totalWorkers: this.workers.length,
      busyWorkers: this.workers.filter(w => w.busy).length,
      queueSize: this.taskQueue.length,
      pendingTasks: this.pendingTasks.size
    }
  }

  public getDetailedStats(): WorkerPoolStats {
    const baseStats = this.getStats()
    const averageExecutionTime = this.totalTasksExecuted > 0 
      ? this.totalExecutionTime / this.totalTasksExecuted 
      : 0
    const averageQueueTime = this.totalTasksExecuted > 0 
      ? this.totalQueueTime / this.totalTasksExecuted 
      : 0

    let performanceMetrics
    if (this.options.enableProfiling) {
      const profilerMetrics = performanceProfiler.getMetrics()
      performanceMetrics = {
        eventLoopLag: profilerMetrics.eventLoopLag,
        memoryUsage: profilerMetrics.memoryUsage.heapUsed / 1024 / 1024, // MB
        cpuUsage: (profilerMetrics.cpuUsage.user + profilerMetrics.cpuUsage.system) / 1000000 * 100 // %
      }
    }

    return {
      ...baseStats,
      totalTasksExecuted: this.totalTasksExecuted,
      averageExecutionTime,
      averageQueueTime,
      performanceMetrics
    }
  }

  public generatePerformanceReport(): string {
    const stats = this.getDetailedStats()
    const eventLoopStats = this.options.enableProfiling ? performanceProfiler.getEventLoopStats() : null
    
    return `
🔧 WORKER POOL PERFORMANCE REPORT
===================================

📊 Pool Statistics:
- Total Workers: ${stats.totalWorkers}
- Busy Workers: ${stats.busyWorkers} (${((stats.busyWorkers / stats.totalWorkers) * 100).toFixed(1)}%)
- Queue Size: ${stats.queueSize}
- Pending Tasks: ${stats.pendingTasks}

📈 Task Metrics:
- Tasks Executed: ${stats.totalTasksExecuted.toLocaleString()}
- Average Execution Time: ${stats.averageExecutionTime.toFixed(2)}ms
- Average Queue Time: ${stats.averageQueueTime.toFixed(2)}ms

${stats.performanceMetrics ? `
🔍 Performance Metrics:
- Event Loop Lag: ${eventLoopStats?.currentLag.toFixed(2)}ms (avg: ${eventLoopStats?.averageLag.toFixed(2)}ms)
- Memory Usage: ${stats.performanceMetrics.memoryUsage.toFixed(2)}MB
- CPU Usage: ${stats.performanceMetrics.cpuUsage.toFixed(2)}%
` : ''}

🏥 Health Status:
- Queue Load: ${stats.queueSize > 10 ? '⚠️ High' : '✅ Normal'}
- Worker Utilization: ${(stats.busyWorkers / stats.totalWorkers) > 0.8 ? '⚠️ High' : '✅ Normal'}
- Average Response: ${stats.averageExecutionTime > 1000 ? '⚠️ Slow' : '✅ Fast'}

Generated at: ${new Date().toISOString()}
    `.trim()
  }

  public async shutdown() {
    console.log('🔄 Shutting down worker pool...')
    
    // Wait for current tasks to complete (max 10 seconds)
    const shutdownTimeout = setTimeout(() => {
      console.warn('⚠️ Force terminating workers due to timeout')
    }, 10000)

    await Promise.all(this.workers.map(worker => worker.terminate()))
    clearTimeout(shutdownTimeout)
    
    console.log('✅ Worker pool shut down')
  }
}

// Singleton instance manager
class WorkerPoolManager {
  private pools = new Map<string, WorkerPool>()

  public getPool(name: string, scriptPath: string, options?: WorkerPoolOptions): WorkerPool {
    if (!this.pools.has(name)) {
      const fullPath = path.resolve(process.cwd(), scriptPath)
      this.pools.set(name, new WorkerPool(fullPath, options))
    }
    return this.pools.get(name)!
  }

  public async shutdownAll() {
    const shutdownPromises = Array.from(this.pools.values()).map(pool => pool.shutdown())
    await Promise.all(shutdownPromises)
    this.pools.clear()
  }
}

export const workerPoolManager = new WorkerPoolManager()

// Graceful shutdown
if (isMainThread) {
  process.on('SIGTERM', async () => {
    await workerPoolManager.shutdownAll()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    await workerPoolManager.shutdownAll()
    process.exit(0)
  })
}