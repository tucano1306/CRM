'use client'

/**
 * 📊 Performance Dashboard Component
 * Panel de monitoreo de rendimiento en tiempo real para el CRM
 */

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
// Simple progress bar without external dependencies
const Progress = ({ value, className }: { value: number, className?: string }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
      style={{ width: `${Math.min(value, 100)}%` }}
    />
  </div>
)

interface PerformanceMetrics {
  eventLoopLag: number
  memoryUsage: {
    heapUsed: number
    heapTotal: number
    rss: number
    external: number
  }
  cpuUsage: {
    user: number
    system: number
  }
  heapStatistics: {
    totalHeapSize: number
    usedHeapSize: number
    heapSizeLimit: number
  }
  timestamp: number
}

interface WorkerPoolStats {
  totalWorkers: number
  busyWorkers: number
  queueSize: number
  pendingTasks: number
  totalTasksExecuted: number
  averageExecutionTime: number
  averageQueueTime: number
}

interface PerformanceAlert {
  type: 'event_loop_lag' | 'memory_leak' | 'cpu_spike' | 'gc_pressure'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
}

interface Hotspot {
  name: string
  count: number
  totalTime: number
  avgTime: number
}

export default function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [workerStats, setWorkerStats] = useState<WorkerPoolStats | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [hotspots, setHotspots] = useState<Hotspot[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [history, setHistory] = useState<PerformanceMetrics[]>([])
  const intervalRef = useRef<NodeJS.Timeout>()

  // Mock function to simulate getting metrics
  // In a real app, this would call your performance profiler API
  const fetchMetrics = async (): Promise<PerformanceMetrics> => {
    // Simulate realistic metrics
    return {
      eventLoopLag: Math.random() * 15 + 1, // 1-16ms
      memoryUsage: {
        heapUsed: 64 * 1024 * 1024 + Math.random() * 100 * 1024 * 1024, // 64-164MB
        heapTotal: 128 * 1024 * 1024,
        rss: 200 * 1024 * 1024 + Math.random() * 50 * 1024 * 1024,
        external: 10 * 1024 * 1024
      },
      cpuUsage: {
        user: Math.random() * 50000, // microseconds
        system: Math.random() * 20000
      },
      heapStatistics: {
        totalHeapSize: 128 * 1024 * 1024,
        usedHeapSize: 64 * 1024 * 1024 + Math.random() * 50 * 1024 * 1024,
        heapSizeLimit: 1024 * 1024 * 1024 // 1GB
      },
      timestamp: Date.now()
    }
  }

  const fetchWorkerStats = async (): Promise<WorkerPoolStats> => {
    return {
      totalWorkers: 4,
      busyWorkers: Math.floor(Math.random() * 4),
      queueSize: Math.floor(Math.random() * 10),
      pendingTasks: Math.floor(Math.random() * 5),
      totalTasksExecuted: 1500 + Math.floor(Math.random() * 100),
      averageExecutionTime: 50 + Math.random() * 200,
      averageQueueTime: 10 + Math.random() * 50
    }
  }

  const fetchHotspots = async (): Promise<Hotspot[]> => {
    return [
      { name: 'OrderService.calculateTotal', count: 1250, totalTime: 12500, avgTime: 10 },
      { name: 'DatabaseQuery.findOrders', count: 850, totalTime: 17000, avgTime: 20 },
      { name: 'PaymentService.processPayment', count: 320, totalTime: 9600, avgTime: 30 },
      { name: 'AuthService.validateToken', count: 2100, totalTime: 6300, avgTime: 3 },
      { name: 'NotificationService.sendEmail', count: 150, totalTime: 7500, avgTime: 50 }
    ]
  }

  const startMonitoring = () => {
    setIsMonitoring(true)
    intervalRef.current = setInterval(async () => {
      try {
        const [newMetrics, newWorkerStats, newHotspots] = await Promise.all([
          fetchMetrics(),
          fetchWorkerStats(),
          fetchHotspots()
        ])
        
        setMetrics(newMetrics)
        setWorkerStats(newWorkerStats)
        setHotspots(newHotspots)
        
        // Update history (keep last 20 points for chart)
        setHistory(prev => {
          const updated = [...prev, newMetrics].slice(-20)
          return updated
        })

        // Check for alerts
        if (newMetrics.eventLoopLag > 10) {
          const alert: PerformanceAlert = {
            type: 'event_loop_lag',
            severity: newMetrics.eventLoopLag > 20 ? 'critical' : 'high',
            message: `Event loop lag: ${newMetrics.eventLoopLag.toFixed(2)}ms`,
            timestamp: Date.now()
          }
          setAlerts(prev => [alert, ...prev.slice(0, 4)]) // Keep last 5 alerts
        }

        const memoryMB = newMetrics.memoryUsage.heapUsed / 1024 / 1024
        if (memoryMB > 128) {
          const alert: PerformanceAlert = {
            type: 'memory_leak',
            severity: memoryMB > 200 ? 'critical' : 'high',
            message: `High memory usage: ${memoryMB.toFixed(2)}MB`,
            timestamp: Date.now()
          }
          setAlerts(prev => [alert, ...prev.slice(0, 4)])
        }
        
      } catch (error) {
        console.error('Error fetching metrics:', error)
      }
    }, 2000) // Update every 2 seconds
  }

  const stopMonitoring = () => {
    setIsMonitoring(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }

  useEffect(() => {
    // Auto-start monitoring
    startMonitoring()
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusColor = (value: number, threshold: number) => {
    if (value > threshold * 1.5) return 'text-red-600'
    if (value > threshold) return 'text-yellow-600'
    return 'text-green-600'
  }

  if (!metrics) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024
  const memoryLimitMB = metrics.heapStatistics.heapSizeLimit / 1024 / 1024
  const memoryPercent = (memoryUsageMB / memoryLimitMB) * 100

  const workerUtilization = workerStats ? (workerStats.busyWorkers / workerStats.totalWorkers) * 100 : 0

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔍 Performance Monitor</h1>
          <p className="text-gray-600">Monitoreo en tiempo real del sistema CRM</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isMonitoring ? 'Monitoreando' : 'Detenido'}
          </span>
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              isMonitoring 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isMonitoring ? 'Detener' : 'Iniciar'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">🚨 Alertas de Rendimiento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{alert.message}</span>
                    <span className="text-xs opacity-70">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Event Loop Lag */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              ⚡ Event Loop Lag
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              <span className={getStatusColor(metrics.eventLoopLag, 10)}>
                {metrics.eventLoopLag.toFixed(2)}ms
              </span>
            </div>
            <Progress value={(metrics.eventLoopLag / 50) * 100} className="mb-2" />
            <p className="text-sm text-gray-600">
              Umbral recomendado: &lt;10ms
            </p>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              💾 Uso de Memoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mb-2">
              <span className={getStatusColor(memoryUsageMB, 256)}>
                {memoryUsageMB.toFixed(2)}MB
              </span>
            </div>
            <Progress value={memoryPercent} className="mb-2" />
            <p className="text-sm text-gray-600">
              {memoryPercent.toFixed(1)}% del límite ({memoryLimitMB.toFixed(0)}MB)
            </p>
          </CardContent>
        </Card>

        {/* Worker Pool */}
        {workerStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                👷 Pool de Workers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                <span className={getStatusColor(workerUtilization, 80)}>
                  {workerStats.busyWorkers}/{workerStats.totalWorkers}
                </span>
              </div>
              <Progress value={workerUtilization} className="mb-2" />
              <p className="text-sm text-gray-600">
                {workerUtilization.toFixed(1)}% utilización
              </p>
            </CardContent>
          </Card>
        )}

        {/* Task Queue */}
        {workerStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                📋 Cola de Tareas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                <span className={getStatusColor(workerStats.queueSize, 20)}>
                  {workerStats.queueSize}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <div>Pendientes: {workerStats.pendingTasks}</div>
                <div>Ejecutadas: {workerStats.totalTasksExecuted.toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Average Times */}
        {workerStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                ⏱️ Tiempos Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between">
                    <span className="text-sm">Ejecución</span>
                    <span className={`font-medium ${getStatusColor(workerStats.averageExecutionTime, 1000)}`}>
                      {workerStats.averageExecutionTime.toFixed(2)}ms
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between">
                    <span className="text-sm">Cola</span>
                    <span className={`font-medium ${getStatusColor(workerStats.averageQueueTime, 500)}`}>
                      {workerStats.averageQueueTime.toFixed(2)}ms
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              🖥️ Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>RSS Memory</span>
                <span>{(metrics.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB</span>
              </div>
              <div className="flex justify-between">
                <span>External</span>
                <span>{(metrics.memoryUsage.external / 1024 / 1024).toFixed(2)}MB</span>
              </div>
              <div className="flex justify-between">
                <span>Uptime</span>
                <span>{Math.floor(process.uptime?.() || 0)}s</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Hotspots */}
      <Card>
        <CardHeader>
          <CardTitle>🔥 Hotspots de Rendimiento</CardTitle>
          <CardDescription>
            Funciones que consumen más tiempo de CPU
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Función</th>
                  <th className="text-right py-2">Llamadas</th>
                  <th className="text-right py-2">Tiempo Total</th>
                  <th className="text-right py-2">Tiempo Promedio</th>
                </tr>
              </thead>
              <tbody>
                {hotspots.slice(0, 5).map((hotspot, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-2 font-mono text-xs">
                      {hotspot.name.length > 40 
                        ? hotspot.name.substring(0, 40) + '...' 
                        : hotspot.name
                      }
                    </td>
                    <td className="text-right py-2">{hotspot.count.toLocaleString()}</td>
                    <td className="text-right py-2">{hotspot.totalTime.toFixed(2)}ms</td>
                    <td className={`text-right py-2 font-medium ${
                      hotspot.avgTime > 50 ? 'text-red-600' :
                      hotspot.avgTime > 20 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {hotspot.avgTime.toFixed(2)}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-500">
        <p>Última actualización: {new Date(metrics.timestamp).toLocaleTimeString()}</p>
        <p>Datos actualizados cada 2 segundos • {history.length} puntos de datos</p>
      </div>
    </div>
  )
}