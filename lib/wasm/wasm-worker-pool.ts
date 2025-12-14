/**
 * 🚀 WASM-enhanced Worker Pool
 * Extensión del WorkerPool existente para soportar WebAssembly
 * Compatible con el sistema existente - NO rompe funcionalidad
 */

import { WorkerPool, WorkerTask, WorkerResult, WorkerPoolOptions } from '../workers/worker-pool'
import path from 'node:path'

export interface WASMTask extends WorkerTask {
  isWASM?: boolean
  wasmModule?: string
  wasmFunction?: string
  wasmModuleUrl?: string
  wasmImports?: WebAssembly.Imports
}

export interface WASMResult extends WorkerResult {
  isWASM?: boolean
  memoryUsage?: number
  wasmExecutionTime?: number
}

class WASMWorkerPool extends WorkerPool {
  private readonly wasmCapableWorkers = new Set<string>()
  private readonly loadedModules = new Set<string>()
  private initPromise: Promise<void> | null = null

  constructor(scriptPath: string, options: WorkerPoolOptions = {}) {
    // Usar el script WASM worker
    const wasmWorkerPath = path.resolve(__dirname, 'wasm-worker-script.js')
    super(wasmWorkerPath, options)
    
    console.log('🧪 WASM Worker Pool initialized')
    // Defer async initialization - store promise for later await if needed
    this.initPromise = this.checkWorkersWASMCapability()
  }

  /**
   * Ensure async initialization is complete
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise
      this.initPromise = null
    }
  }

  /**
   * Verificar capacidades WASM de los workers
   */
  private async checkWorkersWASMCapability() {
    try {
      // WASMTask ID generated for capability check
      const _taskId = `wasm-capability-test-${Date.now()}`

      const result = await super.executeTask('wasm-capability-check', {})
      if (result.success) {
        console.log('✅ Workers have WASM capability')
      }
    } catch (error) {
      console.warn('⚠️ WASM capability check failed:', error)
    }
  }

  /**
   * Ejecutar función WASM en el worker pool
   */
  public async executeWASMFunction(
    moduleName: string,
    functionName: string,
    args: any[] = [],
    options: {
      priority?: number
      timeout?: number
      moduleUrl?: string
      imports?: WebAssembly.Imports
    } = {}
  ): Promise<WASMResult> {
    const wasmTask: WASMTask = {
      id: `wasm-${moduleName}-${functionName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'wasm-execution',
      data: {
        moduleName,
        functionName,
        args,
        moduleUrl: options.moduleUrl,
        imports: options.imports
      },
      priority: options.priority || 10, // Alta prioridad para WASM
      timeout: options.timeout || 60000,
      isWASM: true,
      wasmModule: moduleName,
      wasmFunction: functionName,
      wasmModuleUrl: options.moduleUrl,
      wasmImports: options.imports
    }

    try {
      const result = await super.executeTask(wasmTask.type, wasmTask.data, {
        priority: wasmTask.priority,
        timeout: wasmTask.timeout
      })

      return {
        ...result,
        isWASM: true
      } as WASMResult
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'WASM execution failed',
        isWASM: true
      }
    }
  }

  /**
   * Precargar módulo WASM en todos los workers
   */
  public async preloadWASMModule(
    moduleName: string,
    moduleUrl: string,
    imports?: WebAssembly.Imports
  ): Promise<boolean> {
    try {
      const preloadTask: WASMTask = {
        id: `wasm-preload-${moduleName}-${Date.now()}`,
        type: 'wasm-preload',
        data: {
          moduleName,
          moduleUrl,
          imports
        },
        isWASM: true
      }

      const result = await super.executeTask(preloadTask.type, preloadTask.data)
      
      if (result.success) {
        this.loadedModules.add(moduleName)
        console.log(`✅ WASM module '${moduleName}' preloaded in worker pool`)
        return true
      }
      
      return false
    } catch (error) {
      console.error(`❌ Failed to preload WASM module '${moduleName}':`, error)
      return false
    }
  }

  /**
   * Obtener estadísticas WASM del pool
   */
  public getWASMStats() {
    const baseStats = super.getStats()
    
    return {
      ...baseStats,
      wasmCapableWorkers: this.wasmCapableWorkers.size,
      loadedWASMModules: Array.from(this.loadedModules),
      wasmModuleCount: this.loadedModules.size
    }
  }

  /**
   * Ejecutar múltiples tareas WASM en paralelo
   */
  public async executeWASMBatch(
    tasks: Array<{
      moduleName: string
      functionName: string
      args: any[]
      priority?: number
    }>,
    options: { timeout?: number } = {}
  ): Promise<WASMResult[]> {
    const promises = tasks.map((task, index) => 
      this.executeWASMFunction(
        task.moduleName,
        task.functionName,
        task.args,
        {
          priority: task.priority || (10 - index), // Prioridad decreciente
          timeout: options.timeout
        }
      )
    )

    try {
      return await Promise.all(promises)
    } catch (error) {
      // Batch execution partially failed, returning partial results
      console.debug('WASM batch execution partial failure, collecting settled results:', error)
      const settledResults = await Promise.allSettled(promises)
      return settledResults.map(result => 
        result.status === 'fulfilled' 
          ? result.value 
          : {
              success: false,
              error: result.reason instanceof Error ? result.reason.message : 'Batch execution failed',
              isWASM: true
            }
      )
    }
  }
}

/**
 * Manager para pools WASM
 */
class WASMPoolManager {
  private readonly wasmPools = new Map<string, WASMWorkerPool>()

  public getWASMPool(
    name: string, 
    scriptPath?: string,
    options?: WorkerPoolOptions
  ): WASMWorkerPool {
    if (!this.wasmPools.has(name)) {
      const pool = new WASMWorkerPool(
        scriptPath || path.resolve(__dirname, 'wasm-worker-script.js'),
        options
      )
      this.wasmPools.set(name, pool)
    }
    return this.wasmPools.get(name)!
  }

  public async shutdownWASMPools() {
    const shutdownPromises = Array.from(this.wasmPools.values()).map(pool => pool.shutdown())
    await Promise.all(shutdownPromises)
    this.wasmPools.clear()
    console.log('🔄 All WASM pools shut down')
  }

  public getWASMPoolStats() {
    const stats: Record<string, any> = {}
    for (const [name, pool] of this.wasmPools.entries()) {
      stats[name] = pool.getWASMStats()
    }
    return stats
  }
}

// Singleton WASM pool manager
export const wasmPoolManager = new WASMPoolManager()

// Funciones de conveniencia para uso directo
export const wasmWorkerPool = {
  /**
   * Ejecutar función WASM usando el pool por defecto
   */
  async execute(
    moduleName: string,
    functionName: string,
    args: any[] = [],
    options: {
      poolName?: string
      priority?: number
      timeout?: number
      moduleUrl?: string
      imports?: WebAssembly.Imports
    } = {}
  ): Promise<WASMResult> {
    const pool = wasmPoolManager.getWASMPool(options.poolName || 'default')
    return pool.executeWASMFunction(moduleName, functionName, args, {
      priority: options.priority,
      timeout: options.timeout,
      moduleUrl: options.moduleUrl,
      imports: options.imports
    })
  },

  /**
   * Precargar módulo WASM
   */
  async preload(
    moduleName: string,
    moduleUrl: string,
    imports?: WebAssembly.Imports,
    poolName: string = 'default'
  ): Promise<boolean> {
    const pool = wasmPoolManager.getWASMPool(poolName)
    return pool.preloadWASMModule(moduleName, moduleUrl, imports)
  },

  /**
   * Obtener estadísticas
   */
  getStats(poolName: string = 'default') {
    const pool = wasmPoolManager.getWASMPool(poolName)
    return pool.getWASMStats()
  },

  /**
   * Ejecutar lote de tareas WASM
   */
  async executeBatch(
    tasks: Array<{
      moduleName: string
      functionName: string
      args: any[]
      priority?: number
    }>,
    options: { 
      poolName?: string
      timeout?: number 
    } = {}
  ): Promise<WASMResult[]> {
    const pool = wasmPoolManager.getWASMPool(options.poolName || 'default')
    return pool.executeWASMBatch(tasks, { timeout: options.timeout })
  }
}

// Graceful shutdown para WASM pools
process.on('SIGTERM', async () => {
  await wasmPoolManager.shutdownWASMPools()
})

process.on('SIGINT', async () => {
  await wasmPoolManager.shutdownWASMPools()
})

export { WASMWorkerPool, WASMPoolManager }
export default wasmWorkerPool