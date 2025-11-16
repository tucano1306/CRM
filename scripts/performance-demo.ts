/**
 * 🎯 Performance Monitoring Demo
 * Demostración del sistema de monitoreo de rendimiento
 */

import { performanceProfiler, measureAsync, measureSync, profileFunction } from '../lib/monitoring/performance-profiler'
import { workerPoolManager } from '../lib/workers/worker-pool'

class DemoService {
  async simulateSlowDatabaseQuery(delay: number = 100): Promise<any[]> {
    // Simula una consulta lenta a base de datos
    const start = performance.now()
    await new Promise(resolve => setTimeout(resolve, delay))
    const duration = performance.now() - start
    
    // Emit manual measurement
    performanceProfiler.emit('measure', { 
      name: 'DemoService.simulateSlowDatabaseQuery', 
      duration 
    })
    
    return Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }))
  }

  async simulateMemoryIntensiveOperation(): Promise<number[]> {
    // Simula operación que consume mucha memoria
    const start = performance.now()
    const data = Array.from({ length: 100000 }, (_, i) => Math.random() * i)
    const result = data.sort((a, b) => b - a)
    const duration = performance.now() - start
    
    // Emit manual measurement
    performanceProfiler.emit('measure', { 
      name: 'DemoService.simulateMemoryIntensiveOperation', 
      duration 
    })
    
    return result
  }

  calculatePrimes(limit: number): number[] {
    // Algoritmo CPU-intensivo para generar números primos
    const start = performance.now()
    const primes: number[] = []
    for (let num = 2; num <= limit; num++) {
      let isPrime = true
      for (let i = 2; i <= Math.sqrt(num); i++) {
        if (num % i === 0) {
          isPrime = false
          break
        }
      }
      if (isPrime) primes.push(num)
    }
    const duration = performance.now() - start
    
    // Emit manual measurement
    performanceProfiler.emit('measure', { 
      name: 'DemoService.calculatePrimes', 
      duration 
    })
    
    return primes
  }
}

async function runPerformanceDemo() {
  console.log('🚀 Starting Performance Monitoring Demo')
  console.log('==========================================')

  // Inicializar el profiler
  performanceProfiler.startMonitoring()

  // Configurar listeners para alertas
  performanceProfiler.on('alert', (alert) => {
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`)
  })

  const demoService = new DemoService()

  console.log('\n📊 Initial Metrics:')
  console.log(performanceProfiler.generateReport())

  console.log('\n🔄 Running demo operations...')

  try {
    // 1. Operaciones rápidas (no deberían generar alertas)
    console.log('\n1️⃣ Fast database queries...')
    for (let i = 0; i < 5; i++) {
      await demoService.simulateSlowDatabaseQuery(50) // 50ms cada una
    }

    // 2. Operaciones lentas (pueden generar alertas)
    console.log('\n2️⃣ Slow database queries...')
    for (let i = 0; i < 3; i++) {
      await demoService.simulateSlowDatabaseQuery(800) // 800ms cada una
    }

    // 3. Operación CPU-intensiva
    console.log('\n3️⃣ CPU-intensive calculations...')
    const primes1 = await measureAsync('calculatePrimes-1000', async () => {
      return demoService.calculatePrimes(1000)
    })
    console.log(`   Found ${primes1.length} primes up to 1000`)

    const primes2 = await measureAsync('calculatePrimes-5000', async () => {
      return demoService.calculatePrimes(5000)
    })
    console.log(`   Found ${primes2.length} primes up to 5000`)

    // 4. Operaciones de memoria
    console.log('\n4️⃣ Memory-intensive operations...')
    await demoService.simulateMemoryIntensiveOperation()
    await demoService.simulateMemoryIntensiveOperation()

    // 5. Simulación de Event Loop bloqueante
    console.log('\n5️⃣ Simulating blocking operations...')
    measureSync('blocking-operation', () => {
      // Operación síncrona que bloquea el event loop
      const start = Date.now()
      while (Date.now() - start < 100) {
        // Busy wait por 100ms
      }
      return 'completed'
    })

    // 6. Usar Worker Pool si está disponible
    console.log('\n6️⃣ Testing Worker Pool...')
    try {
      const workerPool = workerPoolManager.getPool('demo', 'lib/workers/worker-script.js', {
        enableProfiling: true
      })
      
      console.log('   Worker pool stats:', workerPool.getDetailedStats())
    } catch (error) {
      console.log('   Worker pool not available:', error instanceof Error ? error.message : 'Unknown error')
    }

    // Esperar un poco para que se acumulen métricas
    console.log('\n⏳ Waiting for metrics to accumulate...')
    await new Promise(resolve => setTimeout(resolve, 3000))

  } catch (error) {
    console.error('❌ Error during demo:', error)
  }

  // Mostrar métricas finales
  console.log('\n📈 Final Performance Report:')
  console.log('==========================================')
  console.log(performanceProfiler.generateReport())

  // Mostrar hotspots
  console.log('\n🔥 Performance Hotspots:')
  const hotspots = performanceProfiler.getHotspots()
  hotspots.slice(0, 10).forEach((hotspot, index) => {
    console.log(`   ${index + 1}. ${hotspot.name}`)
    console.log(`      Calls: ${hotspot.count}, Avg: ${hotspot.avgTime.toFixed(2)}ms, Total: ${hotspot.totalTime.toFixed(2)}ms`)
  })

  // Mostrar estadísticas del event loop
  console.log('\n⚡ Event Loop Statistics:')
  const eventLoopStats = performanceProfiler.getEventLoopStats()
  console.log(`   Current Lag: ${eventLoopStats.currentLag.toFixed(2)}ms`)
  console.log(`   Average Lag: ${eventLoopStats.averageLag.toFixed(2)}ms`)
  console.log(`   P95 Lag: ${eventLoopStats.p95Lag.toFixed(2)}ms`)

  // Mostrar estadísticas de GC
  console.log('\n🗑️ Garbage Collection Statistics:')
  const gcStats = performanceProfiler.getGCStats()
  console.log(`   Collections: ${gcStats.collections}`)
  console.log(`   Total GC Time: ${gcStats.totalTime.toFixed(2)}ms`)
  console.log(`   Memory Freed: ${(gcStats.totalFreed / 1024 / 1024).toFixed(2)}MB`)

  console.log('\n✅ Demo completed successfully!')
  console.log('\n💡 Try running the CLI tools:')
  console.log('   npm run monitor              # Quick stats')
  console.log('   npm run monitor:watch        # Real-time monitoring')
  console.log('   npm run performance:profile  # 60-second profile')

  // Detener el profiler
  performanceProfiler.stopMonitoring()
}

// Ejecutar demo si el script se ejecuta directamente
if (require.main === module) {
  runPerformanceDemo().catch(console.error)
}

export { runPerformanceDemo, DemoService }