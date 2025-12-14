/**
 * 🔍 Performance Monitor & Event Loop Diagnostics
 * Sistema de monitoreo de rendimiento y detección de bloqueos
 */

import { performance, PerformanceObserver } from 'node:perf_hooks'
import { EventEmitter } from 'node:events'
import v8 from 'node:v8'
import process from 'node:process'

export interface PerformanceMetrics {
  eventLoopLag: number
  memoryUsage: NodeJS.MemoryUsage
  cpuUsage: NodeJS.CpuUsage
  heapStatistics: v8.HeapStatistics
  timestamp: number
}

export interface PerformanceAlert {
  type: 'event_loop_lag' | 'memory_leak' | 'cpu_spike' | 'gc_pressure'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  metrics: PerformanceMetrics
  timestamp: number
}

export interface ProfilerConfig {
  eventLoopLagThreshold: number  // ms
  memoryThreshold: number        // MB
  cpuThreshold: number          // percentage
  sampleInterval: number        // ms
  gcThreshold: number           // MB/s
  enableGCMonitoring: boolean
  enableNetworkMonitoring: boolean
}

class EventLoopMonitor {
  private lagSamples: number[] = []
  private maxSamples = 100
  private lastCheck = performance.now()

  public measureLag(): number {
    const start = performance.now()
    
    setImmediate(() => {
      const lag = performance.now() - start
      this.lagSamples.push(lag)
      
      if (this.lagSamples.length > this.maxSamples) {
        this.lagSamples.shift()
      }
    })

    // Return current estimated lag
    return this.lagSamples.length > 0 
      ? this.lagSamples.reduce((sum, lag) => sum + lag, 0) / this.lagSamples.length
      : 0
  }

  public getAverageLag(): number {
    return this.lagSamples.length > 0
      ? this.lagSamples.reduce((sum, lag) => sum + lag, 0) / this.lagSamples.length
      : 0
  }

  public getP95Lag(): number {
    if (this.lagSamples.length === 0) return 0
    const sorted = [...this.lagSamples].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * 0.95)
    return sorted[index] || 0
  }

  public reset(): void {
    this.lagSamples = []
  }
}

export class PerformanceProfiler extends EventEmitter {
  private config: ProfilerConfig
  private eventLoopMonitor: EventLoopMonitor
  private performanceObserver: PerformanceObserver | null = null
  private monitoringInterval: NodeJS.Timeout | null = null
  private metricsHistory: PerformanceMetrics[] = []
  private hotspots: Map<string, { count: number, totalTime: number, avgTime: number }> = new Map()
  private gcMetrics = { collections: 0, totalTime: 0, totalFreed: 0 }
  private lastCpuUsage = process.cpuUsage()
  private isMonitoring = false

  constructor(config: Partial<ProfilerConfig> = {}) {
    super()
    
    this.config = {
      eventLoopLagThreshold: config.eventLoopLagThreshold || 10, // 10ms
      memoryThreshold: config.memoryThreshold || 512,           // 512MB
      cpuThreshold: config.cpuThreshold || 80,                 // 80%
      sampleInterval: config.sampleInterval || 1000,           // 1s
      gcThreshold: config.gcThreshold || 50,                   // 50MB/s
      enableGCMonitoring: config.enableGCMonitoring ?? true,
      enableNetworkMonitoring: config.enableNetworkMonitoring ?? true
    }

    this.eventLoopMonitor = new EventLoopMonitor()
    this.setupPerformanceObserver()
    
    console.log('🔍 Performance Profiler initialized')
    console.log('Configuration:', this.config)
  }

  private setupPerformanceObserver(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordHotspot(entry.name, entry.duration)
        
        // Alert on slow operations
        if (entry.duration > 100) { // 100ms threshold
          this.emitAlert({
            type: 'cpu_spike',
            severity: entry.duration > 1000 ? 'critical' : 'high',
            message: `Slow operation detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`,
            metrics: this.getCurrentMetrics(),
            timestamp: Date.now()
          })
        }
      }
    })

    this.performanceObserver.observe({ 
      entryTypes: ['function', 'measure', 'resource'] 
    })
  }

  private recordHotspot(name: string, duration: number): void {
    const existing = this.hotspots.get(name) || { count: 0, totalTime: 0, avgTime: 0 }
    existing.count++
    existing.totalTime += duration
    existing.avgTime = existing.totalTime / existing.count
    this.hotspots.set(name, existing)
  }

  public startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('⚠️ Performance monitoring already running')
      return
    }

    this.isMonitoring = true
    console.log('🚀 Starting performance monitoring...')

    // Setup GC monitoring
    if (this.config.enableGCMonitoring) {
      this.setupGCMonitoring()
    }

    // Start periodic metrics collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, this.config.sampleInterval)

    // Emit start event
    this.emit('monitoring:start')
  }

  public stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    console.log('🛑 Stopping performance monitoring...')

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }

    this.emit('monitoring:stop')
  }

  private setupGCMonitoring(): void {
    const gcObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.gcMetrics.collections++
        this.gcMetrics.totalTime += entry.duration
        
        // Calculate freed memory (approximation)
        const gcEntry = entry as any
        const beforeGC = gcEntry.detail?.before || 0
        const afterGC = gcEntry.detail?.after || 0
        const freed = beforeGC - afterGC
        this.gcMetrics.totalFreed += Math.max(0, freed)

        // Alert on excessive GC
        if (entry.duration > 50) { // 50ms GC pause
          this.emitAlert({
            type: 'gc_pressure',
            severity: entry.duration > 100 ? 'critical' : 'high',
            message: `Long GC pause: ${entry.duration.toFixed(2)}ms (${entry.name})`,
            metrics: this.getCurrentMetrics(),
            timestamp: Date.now()
          })
        }
      }
    })

    gcObserver.observe({ entryTypes: ['gc'] })
  }

  private collectMetrics(): void {
    const metrics = this.getCurrentMetrics()
    this.metricsHistory.push(metrics)

    // Keep only last 1000 samples (configurable)
    if (this.metricsHistory.length > 1000) {
      this.metricsHistory.shift()
    }

    // Check thresholds and emit alerts
    this.checkThresholds(metrics)

    // Emit metrics event
    this.emit('metrics', metrics)
  }

  private getCurrentMetrics(): PerformanceMetrics {
    const eventLoopLag = this.eventLoopMonitor.measureLag()
    const memoryUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage(this.lastCpuUsage)
    const heapStats = v8.getHeapStatistics()
    
    // Convert HeapInfo to HeapStatistics format
    const heapStatistics: v8.HeapStatistics = {
      totalHeapSize: heapStats.total_heap_size || 0,
      totalHeapSizeExecutable: heapStats.total_heap_size_executable || 0,
      totalPhysicalSize: heapStats.total_physical_size || 0,
      totalAvailableSize: heapStats.total_available_size || 0,
      usedHeapSize: heapStats.used_heap_size || 0,
      heapSizeLimit: heapStats.heap_size_limit || 0,
      mallocedMemory: heapStats.malloced_memory || 0,
      peakMallocedMemory: heapStats.peak_malloced_memory || 0,
      totalGlobalHandlesSize: 0,
      usedGlobalHandlesSize: 0,
      externalMemory: heapStats.external_memory || 0
    }

    this.lastCpuUsage = process.cpuUsage()

    return {
      eventLoopLag,
      memoryUsage,
      cpuUsage,
      heapStatistics,
      timestamp: Date.now()
    }
  }

  private checkThresholds(metrics: PerformanceMetrics): void {
    // Event Loop Lag Check
    if (metrics.eventLoopLag > this.config.eventLoopLagThreshold) {
      this.emitAlert({
        type: 'event_loop_lag',
        severity: metrics.eventLoopLag > 50 ? 'critical' : 'high',
        message: `High event loop lag detected: ${metrics.eventLoopLag.toFixed(2)}ms`,
        metrics,
        timestamp: Date.now()
      })
    }

    // Memory Usage Check
    const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024
    if (memoryMB > this.config.memoryThreshold) {
      this.emitAlert({
        type: 'memory_leak',
        severity: memoryMB > this.config.memoryThreshold * 1.5 ? 'critical' : 'high',
        message: `High memory usage detected: ${memoryMB.toFixed(2)}MB`,
        metrics,
        timestamp: Date.now()
      })
    }

    // CPU Usage Check (approximation)
    const cpuPercent = (metrics.cpuUsage.user + metrics.cpuUsage.system) / 1000000 * 100
    if (cpuPercent > this.config.cpuThreshold) {
      this.emitAlert({
        type: 'cpu_spike',
        severity: cpuPercent > 95 ? 'critical' : 'high',
        message: `High CPU usage detected: ${cpuPercent.toFixed(2)}%`,
        metrics,
        timestamp: Date.now()
      })
    }
  }

  private emitAlert(alert: PerformanceAlert): void {
    console.warn(`🚨 Performance Alert [${alert.severity.toUpperCase()}]:`, alert.message)
    this.emit('alert', alert)
  }

  // Public API methods
  public getMetrics(): PerformanceMetrics {
    return this.getCurrentMetrics()
  }

  public getEventLoopStats() {
    return {
      currentLag: this.eventLoopMonitor.measureLag(),
      averageLag: this.eventLoopMonitor.getAverageLag(),
      p95Lag: this.eventLoopMonitor.getP95Lag()
    }
  }

  public getHotspots(): Array<{ name: string, count: number, totalTime: number, avgTime: number }> {
    return Array.from(this.hotspots.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.totalTime - a.totalTime)
  }

  public getGCStats() {
    return { ...this.gcMetrics }
  }

  public getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory]
  }

  public generateReport(): string {
    const metrics = this.getCurrentMetrics()
    const eventLoopStats = this.getEventLoopStats()
    const hotspots = this.getHotspots().slice(0, 10) // Top 10
    const gcStats = this.getGCStats()

    return `
🔍 PERFORMANCE PROFILER REPORT
=====================================

📊 Current Metrics:
- Event Loop Lag: ${eventLoopStats.currentLag.toFixed(2)}ms (avg: ${eventLoopStats.averageLag.toFixed(2)}ms, p95: ${eventLoopStats.p95Lag.toFixed(2)}ms)
- Memory Usage: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB heap, ${(metrics.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB RSS
- Heap Statistics: ${(metrics.heapStatistics.totalHeapSize / 1024 / 1024).toFixed(2)}MB total, ${(metrics.heapStatistics.usedHeapSize / 1024 / 1024).toFixed(2)}MB used

🔥 Performance Hotspots (Top 10):
${hotspots.map((h, i) => `${i + 1}. ${h.name}: ${h.count} calls, ${h.avgTime.toFixed(2)}ms avg`).join('\n')}

🗑️ Garbage Collection:
- Collections: ${gcStats.collections}
- Total GC Time: ${gcStats.totalTime.toFixed(2)}ms
- Memory Freed: ${(gcStats.totalFreed / 1024 / 1024).toFixed(2)}MB

🏥 Health Status:
- Event Loop: ${eventLoopStats.currentLag < this.config.eventLoopLagThreshold ? '✅ Healthy' : '⚠️ Lagging'}
- Memory: ${(metrics.memoryUsage.heapUsed / 1024 / 1024) < this.config.memoryThreshold ? '✅ Normal' : '⚠️ High'}
- GC Pressure: ${gcStats.totalTime < 1000 ? '✅ Low' : '⚠️ High'}

Generated at: ${new Date().toISOString()}
    `.trim()
  }

  public clearHistory(): void {
    this.metricsHistory = []
    this.hotspots.clear()
    this.gcMetrics = { collections: 0, totalTime: 0, totalFreed: 0 }
    this.eventLoopMonitor.reset()
    console.log('🧹 Performance history cleared')
  }
}

// Singleton instance
export const performanceProfiler = new PerformanceProfiler()

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development' || process.env.ENABLE_PROFILING === 'true') {
  performanceProfiler.startMonitoring()
  
  // Log report every minute in development
  setInterval(() => {
    console.log(performanceProfiler.generateReport())
  }, 60000)
}

// Graceful shutdown
process.on('SIGTERM', () => {
  performanceProfiler.stopMonitoring()
})

process.on('SIGINT', () => {
  performanceProfiler.stopMonitoring()
})

// Export utility functions
export function measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now()
  return fn().finally(() => {
    const duration = performance.now() - start
    performanceProfiler.emit('measure', { name, duration })
  })
}

export function measureSync<T>(name: string, fn: () => T): T {
  const start = performance.now()
  try {
    return fn()
  } finally {
    const duration = performance.now() - start
    performanceProfiler.emit('measure', { name, duration })
  }
}

export function profileFunction(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value
  
  descriptor.value = function (...args: any[]) {
    const start = performance.now()
    try {
      const result = originalMethod.apply(this, args)
      
      if (result && typeof result.then === 'function') {
        // Async function
        return result.finally(() => {
          const duration = performance.now() - start
          performanceProfiler.emit('measure', { 
            name: `${target.constructor.name}.${propertyName}`, 
            duration 
          })
        })
      } else {
        // Sync function
        const duration = performance.now() - start
        performanceProfiler.emit('measure', { 
          name: `${target.constructor.name}.${propertyName}`, 
          duration 
        })
        return result
      }
    } catch (error) {
      const duration = performance.now() - start
      performanceProfiler.emit('measure', { 
        name: `${target.constructor.name}.${propertyName}`, 
        duration 
      })
      throw error
    }
  }
  
  return descriptor
}