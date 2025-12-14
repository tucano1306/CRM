/**
 * 🧮 Mathematical Algorithms WASM Module
 * Implementaciones matemáticas optimizadas para CPU-intensive tasks
 */

export interface MathWASMFunctions {
  // Números primos
  calculatePrimes: (limit: number) => number[]
  isPrime: (n: number) => boolean
  
  // Estadísticas
  calculateStats: (numbers: Float64Array) => {
    mean: number
    median: number
    stdDev: number
    variance: number
    sum: number
    min: number
    max: number
  }
  
  // Análisis financiero
  calculateCompoundInterest: (principal: number, rate: number, time: number, frequency: number) => number
  calculateROI: (values: Float64Array) => number
  calculateMovingAverage: (values: Float64Array, window: number) => Float64Array
  
  // Criptografía básica
  hashNumbers: (values: Float64Array) => number
  generateRandomSequence: (length: number, seed: number) => Float64Array
}

/**
 * Wrapper para funciones matemáticas WASM
 */
export class MathWASM {
  private static instance: MathWASM
  private module: WebAssembly.Module | null = null
  private wasmInstance: WebAssembly.Instance | null = null
  private exports: any = null

  private constructor() {}

  public static getInstance(): MathWASM {
    if (!MathWASM.instance) {
      MathWASM.instance = new MathWASM()
    }
    return MathWASM.instance
  }

  /**
   * Inicializar módulo WASM matemático
   */
  public async initialize(wasmUrl: string = '/wasm/math-algorithms.wasm'): Promise<boolean> {
    try {
      // Cargar y compilar WASM
      const wasmBytes = await fetch(wasmUrl).then(r => r.arrayBuffer())
      this.module = await WebAssembly.compile(wasmBytes)
      
      // Crear instancia con imports necesarios
      const imports = {
        env: {
          memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),
          table: new WebAssembly.Table({ initial: 1, element: 'anyfunc' }),
          __memory_base: 0,
          __table_base: 0,
          abort: () => {
            throw new Error('WASM abort called')
          },
          // Funciones matemáticas del host
          cos: Math.cos,
          sin: Math.sin,
          tan: Math.tan,
          log: Math.log,
          exp: Math.exp,
          sqrt: Math.sqrt,
          pow: Math.pow
        }
      }

      this.wasmInstance = await WebAssembly.instantiate(this.module, imports)
      this.exports = this.wasmInstance.exports

      console.log('✅ Math WASM module initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Math WASM:', error)
      return false
    }
  }

  /**
   * Calcular números primos hasta un límite (optimizado con WASM)
   */
  public calculatePrimes(limit: number): number[] {
    if (!this.exports?.calculate_primes) {
      return this.calculatePrimesJS(limit) // Fallback a JavaScript
    }

    try {
      // Allocate memory for results
      const resultPtr = this.exports.allocate(limit * 4) // int32 array
      const count = this.exports.calculate_primes(limit, resultPtr)
      
      // Read results from WASM memory
      const memory = new Int32Array(this.exports.memory.buffer, resultPtr, count)
      const primes = Array.from(memory.slice(0, count))
      
      // Free allocated memory
      this.exports.deallocate(resultPtr)
      
      return primes
    } catch (error) {
      console.warn('WASM prime calculation failed, falling back to JS:', error)
      return this.calculatePrimesJS(limit)
    }
  }

  /**
   * Fallback JavaScript para cálculo de primos
   */
  private calculatePrimesJS(limit: number): number[] {
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
    return primes
  }

  /**
   * Calcular estadísticas de un array de números
   */
  public calculateStats(numbers: number[]): {
    mean: number
    median: number
    stdDev: number
    variance: number
    sum: number
    min: number
    max: number
  } {
    if (!this.exports?.calculate_stats) {
      return this.calculateStatsJS(numbers)
    }

    try {
      const float64Array = new Float64Array(numbers)
      const dataPtr = this.exports.allocate(numbers.length * 8) // float64 array
      const resultPtr = this.exports.allocate(7 * 8) // 7 float64 results
      
      // Copy data to WASM memory
      const wasmMemory = new Float64Array(this.exports.memory.buffer, dataPtr, numbers.length)
      wasmMemory.set(float64Array)
      
      // Call WASM function
      this.exports.calculate_stats(dataPtr, numbers.length, resultPtr)
      
      // Read results
      const results = new Float64Array(this.exports.memory.buffer, resultPtr, 7)
      
      const stats = {
        mean: results[0],
        median: results[1],
        stdDev: results[2],
        variance: results[3],
        sum: results[4],
        min: results[5],
        max: results[6]
      }
      
      // Clean up
      this.exports.deallocate(dataPtr)
      this.exports.deallocate(resultPtr)
      
      return stats
    } catch (error) {
      console.warn('WASM stats calculation failed, falling back to JS:', error)
      return this.calculateStatsJS(numbers)
    }
  }

  /**
   * Fallback JavaScript para estadísticas
   */
  private calculateStatsJS(numbers: number[]): {
    mean: number
    median: number
    stdDev: number
    variance: number
    sum: number
    min: number
    max: number
  } {
    const sorted = [...numbers].sort((a, b) => a - b)
    const sum = numbers.reduce((a, b) => a + b, 0)
    const mean = sum / numbers.length
    
    const variance = numbers.reduce((acc, num) => acc + Math.pow(num - mean, 2), 0) / numbers.length
    const stdDev = Math.sqrt(variance)
    
    const median = numbers.length % 2 === 0
      ? (sorted[numbers.length / 2 - 1] + sorted[numbers.length / 2]) / 2
      : sorted[Math.floor(numbers.length / 2)]

    return {
      mean,
      median,
      stdDev,
      variance,
      sum,
      min: Math.min(...numbers),
      max: Math.max(...numbers)
    }
  }

  /**
   * Calcular interés compuesto
   */
  public calculateCompoundInterest(
    principal: number,
    rate: number,
    time: number,
    frequency: number = 12
  ): number {
    if (!this.exports?.compound_interest) {
      return principal * Math.pow(1 + rate / frequency, frequency * time)
    }

    try {
      return this.exports.compound_interest(principal, rate, time, frequency)
    } catch (error) {
      // WASM execution failed, falling back to JavaScript implementation
      console.debug('WASM compound interest calculation failed, using JS fallback:', error)
      return principal * Math.pow(1 + rate / frequency, frequency * time)
    }
  }

  /**
   * Calcular promedio móvil
   */
  public calculateMovingAverage(values: number[], window: number): number[] {
    if (!this.exports?.moving_average) {
      return this.calculateMovingAverageJS(values, window)
    }

    try {
      const dataPtr = this.exports.allocate(values.length * 8)
      const resultPtr = this.exports.allocate((values.length - window + 1) * 8)
      
      const wasmData = new Float64Array(this.exports.memory.buffer, dataPtr, values.length)
      wasmData.set(values)
      
      const resultLength = this.exports.moving_average(dataPtr, values.length, window, resultPtr)
      
      const results = new Float64Array(this.exports.memory.buffer, resultPtr, resultLength)
      const movingAverages = Array.from(results)
      
      this.exports.deallocate(dataPtr)
      this.exports.deallocate(resultPtr)
      
      return movingAverages
    } catch (error) {
      // WASM execution failed, falling back to JavaScript implementation
      console.debug('WASM moving average calculation failed, using JS fallback:', error)
      return this.calculateMovingAverageJS(values, window)
    }
  }

  /**
   * Fallback JavaScript para promedio móvil
   */
  private calculateMovingAverageJS(values: number[], window: number): number[] {
    const result: number[] = []
    for (let i = 0; i <= values.length - window; i++) {
      const sum = values.slice(i, i + window).reduce((a, b) => a + b, 0)
      result.push(sum / window)
    }
    return result
  }

  /**
   * Verificar si el módulo está inicializado
   */
  public isInitialized(): boolean {
    return this.exports !== null
  }

  /**
   * Obtener información del módulo
   */
  public getModuleInfo(): {
    initialized: boolean
    memorySize: number
    availableFunctions: string[]
  } {
    return {
      initialized: this.isInitialized(),
      memorySize: this.exports?.memory ? this.exports.memory.buffer.byteLength : 0,
      availableFunctions: this.exports ? Object.keys(this.exports).filter(key => 
        typeof this.exports[key] === 'function'
      ) : []
    }
  }
}

// Singleton export
export const mathWASM = MathWASM.getInstance()
export default mathWASM