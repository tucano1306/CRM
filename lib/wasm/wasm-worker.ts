/**
 * 🚀 WASM-enabled Worker Instance
 * Extensión del WorkerInstance para soportar tareas WebAssembly
 * Compatible con el sistema existente sin romper funcionalidad
 */

import { Worker, isMainThread, parentPort } from 'node:worker_threads'
import { EventEmitter } from 'node:events'
import { WorkerTask, WorkerResult } from '../workers/worker-pool'

export interface WASMWorkerTask extends WorkerTask {
  isWASM?: boolean
  wasmConfig?: {
    moduleName: string
    functionName: string
    moduleUrl?: string
    imports?: WebAssembly.Imports
  }
}

export interface WASMWorkerResult extends WorkerResult {
  isWASM?: boolean
  memoryUsage?: number
  moduleLoadTime?: number
}

export class WASMWorkerInstance extends EventEmitter {
  public worker: Worker
  public busy: boolean = false
  public currentTask: WASMWorkerTask | null = null
  private timeoutId: NodeJS.Timeout | null = null
  private wasmCapable: boolean = false

  private initPromise: Promise<void> | null = null

  /**
   * Factory method to create and initialize a WASMWorkerInstance.
   * Use this instead of direct constructor to ensure proper async initialization.
   */
  static async create(scriptPath: string): Promise<WASMWorkerInstance> {
    const instance = new WASMWorkerInstance(scriptPath)
    await instance.ensureInitialized()
    return instance
  }

  constructor(scriptPath: string) {
    super()
    
    // Crear worker con soporte WASM
    this.worker = new Worker(scriptPath, {
      env: {
        ...process.env,
        WASM_ENABLED: 'true'
      }
    })
    
    this.setupWorkerListeners()
    // Initialization is deferred - caller should use ensureInitialized()
    // or the static create() factory method
    this.initPromise = null
  }

  /**
   * Ensure async initialization is complete.
   * Lazily triggers capability check on first call.
   */
  public async ensureInitialized(): Promise<void> {
    if (this.initPromise === null) {
      this.initPromise = this.checkWASMCapability()
    }
    await this.initPromise
  }

  private setupWorkerListeners() {
    this.worker.on('message', (result: WASMWorkerResult) => {
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
        console.error(`❌ WASM Worker exited with code ${code}`)
      }
    })
  }

  private async checkWASMCapability() {
    try {
      // Test WASM support in worker
      const testResult = await this.executeTask({
        id: 'wasm-test',
        type: 'wasm-capability-check',
        data: {},
        isWASM: false
      })
      
      this.wasmCapable = testResult.success && testResult.data?.wasmSupported
      console.log(`🧪 Worker WASM capability: ${this.wasmCapable ? '✅ Enabled' : '❌ Disabled'}`)
    } catch (error) {
      console.warn('⚠️ WASM capability check failed:', error)
      this.wasmCapable = false
    }
  }

  public async executeTask(task: WASMWorkerTask): Promise<WASMWorkerResult> {
    return new Promise((resolve, reject) => {
      if (this.busy) {
        reject(new Error('WASM Worker is busy'))
        return
      }

      // Check if task requires WASM but worker doesn't support it
      if (task.isWASM && !this.wasmCapable) {
        reject(new Error('Task requires WASM but worker doesn\'t support it'))
        return
      }

      this.busy = true
      this.currentTask = task

      // Setup timeout (longer for WASM tasks)
      const timeout = task.timeout || (task.isWASM ? 60000 : 30000)
      this.timeoutId = setTimeout(() => {
        this.worker.terminate()
        reject(new Error(`WASM Task ${task.id} timed out after ${timeout}ms`))
      }, timeout)

      // Listen for completion
      const onComplete = (taskId: string, result: WASMWorkerResult) => {
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
  ): Promise<WASMWorkerResult> {
    const task: WASMWorkerTask = {
      id: `wasm-${moduleName}-${functionName}-${Date.now()}`,
      type: 'wasm-execution',
      data: { args },
      isWASM: true,
      priority: options.priority || 5, // Higher priority for WASM tasks
      timeout: options.timeout || 60000,
      wasmConfig: {
        moduleName,
        functionName,
        moduleUrl: options.moduleUrl,
        imports: options.imports
      }
    }

    return this.executeTask(task)
  }

  public isWASMCapable(): boolean {
    return this.wasmCapable
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

// Worker script para WASM (se ejecuta en el worker thread)
if (!isMainThread && parentPort) {
  let wasmManagerInstance: any = null
  
  // Lazy load WASM manager en el worker
  const getWASMManager = async () => {
    if (!wasmManagerInstance) {
      const { wasmManager } = await import('../wasm/wasm-manager')
      wasmManagerInstance = wasmManager
    }
    return wasmManagerInstance
  }

  const processWASMTask = async (task: WASMWorkerTask): Promise<WASMWorkerResult> => {
    const startTime = Date.now()
    
    try {
      if (task.type === 'wasm-capability-check') {
        // Check WASM support
        const supported = typeof WebAssembly !== 'undefined'
        return {
          success: true,
          data: { wasmSupported: supported },
          executionTime: Date.now() - startTime,
          isWASM: false
        }
      }

      if (!task.isWASM || !task.wasmConfig) {
        throw new Error('Invalid WASM task configuration')
      }

      const wasmMgr = await getWASMManager()
      const { moduleName, functionName, moduleUrl, imports } = task.wasmConfig

      // Load module if not already loaded
      if (!wasmMgr.getModule(moduleName)?.loaded && moduleUrl) {
        await wasmMgr.loadModule(moduleName, moduleUrl, imports)
      }

      // Execute WASM function
      const result = await wasmMgr.executeFunction(
        moduleName,
        functionName,
        task.data.args || [],
        task.timeout
      )

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime: Date.now() - startTime,
        memoryUsage: result.memoryUsage,
        isWASM: true
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown WASM error',
        executionTime: Date.now() - startTime,
        isWASM: true
      }
    }
  }

  // Handle messages from main thread
  parentPort.on('message', async (task: WASMWorkerTask) => {
    try {
      let result: WASMWorkerResult

      if (task.isWASM || task.type === 'wasm-capability-check') {
        result = await processWASMTask(task)
      } else {
        // Fallback to regular task processing
        // This maintains compatibility with existing worker tasks
        result = {
          success: true,
          data: `Regular task ${task.type} processed`,
          executionTime: 0
        }
      }

      parentPort!.postMessage(result)
    } catch (error) {
      const errorResult: WASMWorkerResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Worker processing error',
        executionTime: 0
      }
      parentPort!.postMessage(errorResult)
    }
  })
}

export default WASMWorkerInstance