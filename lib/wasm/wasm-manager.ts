/**
 * 🚀 WebAssembly Manager
 * Sistema de gestión de módulos WASM para tareas CPU-intensivas
 */

export interface WASMModule {
  name: string
  module: WebAssembly.Module | null
  instance: WebAssembly.Instance | null
  exports: any
  loaded: boolean
  loadTime?: number
}

export interface WASMTask {
  id: string
  moduleName: string
  functionName: string
  args: any[]
  timeout?: number
}

export interface WASMResult {
  success: boolean
  data?: any
  error?: string
  executionTime: number
  memoryUsage?: number
}

export interface WASMPerformanceStats {
  totalExecutions: number
  averageExecutionTime: number
  totalMemoryAllocated: number
  successRate: number
  moduleStats: Map<string, {
    executions: number
    averageTime: number
    errors: number
  }>
}

class WASMManager {
  private readonly modules = new Map<string, WASMModule>()
  private readonly executionStats = new Map<string, number[]>()
  private performanceStats: WASMPerformanceStats = {
    totalExecutions: 0,
    averageExecutionTime: 0,
    totalMemoryAllocated: 0,
    successRate: 0,
    moduleStats: new Map()
  }

  /**
   * Cargar módulo WASM desde URL o ArrayBuffer
   */
  public async loadModule(
    name: string,
    source: string | ArrayBuffer,
    imports?: WebAssembly.Imports
  ): Promise<WASMModule> {
    const startTime = Date.now()
    
    try {
      let wasmBytes: ArrayBuffer

      if (typeof source === 'string') {
        if (typeof globalThis.window !== 'undefined') {
          // Browser environment
          const response = await fetch(source)
          if (!response.ok) {
            throw new Error(`Failed to fetch WASM module: ${response.statusText}`)
          }
          wasmBytes = await response.arrayBuffer()
        } else {
          // Node.js environment
          const fs = await import('node:fs')
          const path = await import('node:path')
          const fullPath = path.resolve(process.cwd(), source)
          wasmBytes = fs.readFileSync(fullPath).buffer
        }
      } else {
        wasmBytes = source
      }

      const wasmModule = await WebAssembly.compile(wasmBytes)
      const instance = await WebAssembly.instantiate(wasmModule, imports || {})

      const moduleData: WASMModule = {
        name,
        module: wasmModule,
        instance,
        exports: instance.exports,
        loaded: true,
        loadTime: Date.now() - startTime
      }

      this.modules.set(name, moduleData)
      
      console.log(`✅ WASM module '${name}' loaded in ${moduleData.loadTime}ms`)
      return moduleData
    } catch (error) {
      const wasmModule: WASMModule = {
        name,
        module: null,
        instance: null,
        exports: null,
        loaded: false
      }
      
      this.modules.set(name, wasmModule)
      console.error(`❌ Failed to load WASM module '${name}':`, error)
      throw error
    }
  }

  /**
   * Ejecutar función WASM
   */
  public async executeFunction(
    moduleName: string,
    functionName: string,
    args: any[] = [],
    timeout: number = 30000
  ): Promise<WASMResult> {
    const startTime = Date.now()
    
    try {
      const wasmModule = this.modules.get(moduleName)
      if (!wasmModule || !wasmModule.loaded) {
        throw new Error(`WASM module '${moduleName}' not loaded`)
      }

      if (!wasmModule.exports[functionName]) {
        throw new Error(`Function '${functionName}' not found in module '${moduleName}'`)
      }

      // Execute with timeout
      const result = await Promise.race([
        this.executeWithMemoryTracking(wasmModule, functionName, args),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`WASM execution timeout after ${timeout}ms`)), timeout)
        )
      ]) as { result: any, memoryUsage: number }

      const executionTime = Date.now() - startTime
      this.updateStats(moduleName, executionTime, true)

      return {
        success: true,
        data: result.result,
        executionTime,
        memoryUsage: result.memoryUsage
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      this.updateStats(moduleName, executionTime, false)
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown WASM error',
        executionTime
      }
    }
  }

  /**
   * Ejecutar función con tracking de memoria
   */
  private async executeWithMemoryTracking(
    module: WASMModule,
    functionName: string,
    args: any[]
  ): Promise<{ result: any, memoryUsage: number }> {
    const memoryBefore = this.getMemoryUsage(module)
    
    const result = module.exports[functionName](...args)
    
    const memoryAfter = this.getMemoryUsage(module)
    const memoryUsage = memoryAfter - memoryBefore

    return { result, memoryUsage }
  }

  /**
   * Obtener uso actual de memoria del módulo
   */
  private getMemoryUsage(module: WASMModule): number {
    if (module.exports.memory && module.exports.memory instanceof WebAssembly.Memory) {
      return module.exports.memory.buffer.byteLength
    }
    return 0
  }

  /**
   * Actualizar estadísticas de rendimiento
   */
  private updateStats(moduleName: string, executionTime: number, success: boolean) {
    // Update global stats
    this.performanceStats.totalExecutions++
    
    if (!this.executionStats.has(moduleName)) {
      this.executionStats.set(moduleName, [])
    }
    
    const times = this.executionStats.get(moduleName)!
    times.push(executionTime)
    
    // Keep only last 1000 executions per module
    if (times.length > 1000) {
      times.shift()
    }

    // Update module stats
    if (!this.performanceStats.moduleStats.has(moduleName)) {
      this.performanceStats.moduleStats.set(moduleName, {
        executions: 0,
        averageTime: 0,
        errors: 0
      })
    }

    const moduleStats = this.performanceStats.moduleStats.get(moduleName)!
    moduleStats.executions++
    moduleStats.averageTime = times.reduce((a, b) => a + b, 0) / times.length
    
    if (!success) {
      moduleStats.errors++
    }

    // Update global averages
    const allTimes = Array.from(this.executionStats.values()).flat()
    this.performanceStats.averageExecutionTime = 
      allTimes.reduce((a, b) => a + b, 0) / allTimes.length

    const totalSuccess = Array.from(this.performanceStats.moduleStats.values())
      .reduce((acc, stats) => acc + (stats.executions - stats.errors), 0)
    
    this.performanceStats.successRate = 
      totalSuccess / this.performanceStats.totalExecutions
  }

  /**
   * Obtener información de un módulo
   */
  public getModule(name: string): WASMModule | undefined {
    return this.modules.get(name)
  }

  /**
   * Listar todos los módulos cargados
   */
  public getLoadedModules(): string[] {
    return Array.from(this.modules.keys()).filter(name => 
      this.modules.get(name)?.loaded
    )
  }

  /**
   * Obtener estadísticas de rendimiento
   */
  public getPerformanceStats(): WASMPerformanceStats {
    return { ...this.performanceStats }
  }

  /**
   * Limpiar estadísticas
   */
  public clearStats() {
    this.executionStats.clear()
    this.performanceStats = {
      totalExecutions: 0,
      averageExecutionTime: 0,
      totalMemoryAllocated: 0,
      successRate: 0,
      moduleStats: new Map()
    }
  }

  /**
   * Descargar módulo de memoria
   */
  public unloadModule(name: string): boolean {
    const wasmModule = this.modules.get(name)
    if (wasmModule) {
      this.modules.delete(name)
      this.executionStats.delete(name)
      this.performanceStats.moduleStats.delete(name)
      console.log(`🗑️ WASM module '${name}' unloaded`)
      return true
    }
    return false
  }

  /**
   * Verificar si WASM está soportado
   */
  public static isSupported(): boolean {
    return typeof WebAssembly !== 'undefined' && 
           typeof WebAssembly.compile === 'function'
  }

  /**
   * Obtener información del entorno WASM
   */
  public static getEnvironmentInfo(): {
    supported: boolean
    hasStreaming: boolean
    hasThreads: boolean
    hasSIMD: boolean
  } {
    const supported = WASMManager.isSupported()
    
    return {
      supported,
      hasStreaming: supported && typeof WebAssembly.compileStreaming === 'function',
      hasThreads: supported && typeof SharedArrayBuffer !== 'undefined',
      hasSIMD: supported && (() => {
        try {
          return WebAssembly.validate(new Uint8Array([
            0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
            0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00,
            0x41, 0x00, 0xfd, 0x0f, 0x0b
          ]))
        } catch {
          return false
        }
      })()
    }
  }
}

// Singleton instance
export const wasmManager = new WASMManager()

// Export types and utilities
export { WASMManager }
export default wasmManager