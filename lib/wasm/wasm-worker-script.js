/**
 * 🚀 WASM Worker Script
 * Script ejecutado en worker threads para tareas WebAssembly
 * Compatible con worker-pool existente
 */

const { isMainThread, parentPort, workerData } = require('worker_threads')

if (!isMainThread && parentPort) {
  let wasmManager = null

  // Lazy load del WASM manager
  const getWASMManager = async () => {
    if (!wasmManager) {
      try {
        const wasmModule = await import('../wasm/wasm-manager.js')
        wasmManager = wasmModule.wasmManager
      } catch (error) {
        console.error('Failed to load WASM manager in worker:', error)
        throw error
      }
    }
    return wasmManager
  }

  // Verificar soporte WASM
  const checkWASMSupport = () => {
    return typeof WebAssembly !== 'undefined' && 
           typeof WebAssembly.compile === 'function'
  }

  // Procesar tarea WASM
  const processWASMTask = async (task) => {
    const startTime = Date.now()

    try {
      // Task de verificación de capacidades
      if (task.type === 'wasm-capability-check') {
        return {
          success: true,
          data: { 
            wasmSupported: checkWASMSupport(),
            features: {
              streaming: typeof WebAssembly.compileStreaming === 'function',
              threads: typeof SharedArrayBuffer !== 'undefined'
            }
          },
          executionTime: Date.now() - startTime
        }
      }

      // Task de precarga de módulo
      if (task.type === 'wasm-preload') {
        const { moduleName, moduleUrl, imports } = task.data
        const wasmMgr = await getWASMManager()
        
        await wasmMgr.loadModule(moduleName, moduleUrl, imports)
        
        return {
          success: true,
          data: { message: `Module ${moduleName} preloaded` },
          executionTime: Date.now() - startTime
        }
      }

      // Task de ejecución WASM
      if (task.type === 'wasm-execution') {
        const { moduleName, functionName, args, moduleUrl, imports } = task.data
        const wasmMgr = await getWASMManager()

        // Cargar módulo si es necesario
        if (!wasmMgr.getModule(moduleName)?.loaded && moduleUrl) {
          await wasmMgr.loadModule(moduleName, moduleUrl, imports)
        }

        // Ejecutar función
        const result = await wasmMgr.executeFunction(
          moduleName,
          functionName,
          args || []
        )

        return {
          success: result.success,
          data: result.data,
          error: result.error,
          executionTime: result.executionTime,
          memoryUsage: result.memoryUsage
        }
      }

      // Task regular (fallback para compatibilidad)
      return processRegularTask(task)

    } catch (error) {
      return {
        success: false,
        error: error.message || 'WASM worker error',
        executionTime: Date.now() - startTime
      }
    }
  }

  // Procesar tarea regular (para compatibilidad con worker pool existente)
  const processRegularTask = (task) => {
    const startTime = Date.now()

    try {
      // Simular procesamiento de tareas regulares
      switch (task.type) {
        case 'cpu-intensive-calc':
          return processCPUIntensiveTask(task.data)
        
        case 'data-processing':
          return processDataTask(task.data)
        
        case 'image-processing':
          return processImageTask(task.data)
        
        default:
          return {
            success: true,
            data: `Task ${task.type} processed successfully`,
            executionTime: Date.now() - startTime
          }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Regular task error',
        executionTime: Date.now() - startTime
      }
    }
  }

  // Ejemplo de tarea CPU intensiva (JavaScript fallback)
  const processCPUIntensiveTask = (data) => {
    const startTime = Date.now()
    
    // Ejemplo: Cálculo de números primos
    const { limit = 10000 } = data
    const primes = []
    
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

    return {
      success: true,
      data: { 
        primes: primes.slice(-10), // Solo los últimos 10
        count: primes.length,
        limit 
      },
      executionTime: Date.now() - startTime
    }
  }

  // Ejemplo de procesamiento de datos
  const processDataTask = (data) => {
    const startTime = Date.now()
    
    const { numbers = [] } = data
    const result = {
      sum: numbers.reduce((a, b) => a + b, 0),
      average: numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0,
      max: Math.max(...numbers),
      min: Math.min(...numbers),
      count: numbers.length
    }

    return {
      success: true,
      data: result,
      executionTime: Date.now() - startTime
    }
  }

  // Ejemplo de procesamiento básico de imágenes
  const processImageTask = (data) => {
    const startTime = Date.now()
    
    // Simular procesamiento de imagen
    const { width = 100, height = 100, operation = 'resize' } = data
    
    // Aquí iría la lógica real de procesamiento de imagen
    // Para este ejemplo, solo simulamos
    const result = {
      width,
      height,
      operation,
      processed: true,
      pixelCount: width * height
    }

    return {
      success: true,
      data: result,
      executionTime: Date.now() - startTime
    }
  }

  // Manejar mensajes del hilo principal
  parentPort.on('message', async (task) => {
    try {
      let result

      // Determinar tipo de procesamiento
      if (task.type?.startsWith('wasm-') || task.isWASM) {
        result = await processWASMTask(task)
      } else {
        result = processRegularTask(task)
      }

      // Enviar resultado de vuelta
      parentPort.postMessage(result)

    } catch (error) {
      // Error crítico en el worker
      parentPort.postMessage({
        success: false,
        error: `Worker critical error: ${error.message}`,
        executionTime: 0
      })
    }
  })

  // Manejar errores no capturados
  process.on('uncaughtException', (error) => {
    parentPort.postMessage({
      success: false,
      error: `Uncaught exception: ${error.message}`,
      executionTime: 0
    })
  })

  process.on('unhandledRejection', (reason, promise) => {
    parentPort.postMessage({
      success: false,
      error: `Unhandled rejection: ${reason}`,
      executionTime: 0
    })
  })

  // Señal de que el worker está listo
  parentPort.postMessage({
    type: 'worker-ready',
    wasmSupported: checkWASMSupport(),
    pid: process.pid
  })
}

module.exports = {
  // Exportar para testing si es necesario
  checkWASMSupport: typeof checkWASMSupport !== 'undefined' ? checkWASMSupport : () => false
}