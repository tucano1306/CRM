/**
 * 🚀 useWASM Hook
 * Hook de React para integración sencilla con WebAssembly
 * Compatible con el sistema existente
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { wasmManager } from '@/lib/wasm/wasm-manager'
import { wasmWorkerPool } from '@/lib/wasm/wasm-worker-pool'
import { mathWASM } from '@/lib/wasm/modules/math-wasm'
import { imageWASM } from '@/lib/wasm/modules/image-wasm'
import { dataAnalysisWASM } from '@/lib/wasm/modules/data-analysis-wasm'

export interface WASMHookState {
  isLoading: boolean
  isSupported: boolean
  error: string | null
  loadedModules: string[]
  executionStats: {
    totalExecutions: number
    averageTime: number
    successRate: number
  }
}

export interface WASMHookOptions {
  autoLoadModules?: string[]
  enableWorkerPool?: boolean
  maxRetries?: number
  timeout?: number
}

export interface WASMExecutionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  executionTime: number
  fromCache?: boolean
}

/**
 * Hook principal para usar WASM en componentes React
 */
export function useWASM(options: WASMHookOptions = {}) {
  const {
    autoLoadModules = [],
    enableWorkerPool = true,
    maxRetries = 3,
    timeout = 30000
  } = options

  const [state, setState] = useState<WASMHookState>({
    isLoading: true,
    isSupported: false,
    error: null,
    loadedModules: [],
    executionStats: {
      totalExecutions: 0,
      averageTime: 0,
      successRate: 0
    }
  })

  const cache = useRef(new Map<string, any>())
  const executionHistory = useRef<number[]>([])

  // Inicialización
  useEffect(() => {
    initializeWASM()
  }, [])

  const initializeWASM = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Verificar soporte WASM
      const supported = typeof WebAssembly !== 'undefined'
      if (!supported) {
        throw new Error('WebAssembly is not supported in this browser')
      }

      // Cargar módulos automáticamente
      const loadPromises = autoLoadModules.map(async (moduleName) => {
        switch (moduleName.toLowerCase()) {
          case 'math':
            return mathWASM.initialize()
          case 'image':
            return imageWASM.initialize()
          case 'data':
            return dataAnalysisWASM.initialize()
          default:
            console.warn(`Unknown module: ${moduleName}`)
            return false
        }
      })

      await Promise.all(loadPromises)

      // Obtener módulos cargados
      const loadedModules = wasmManager.getLoadedModules()

      const perfStats = wasmManager.getPerformanceStats()
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isSupported: true,
        loadedModules,
        executionStats: {
          totalExecutions: perfStats.totalExecutions,
          averageTime: perfStats.averageExecutionTime,
          successRate: perfStats.successRate
        }
      }))

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'WASM initialization failed'
      }))
    }
  }

  /**
   * Ejecutar función WASM con caché automático
   */
  const execute = useCallback(async <T = any>(
    moduleName: string,
    functionName: string,
    args: any[] = [],
    options: {
      useCache?: boolean
      cacheKey?: string
      priority?: number
      useWorkerPool?: boolean
    } = {}
  ): Promise<WASMExecutionResult<T>> => {
    const {
      useCache = true,
      cacheKey = `${moduleName}-${functionName}-${JSON.stringify(args)}`,
      priority = 5,
      useWorkerPool: useWorker = enableWorkerPool
    } = options

    const startTime = Date.now()

    try {
      // Verificar caché si está habilitado
      if (useCache && cache.current.has(cacheKey)) {
        return {
          success: true,
          data: cache.current.get(cacheKey),
          executionTime: 0,
          fromCache: true
        }
      }

      let result

      if (useWorker) {
        // Ejecutar en worker pool
        result = await wasmWorkerPool.execute(
          moduleName,
          functionName,
          args,
          { priority, timeout }
        )
      } else {
        // Ejecutar directamente
        result = await wasmManager.executeFunction(
          moduleName,
          functionName,
          args,
          timeout
        )
      }

      const executionTime = Date.now() - startTime

      // Actualizar estadísticas
      executionHistory.current.push(executionTime)
      if (executionHistory.current.length > 100) {
        executionHistory.current.shift()
      }

      // Guardar en caché si fue exitoso
      if (result.success && useCache) {
        cache.current.set(cacheKey, result.data)
      }

      // Actualizar estado
      setState(prev => ({
        ...prev,
        executionStats: {
          totalExecutions: prev.executionStats.totalExecutions + 1,
          averageTime: executionHistory.current.reduce((a, b) => a + b, 0) / executionHistory.current.length,
          successRate: result.success 
            ? (prev.executionStats.successRate * prev.executionStats.totalExecutions + 1) / (prev.executionStats.totalExecutions + 1)
            : (prev.executionStats.successRate * prev.executionStats.totalExecutions) / (prev.executionStats.totalExecutions + 1)
        }
      }))

      return {
        success: result.success,
        data: result.data,
        error: result.error,
        executionTime,
        fromCache: false
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'WASM execution failed',
        executionTime,
        fromCache: false
      }
    }
  }, [enableWorkerPool, timeout])

  /**
   * Cargar módulo WASM dinámicamente
   */
  const loadModule = useCallback(async (
    moduleName: string,
    moduleUrl: string,
    imports?: WebAssembly.Imports
  ) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))
      
      await wasmManager.loadModule(moduleName, moduleUrl, imports)
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        loadedModules: [...prev.loadedModules, moduleName]
      }))

      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Module loading failed'
      }))
      return false
    }
  }, [])

  /**
   * Limpiar caché
   */
  const clearCache = useCallback(() => {
    cache.current.clear()
  }, [])

  /**
   * Reinicializar WASM
   */
  const reinitialize = useCallback(() => {
    cache.current.clear()
    executionHistory.current = []
    initializeWASM()
  }, [])

  return {
    // Estado
    ...state,
    
    // Funciones principales
    execute,
    loadModule,
    
    // Utilidades
    clearCache,
    reinitialize,
    
    // Información del sistema
    getEnvironmentInfo: () => {
      const { wasmManager: WASMManager } = require('@/lib/wasm/wasm-manager')
      return WASMManager.getEnvironmentInfo()
    },
    
    // Acceso directo a módulos especializados
    math: {
      calculatePrimes: (limit: number) => execute('math', 'calculatePrimes', [limit]),
      calculateStats: (numbers: number[]) => execute('math', 'calculateStats', [numbers]),
      calculateCompoundInterest: (principal: number, rate: number, time: number, frequency?: number) => 
        execute('math', 'calculateCompoundInterest', [principal, rate, time, frequency]),
      calculateMovingAverage: (values: number[], window: number) => 
        execute('math', 'calculateMovingAverage', [values, window])
    },
    
    image: {
      applyGrayscale: (imageData: ImageData) => execute('image', 'applyGrayscale', [imageData]),
      applyBlur: (imageData: ImageData, radius: number) => execute('image', 'applyBlur', [imageData, radius]),
      resize: (imageData: ImageData, width: number, height: number) => 
        execute('image', 'resize', [imageData, width, height]),
      adjustBrightness: (imageData: ImageData, factor: number) => 
        execute('image', 'adjustBrightness', [imageData, factor]),
      calculateAverageColor: (imageData: ImageData) => execute('image', 'calculateAverageColor', [imageData])
    },
    
    data: {
      analyzeDataset: (data: number[]) => execute('data', 'analyzeDataset', [data]),
      calculateCorrelation: (x: number[], y: number[]) => execute('data', 'calculateCorrelation', [x, y]),
      linearRegression: (x: number[], y: number[]) => execute('data', 'linearRegression', [x, y]),
      kMeansClustering: (data: number[], k: number, maxIterations?: number) => 
        execute('data', 'kMeansClustering', [data, k, maxIterations])
    }
  }
}

/**
 * Hook especializado para matemáticas
 */
export function useMathWASM() {
  const { isLoading, isSupported, error, math } = useWASM({ 
    autoLoadModules: ['math'],
    enableWorkerPool: true 
  })

  return {
    isLoading,
    isSupported,
    error,
    ...math
  }
}

/**
 * Hook especializado para procesamiento de imágenes
 */
export function useImageWASM() {
  const { isLoading, isSupported, error, image } = useWASM({ 
    autoLoadModules: ['image'],
    enableWorkerPool: true 
  })

  return {
    isLoading,
    isSupported,
    error,
    ...image
  }
}

/**
 * Hook especializado para análisis de datos
 */
export function useDataAnalysisWASM() {
  const { isLoading, isSupported, error, data } = useWASM({ 
    autoLoadModules: ['data'],
    enableWorkerPool: true 
  })

  return {
    isLoading,
    isSupported,
    error,
    ...data
  }
}

/**
 * Hook para estadísticas de rendimiento WASM
 */
export function useWASMPerformance() {
  const [stats, setStats] = useState(wasmManager.getPerformanceStats())

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(wasmManager.getPerformanceStats())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return stats
}

export default useWASM