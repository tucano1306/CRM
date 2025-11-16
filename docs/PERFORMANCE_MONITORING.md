# 🔍 Performance Monitoring & Profiling System

Sistema completo de monitoreo de rendimiento y detección de cuellos de botella para el CRM de Food Orders.

## 📋 Tabla de Contenidos

- [Resumen Ejecutivo](#resumen-ejecutivo)
- [Componentes del Sistema](#componentes-del-sistema)
- [Configuración e Instalación](#configuración-e-instalación)
- [Uso Básico](#uso-básico)
- [Herramientas CLI](#herramientas-cli)
- [Dashboard Web](#dashboard-web)
- [Métricas Monitoreadas](#métricas-monitoreadas)
- [Alertas y Umrales](#alertas-y-umbrales)
- [API de Profiling](#api-de-profiling)
- [Mejores Prácticas](#mejores-prácticas)
- [Troubleshooting](#troubleshooting)

## 🎯 Resumen Ejecutivo

Este sistema proporciona monitoreo completo de rendimiento para detectar:

- **Event Loop Lag**: Bloqueos que afectan la responsividad
- **Memory Leaks**: Fugas de memoria y uso excesivo
- **CPU Hotspots**: Funciones que consumen más tiempo
- **Worker Pool Performance**: Eficiencia del sistema de tareas
- **GC Impact**: Presión del recolector de basura

### ✅ Beneficios Clave

- 🚨 **Alertas en Tiempo Real**: Detección automática de problemas
- 📊 **Métricas Granulares**: Visibilidad completa del rendimiento
- 🔥 **Hotspot Detection**: Identificación de código lento
- 👷 **Worker Monitoring**: Monitoreo del pool de workers
- 📈 **Historical Data**: Análisis de tendencias

## 🧩 Componentes del Sistema

### 1. Performance Profiler Core
```typescript
// lib/monitoring/performance-profiler.ts
import { performanceProfiler } from '@/lib/monitoring/performance-profiler'

// Iniciar monitoreo
performanceProfiler.startMonitoring()

// Obtener métricas actuales
const metrics = performanceProfiler.getMetrics()
```

### 2. Enhanced Worker Pool
```typescript
// lib/workers/worker-pool.ts  
import { workerPoolManager } from '@/lib/workers/worker-pool'

const pool = workerPoolManager.getPool('default', 'worker-script.js', {
  enableProfiling: true,
  performanceThresholds: {
    taskExecutionWarning: 1000,    // 1s
    taskExecutionCritical: 5000,   // 5s
    queueWaitWarning: 500          // 500ms
  }
})
```

### 3. CLI Monitoring Tool
```bash
# scripts/monitor-performance-cli.ts
npm run monitor              # Stats rápidos
npm run monitor:watch        # Monitoreo en tiempo real
npm run performance:profile  # Profile por 60s
```

### 4. React Dashboard
```tsx
// components/dashboard/PerformanceDashboard.tsx
import PerformanceDashboard from '@/components/dashboard/PerformanceDashboard'

<PerformanceDashboard />
```

## ⚙️ Configuración e Instalación

### Variables de Entorno

```env
# .env.local
NODE_ENV=development
ENABLE_PROFILING=true
PERFORMANCE_SAMPLE_INTERVAL=1000
PERFORMANCE_EVENT_LOOP_THRESHOLD=10
PERFORMANCE_MEMORY_THRESHOLD=512
PERFORMANCE_CPU_THRESHOLD=80
```

### Configuración Automática

El sistema se auto-configura basado en el entorno:

- **Development**: Monitoreo automático habilitado
- **Production**: Monitoreo manual (por rendimiento)
- **Testing**: Profiling deshabilitado

## 🚀 Uso Básico

### 1. Monitoreo Rápido

```bash
# Ver estadísticas actuales
npm run monitor

# Salida:
🔍 CRM Performance Quick Stats
────────────────────────────────────────
📊 Event Loop Lag: 2.45ms
💾 Memory Usage: 127.34MB
⚡ Process Uptime: 1234s

🔥 Top Performance Hotspots:
   1. OrderService.calculateTotal: 12.50ms avg
   2. DatabaseQuery.findOrders: 25.30ms avg
   3. PaymentService.processPayment: 45.20ms avg
```

### 2. Monitoreo en Tiempo Real

```bash
# Monitoreo continuo con actualización cada segundo
npm run monitor:watch

# Monitoreo por tiempo limitado
npm run monitor:watch -- --duration 60
```

### 3. Integración Programática

```typescript
import { performanceProfiler, measureAsync, profileFunction } from '@/lib/monitoring/performance-profiler'

// Medir función asíncrona
const result = await measureAsync('fetchOrders', async () => {
  return await orderService.getAllOrders()
})

// Decorator para profiling automático
class OrderService {
  @profileFunction
  async calculateTotal(items: OrderItem[]) {
    // Esta función será perfilada automáticamente
    return items.reduce((sum, item) => sum + item.price, 0)
  }
}

// Eventos de alertas
performanceProfiler.on('alert', (alert) => {
  console.log('Performance Alert:', alert.message)
  // Enviar a sistema de notificaciones
})
```

## 🛠️ Herramientas CLI

### Monitor Performance CLI

```bash
# Comandos disponibles
node scripts/monitor-performance-cli.js [command] [options]

# Comandos:
monitor    # Monitoreo en tiempo real
report     # Generar reporte de rendimiento  
stats      # Estadísticas rápidas
help       # Mostrar ayuda
```

### Opciones de Monitoreo

```bash
# Monitoreo por 30 segundos, actualizando cada 500ms
npm run monitor:watch -- --duration 30 --interval 500

# Monitoreo con reporte final
npm run monitor:watch -- --duration 60 --output final-report.txt

# Generar reporte JSON
npm run performance:analyze
```

### Ejemplos de Uso

```bash
# Análisis de rendimiento durante carga alta
npm run performance:profile

# Monitoreo durante deployment
npm run monitor:watch -- --duration 300 --output deployment-metrics.txt

# Reporte para debugging
npm run monitor:report -- --output debug-report.json --json
```

## 📊 Dashboard Web

### Integración en Next.js

```tsx
// app/admin/performance/page.tsx
import PerformanceDashboard from '@/components/dashboard/PerformanceDashboard'

export default function PerformancePage() {
  return (
    <div className="container mx-auto">
      <PerformanceDashboard />
    </div>
  )
}
```

### Características del Dashboard

- **📊 Métricas en Tiempo Real**: Event loop lag, memoria, CPU
- **👷 Worker Pool Status**: Utilización y cola de tareas  
- **🚨 Sistema de Alertas**: Notificaciones visuales de problemas
- **🔥 Hotspots Table**: Top funciones por tiempo de ejecución
- **📈 Historical Charts**: Gráficos de tendencias (próximamente)

## 📏 Métricas Monitoreadas

### Event Loop Metrics
- **Current Lag**: Retraso actual del event loop
- **Average Lag**: Promedio de los últimos 100 samples
- **P95 Lag**: Percentil 95 de latencia

### Memory Metrics  
- **Heap Used**: Memoria heap en uso
- **Heap Total**: Memoria heap total asignada
- **RSS**: Resident Set Size
- **External**: Memoria externa (buffers, etc.)
- **Heap Limit**: Límite máximo de heap

### Worker Pool Metrics
- **Total Workers**: Número total de workers
- **Busy Workers**: Workers ejecutando tareas
- **Queue Size**: Tareas en cola
- **Average Execution Time**: Tiempo promedio de ejecución
- **Average Queue Time**: Tiempo promedio en cola

### Performance Hotspots
- **Function Name**: Nombre de la función
- **Call Count**: Número de llamadas
- **Total Time**: Tiempo total consumido
- **Average Time**: Tiempo promedio por llamada

## 🚨 Alertas y Umbrales

### Configuración de Umbrales

```typescript
const profilerConfig = {
  eventLoopLagThreshold: 10,     // 10ms
  memoryThreshold: 512,          // 512MB
  cpuThreshold: 80,              // 80%
  gcThreshold: 50,               // 50MB/s
  sampleInterval: 1000           // 1 segundo
}
```

### Tipos de Alertas

#### Event Loop Lag
- **⚠️ Warning**: > 10ms
- **🔴 Critical**: > 50ms

#### Memory Usage  
- **⚠️ Warning**: > 512MB
- **🔴 Critical**: > 768MB

#### Task Execution
- **⚠️ Warning**: > 1000ms
- **🔴 Critical**: > 5000ms

#### Queue Wait Time
- **⚠️ Warning**: > 500ms
- **🔴 Critical**: > 2000ms

### Manejo de Alertas

```typescript
performanceProfiler.on('alert', (alert) => {
  switch(alert.severity) {
    case 'critical':
      // Enviar notificación inmediata
      await notificationService.sendCriticalAlert(alert)
      break
    case 'high':
      // Log y notificar al equipo
      logger.warn('Performance Alert:', alert)
      break
    case 'medium':
      // Solo logging
      logger.info('Performance Notice:', alert)
      break
  }
})
```

## 🔧 API de Profiling

### Decorators

```typescript
import { profileFunction } from '@/lib/monitoring/performance-profiler'

class ApiService {
  @profileFunction
  async processOrder(order: Order) {
    // Función será perfilada automáticamente
  }
}
```

### Manual Measurement

```typescript
import { measureAsync, measureSync } from '@/lib/monitoring/performance-profiler'

// Funciones asíncronas
const result = await measureAsync('database-query', async () => {
  return await db.orders.findMany()
})

// Funciones síncronas  
const calculated = measureSync('calculation', () => {
  return complexCalculation(data)
})
```

### Custom Metrics

```typescript
// Emitir métricas personalizadas
performanceProfiler.emit('measure', {
  name: 'custom-operation',
  duration: 150,
  metadata: { userId: 123 }
})
```

## 💡 Mejores Prácticas

### 1. Profiling en Desarrollo

```typescript
// Solo en desarrollo
if (process.env.NODE_ENV === 'development') {
  performanceProfiler.startMonitoring()
}
```

### 2. Instrumentación Selectiva

```typescript
// Perfilar solo operaciones críticas
class CriticalService {
  @profileFunction
  async criticalOperation() {
    // Operación crítica para el negocio
  }
  
  // Operación simple sin profiling
  async simpleOperation() {
    return 'simple'
  }
}
```

### 3. Manejo de Alertas

```typescript
// Configurar diferentes acciones por severidad
performanceProfiler.on('alert', async (alert) => {
  if (alert.type === 'memory_leak' && alert.severity === 'critical') {
    // Escalar memoria automáticamente
    await scaleService.increaseMemory()
  }
  
  if (alert.type === 'event_loop_lag') {
    // Reducir carga de trabajo
    await workloadManager.reduceLoad()
  }
})
```

### 4. Reportes Programados

```typescript
// Reporte diario automático
cron.schedule('0 8 * * *', () => {
  const report = performanceProfiler.generateReport()
  emailService.sendDailyReport(report)
})
```

## 🔧 Troubleshooting

### Problemas Comunes

#### High Event Loop Lag

```typescript
// Identificar código bloqueante
const hotspots = performanceProfiler.getHotspots()
console.log('Top slow functions:', hotspots.slice(0, 5))

// Solución: Usar workers para CPU-intensive tasks
await workerPool.executeTask('heavy-calculation', data)
```

#### Memory Leaks

```typescript
// Monitorear tendencia de memoria
const metrics = performanceProfiler.getMetricsHistory()
const memoryTrend = metrics.map(m => m.memoryUsage.heapUsed)

// Identificar si está creciendo consistentemente
const isLeaking = memoryTrend.slice(-10).every((val, i, arr) => 
  i === 0 || val > arr[i-1]
)
```

#### Worker Pool Bottlenecks

```typescript
const poolStats = workerPool.getDetailedStats()

if (poolStats.averageQueueTime > 1000) {
  console.log('Consider increasing worker pool size')
  // Aumentar pool dinámicamente
}

if (poolStats.averageExecutionTime > 5000) {
  console.log('Tasks are taking too long - optimize algorithms')
}
```

### Debugging Commands

```bash
# Análisis detallado por 5 minutos
npm run monitor:watch -- --duration 300 --interval 100

# Reporte completo con hotspots
npm run monitor:report -- --output detailed-analysis.json --json

# Profiling específico durante operación problemática
npm run performance:profile
```

### Performance Optimization

1. **Identify Hotspots**
   ```bash
   npm run monitor:report
   # Revisar la sección "Performance Hotspots"
   ```

2. **Optimize Critical Functions**
   ```typescript
   // Antes
   @profileFunction
   async slowFunction() {
     // Operación lenta identificada
   }
   
   // Después - optimizado
   async optimizedFunction() {
     // Versión optimizada
   }
   ```

3. **Scale Workers**
   ```typescript
   // Aumentar pool si es necesario
   const pool = workerPoolManager.getPool('heavy-tasks', 'script.js', {
     maxWorkers: 8  // Aumentado de 4
   })
   ```

## 📈 Roadmap

### Próximas Características

- **📊 Historical Charts**: Gráficos de tendencias en dashboard
- **🔍 Query Profiling**: Profiling específico de base de datos  
- **📱 Mobile Dashboard**: Dashboard responsive
- **🤖 Auto-scaling**: Escalado automático basado en métricas
- **📧 Email Alerts**: Notificaciones por email
- **☁️ Cloud Metrics**: Integración con servicios cloud

### Integrations Planificadas

- **Sentry**: Reportes de performance automáticos
- **DataDog**: Métricas en tiempo real
- **Grafana**: Dashboards avanzados
- **PagerDuty**: Alertas críticas

---

## 📞 Soporte

Para preguntas o problemas:

1. **Documentación**: Revisar esta guía completa
2. **Logs**: Verificar logs del performance profiler
3. **CLI Help**: `npm run monitor:help`
4. **Issues**: Crear issue en el repositorio

---

*Sistema de Monitoreo implementado el 16 de Noviembre, 2025*