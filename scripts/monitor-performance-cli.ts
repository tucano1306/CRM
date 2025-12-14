#!/usr/bin/env node
/**
 * 🔍 Performance Monitoring CLI Tool
 * Herramienta simplificada de monitoreo de rendimiento del CRM
 */

import { performanceProfiler, PerformanceProfiler } from '../lib/monitoring/performance-profiler'
import { workerPoolManager } from '../lib/workers/worker-pool'
import * as fs from 'fs'
import * as path from 'path'

interface MonitoringOptions {
  duration?: number
  interval?: number
  output?: string
  alerts?: boolean
}

class PerformanceMonitorCLI {
  private profiler: PerformanceProfiler
  private isRunning = false
  private monitoringInterval: NodeJS.Timeout | null = null

  constructor() {
    this.profiler = performanceProfiler
    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    this.profiler.on('alert', (alert: any) => {
      this.displayAlert(alert)
    })

    this.profiler.on('metrics', (metrics: any) => {
      if (this.isRunning) {
        this.updateDisplay(metrics)
      }
    })
  }

  private displayAlert(alert: any): void {
    const severityIcons = {
      low: '⚠️',
      medium: '🔶',
      high: '🔴',
      critical: '🚨'
    }

    const icon = severityIcons[alert.severity as keyof typeof severityIcons] || '⚠️'
    console.log(`\n${icon} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`)
    console.log(`   Time: ${new Date(alert.timestamp).toLocaleTimeString()}`)
  }

  private updateDisplay(metrics: any): void {
    // Clear screen and move cursor to top
    process.stdout.write('\x1b[2J\x1b[0f')
    
    console.log('🔍 CRM PERFORMANCE MONITOR')
    console.log('═'.repeat(60))
    
    this.displaySystemMetrics(metrics)
    this.displayEventLoopStats()
    this.displayMemoryStats(metrics)
    this.displayWorkerStats()
    this.displayHotspots()
    
    console.log('─'.repeat(60))
    console.log(`Last updated: ${new Date().toLocaleTimeString()}`)
    console.log('Press Ctrl+C to stop monitoring')
  }

  private displaySystemMetrics(metrics: any): void {
    const eventLoopStatus = metrics.eventLoopLag > 10 ? '🔴' : 
                           metrics.eventLoopLag > 5 ? '🟡' : '🟢'
    
    const memoryMB = metrics.memoryUsage.heapUsed / 1024 / 1024
    const memoryStatus = memoryMB > 512 ? '🔴' : 
                        memoryMB > 256 ? '🟡' : '🟢'

    console.log('\n📊 System Metrics:')
    console.log(`   Event Loop Lag: ${eventLoopStatus} ${metrics.eventLoopLag.toFixed(2)}ms`)
    console.log(`   Memory Usage: ${memoryStatus} ${memoryMB.toFixed(2)}MB heap`)
    console.log(`   RSS Memory: ${(metrics.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`)
  }

  private displayEventLoopStats(): void {
    const stats = this.profiler.getEventLoopStats()
    
    console.log('\n⚡ Event Loop Statistics:')
    console.log(`   Current Lag: ${stats.currentLag.toFixed(2)}ms`)
    console.log(`   Average Lag: ${stats.averageLag.toFixed(2)}ms`)
    console.log(`   P95 Lag: ${stats.p95Lag.toFixed(2)}ms`)
  }

  private displayMemoryStats(metrics: any): void {
    console.log('\n💾 Memory Statistics:')
    console.log(`   Heap Used: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   Heap Total: ${(metrics.memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   External: ${(metrics.memoryUsage.external / 1024 / 1024).toFixed(2)}MB`)
    console.log(`   Heap Limit: ${(metrics.heapStatistics.heapSizeLimit / 1024 / 1024).toFixed(2)}MB`)
  }

  private displayWorkerStats(): void {
    try {
      const defaultPool = workerPoolManager.getPool('default', 'lib/workers/worker-script.js')
      const stats = defaultPool.getDetailedStats()
      
      console.log('\n👷 Worker Pool Statistics:')
      console.log(`   Total Workers: ${stats.totalWorkers}`)
      console.log(`   Busy Workers: ${stats.busyWorkers}`)
      console.log(`   Queue Size: ${stats.queueSize}`)
      console.log(`   Tasks Executed: ${stats.totalTasksExecuted}`)
      console.log(`   Avg Execution Time: ${stats.averageExecutionTime.toFixed(2)}ms`)
      console.log(`   Avg Queue Time: ${stats.averageQueueTime.toFixed(2)}ms`)
    } catch (error) {
      console.log('\n👷 Worker Pool: Not initialized')
    }
  }

  private displayHotspots(): void {
    const hotspots = this.profiler.getHotspots().slice(0, 5)
    
    if (hotspots.length > 0) {
      console.log('\n🔥 Performance Hotspots (Top 5):')
      console.log('   ┌─────────────────────────────┬───────┬────────────┬──────────┐')
      console.log('   │ Function                    │ Calls │ Total Time │ Avg Time │')
      console.log('   ├─────────────────────────────┼───────┼────────────┼──────────┤')
      
      hotspots.forEach(hotspot => {
        const name = hotspot.name.substring(0, 27) + (hotspot.name.length > 27 ? '...' : '')
        console.log(`   │ ${name.padEnd(27)} │ ${hotspot.count.toString().padStart(5)} │ ${(hotspot.totalTime.toFixed(2) + 'ms').padStart(10)} │ ${(hotspot.avgTime.toFixed(2) + 'ms').padStart(8)} │`)
      })
      
      console.log('   └─────────────────────────────┴───────┴────────────┴──────────┘')
    }
  }

  public async startMonitoring(options: MonitoringOptions): Promise<void> {
    console.log('🚀 Starting CRM Performance Monitor')
    console.log(`Duration: ${options.duration ? options.duration + 's' : 'continuous'}`)
    console.log(`Interval: ${options.interval || 1000}ms`)
    
    this.isRunning = true
    this.profiler.startMonitoring()
    
    // Setup monitoring interval
    this.monitoringInterval = setInterval(() => {
      const metrics = this.profiler.getMetrics()
      this.updateDisplay(metrics)
    }, options.interval || 1000)

    // Setup duration timer if specified
    if (options.duration) {
      setTimeout(() => {
        this.stopMonitoring()
      }, options.duration * 1000)
    }

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stopMonitoring()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      this.stopMonitoring()
      process.exit(0)
    })
  }

  public stopMonitoring(): void {
    if (!this.isRunning) return

    console.log('\n🛑 Stopping performance monitoring...')
    
    this.isRunning = false
    this.profiler.stopMonitoring()
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }

    // Generate final report
    console.log('\n📊 FINAL PERFORMANCE REPORT')
    console.log('═'.repeat(60))
    console.log(this.profiler.generateReport())
  }

  public async generateReport(outputFile?: string, format: 'text' | 'json' = 'text'): Promise<void> {
    const report = format === 'json' 
      ? JSON.stringify({
          timestamp: new Date().toISOString(),
          metrics: this.profiler.getMetrics(),
          eventLoopStats: this.profiler.getEventLoopStats(),
          hotspots: this.profiler.getHotspots(),
          gcStats: this.profiler.getGCStats()
        }, null, 2)
      : this.profiler.generateReport()

    if (outputFile) {
      await fs.promises.writeFile(outputFile, report)
      console.log(`✅ Report saved to: ${outputFile}`)
    } else {
      console.log(report)
    }
  }

  public displayQuickStats(): void {
    const metrics = this.profiler.getMetrics()
    const eventLoopStats = this.profiler.getEventLoopStats()
    const hotspots = this.profiler.getHotspots().slice(0, 3)

    console.log('🔍 CRM Performance Quick Stats')
    console.log('─'.repeat(40))
    
    console.log(`📊 Event Loop Lag: ${eventLoopStats.currentLag.toFixed(2)}ms`)
    console.log(`💾 Memory Usage: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`)
    console.log(`⚡ Process Uptime: ${process.uptime().toFixed(0)}s`)
    
    if (hotspots.length > 0) {
      console.log('\n🔥 Top Performance Hotspots:')
      hotspots.forEach((hotspot, i) => {
        console.log(`   ${i + 1}. ${hotspot.name}: ${hotspot.avgTime.toFixed(2)}ms avg`)
      })
    }
  }
}

// Simple CLI argument parsing
const args = process.argv.slice(2)
const command = args[0]

const cli = new PerformanceMonitorCLI()

switch (command) {
  case 'monitor':
    const duration = args.includes('--duration') ? Number.parseInt(args[args.indexOf('--duration') + 1]) : undefined
    const interval = args.includes('--interval') ? Number.parseInt(args[args.indexOf('--interval') + 1]) : 1000
    const output = args.includes('--output') ? args[args.indexOf('--output') + 1] : undefined
    
    cli.startMonitoring({ duration, interval, output })
    break

  case 'report':
    const reportOutput = args.includes('--output') ? args[args.indexOf('--output') + 1] : undefined
    const format = args.includes('--json') ? 'json' : 'text'
    
    cli.generateReport(reportOutput, format)
    break

  case 'stats':
    cli.displayQuickStats()
    break

  case 'help':
  case '--help':
    console.log(`
🔍 CRM Performance Monitor CLI

Usage:
  node scripts/monitor-performance.js [command] [options]

Commands:
  monitor          Start real-time performance monitoring
  report           Generate performance report  
  stats            Show quick performance statistics
  help             Show this help message

Monitor Options:
  --duration <s>   Monitoring duration in seconds
  --interval <ms>  Update interval in milliseconds (default: 1000)
  --output <file>  Output file for final report

Report Options:
  --output <file>  Output file
  --json          Generate JSON format report

Examples:
  node scripts/monitor-performance.js stats
  node scripts/monitor-performance.js monitor --duration 60
  node scripts/monitor-performance.js report --output report.txt
  node scripts/monitor-performance.js monitor --interval 500 --output final.json
`)
    break

  default:
    cli.displayQuickStats()
    break
}

export { PerformanceMonitorCLI }