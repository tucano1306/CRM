/**
 * 📊 Data Analysis WASM Module
 * Análisis de datos optimizado para grandes datasets
 */

export interface AnalyticsWASMFunctions {
  // Análisis estadístico
  analyzeDataset: (data: Float64Array) => {
    mean: number
    median: number
    mode: number[]
    standardDeviation: number
    variance: number
    skewness: number
    kurtosis: number
    quartiles: [number, number, number]
  }
  
  // Correlaciones y regresión
  calculateCorrelation: (x: Float64Array, y: Float64Array) => number
  linearRegression: (x: Float64Array, y: Float64Array) => { slope: number, intercept: number, r2: number }
  
  // Análisis de series temporales
  detectTrends: (values: Float64Array) => { trend: string, strength: number }
  seasonalDecomposition: (values: Float64Array, period: number) => {
    trend: Float64Array
    seasonal: Float64Array
    residual: Float64Array
  }
  
  // Clustering y segmentación
  kMeansClustering: (data: Float64Array, k: number) => {
    centroids: Float64Array
    assignments: Int32Array
    iterations: number
  }
}

/**
 * Wrapper para análisis de datos con WASM
 */
export class DataAnalysisWASM {
  private static instance: DataAnalysisWASM
  private module: WebAssembly.Module | null = null
  private wasmInstance: WebAssembly.Instance | null = null
  private exports: any = null

  private constructor() {}

  public static getInstance(): DataAnalysisWASM {
    if (!DataAnalysisWASM.instance) {
      DataAnalysisWASM.instance = new DataAnalysisWASM()
    }
    return DataAnalysisWASM.instance
  }

  /**
   * Inicializar módulo WASM de análisis de datos
   */
  public async initialize(wasmUrl: string = '/wasm/data-analysis.wasm'): Promise<boolean> {
    try {
      const wasmBytes = await fetch(wasmUrl).then(r => r.arrayBuffer())
      this.module = await WebAssembly.compile(wasmBytes)
      
      const imports = {
        env: {
          memory: new WebAssembly.Memory({ initial: 1024, maximum: 2048 }), // Mucha memoria para datasets
          table: new WebAssembly.Table({ initial: 1, element: 'anyfunc' }),
          __memory_base: 0,
          __table_base: 0,
          abort: () => {
            throw new Error('Data Analysis WASM abort called')
          },
          // Funciones matemáticas avanzadas
          cos: Math.cos,
          sin: Math.sin,
          tan: Math.tan,
          log: Math.log,
          log10: Math.log10,
          exp: Math.exp,
          sqrt: Math.sqrt,
          pow: Math.pow,
          floor: Math.floor,
          ceil: Math.ceil,
          round: Math.round,
          abs: Math.abs,
          atan2: Math.atan2,
          // Funciones de random para clustering
          random: Math.random
        }
      }

      this.wasmInstance = await WebAssembly.instantiate(this.module, imports)
      this.exports = this.wasmInstance.exports

      console.log('✅ Data Analysis WASM module initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Data Analysis WASM:', error)
      return false
    }
  }

  /**
   * Análisis completo de dataset
   */
  public analyzeDataset(data: number[]): {
    mean: number
    median: number
    mode: number[]
    standardDeviation: number
    variance: number
    skewness: number
    kurtosis: number
    quartiles: [number, number, number]
    outliers: number[]
    range: number
    iqr: number
  } {
    if (!this.exports?.analyze_dataset) {
      return this.analyzeDatasetJS(data)
    }

    try {
      const dataPtr = this.exports.allocate(data.length * 8) // Float64Array
      const resultPtr = this.exports.allocate(16 * 8) // Multiple results
      
      const wasmData = new Float64Array(this.exports.memory.buffer, dataPtr, data.length)
      wasmData.set(data)
      
      this.exports.analyze_dataset(dataPtr, data.length, resultPtr)
      
      const results = new Float64Array(this.exports.memory.buffer, resultPtr, 16)
      
      const analysis = {
        mean: results[0],
        median: results[1],
        mode: [results[2]], // Simplified - just first mode
        standardDeviation: results[3],
        variance: results[4],
        skewness: results[5],
        kurtosis: results[6],
        quartiles: [results[7], results[8], results[9]] as [number, number, number],
        outliers: [], // Would need additional processing
        range: results[10],
        iqr: results[11]
      }
      
      this.exports.deallocate(dataPtr)
      this.exports.deallocate(resultPtr)
      
      return analysis
    } catch (error) {
      console.warn('WASM dataset analysis failed, falling back to JS:', error)
      return this.analyzeDatasetJS(data)
    }
  }

  /**
   * Fallback JavaScript para análisis de dataset
   */
  private analyzeDatasetJS(data: number[]): {
    mean: number
    median: number
    mode: number[]
    standardDeviation: number
    variance: number
    skewness: number
    kurtosis: number
    quartiles: [number, number, number]
    outliers: number[]
    range: number
    iqr: number
  } {
    const sorted = [...data].sort((a, b) => a - b)
    const n = data.length
    
    // Basic stats
    const mean = data.reduce((sum, val) => sum + val, 0) / n
    const median = n % 2 === 0 
      ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
      : sorted[Math.floor(n/2)]
    
    // Variance and standard deviation
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
    const standardDeviation = Math.sqrt(variance)
    
    // Quartiles
    const q1 = sorted[Math.floor(n * 0.25)]
    const q3 = sorted[Math.floor(n * 0.75)]
    const iqr = q3 - q1
    
    // Mode (most frequent values)
    const frequency: { [key: number]: number } = {}
    data.forEach(val => frequency[val] = (frequency[val] || 0) + 1)
    const maxFreq = Math.max(...Object.values(frequency))
    const mode = Object.keys(frequency)
      .filter(key => frequency[Number(key)] === maxFreq)
      .map(Number)
    
    // Skewness and kurtosis (simplified calculations)
    const m3 = data.reduce((sum, val) => sum + Math.pow((val - mean) / standardDeviation, 3), 0) / n
    const m4 = data.reduce((sum, val) => sum + Math.pow((val - mean) / standardDeviation, 4), 0) / n
    const skewness = m3
    const kurtosis = m4 - 3 // Excess kurtosis
    
    // Outliers (IQR method)
    const lowerBound = q1 - 1.5 * iqr
    const upperBound = q3 + 1.5 * iqr
    const outliers = data.filter(val => val < lowerBound || val > upperBound)
    
    return {
      mean,
      median,
      mode,
      standardDeviation,
      variance,
      skewness,
      kurtosis,
      quartiles: [q1, median, q3],
      outliers,
      range: Math.max(...data) - Math.min(...data),
      iqr
    }
  }

  /**
   * Calcular correlación entre dos variables
   */
  public calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length) {
      throw new Error('Arrays must have the same length')
    }

    if (!this.exports?.calculate_correlation) {
      return this.calculateCorrelationJS(x, y)
    }

    try {
      const xPtr = this.exports.allocate(x.length * 8)
      const yPtr = this.exports.allocate(y.length * 8)
      
      const wasmX = new Float64Array(this.exports.memory.buffer, xPtr, x.length)
      const wasmY = new Float64Array(this.exports.memory.buffer, yPtr, y.length)
      
      wasmX.set(x)
      wasmY.set(y)
      
      const correlation = this.exports.calculate_correlation(xPtr, yPtr, x.length)
      
      this.exports.deallocate(xPtr)
      this.exports.deallocate(yPtr)
      
      return correlation
    } catch (error) {
      return this.calculateCorrelationJS(x, y)
    }
  }

  /**
   * Fallback JavaScript para correlación
   */
  private calculateCorrelationJS(x: number[], y: number[]): number {
    const n = x.length
    const meanX = x.reduce((sum, val) => sum + val, 0) / n
    const meanY = y.reduce((sum, val) => sum + val, 0) / n
    
    let numerator = 0
    let sumXSquared = 0
    let sumYSquared = 0
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX
      const deltaY = y[i] - meanY
      
      numerator += deltaX * deltaY
      sumXSquared += deltaX * deltaX
      sumYSquared += deltaY * deltaY
    }
    
    const denominator = Math.sqrt(sumXSquared * sumYSquared)
    
    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * Regresión lineal simple
   */
  public linearRegression(x: number[], y: number[]): { 
    slope: number
    intercept: number
    r2: number
    equation: string
  } {
    if (x.length !== y.length) {
      throw new Error('Arrays must have the same length')
    }

    if (!this.exports?.linear_regression) {
      return this.linearRegressionJS(x, y)
    }

    try {
      const xPtr = this.exports.allocate(x.length * 8)
      const yPtr = this.exports.allocate(y.length * 8)
      const resultPtr = this.exports.allocate(3 * 8) // slope, intercept, r2
      
      const wasmX = new Float64Array(this.exports.memory.buffer, xPtr, x.length)
      const wasmY = new Float64Array(this.exports.memory.buffer, yPtr, y.length)
      
      wasmX.set(x)
      wasmY.set(y)
      
      this.exports.linear_regression(xPtr, yPtr, x.length, resultPtr)
      
      const results = new Float64Array(this.exports.memory.buffer, resultPtr, 3)
      
      const regression = {
        slope: results[0],
        intercept: results[1],
        r2: results[2],
        equation: `y = ${results[0].toFixed(4)}x + ${results[1].toFixed(4)}`
      }
      
      this.exports.deallocate(xPtr)
      this.exports.deallocate(yPtr)
      this.exports.deallocate(resultPtr)
      
      return regression
    } catch (error) {
      return this.linearRegressionJS(x, y)
    }
  }

  /**
   * Fallback JavaScript para regresión lineal
   */
  private linearRegressionJS(x: number[], y: number[]): { 
    slope: number
    intercept: number
    r2: number
    equation: string
  } {
    const n = x.length
    const meanX = x.reduce((sum, val) => sum + val, 0) / n
    const meanY = y.reduce((sum, val) => sum + val, 0) / n
    
    let numerator = 0
    let denominator = 0
    
    for (let i = 0; i < n; i++) {
      const deltaX = x[i] - meanX
      numerator += deltaX * (y[i] - meanY)
      denominator += deltaX * deltaX
    }
    
    const slope = denominator === 0 ? 0 : numerator / denominator
    const intercept = meanY - slope * meanX
    
    // Calculate R-squared
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0)
    const residualSumSquares = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept
      return sum + Math.pow(val - predicted, 2)
    }, 0)
    
    const r2 = totalSumSquares === 0 ? 0 : 1 - (residualSumSquares / totalSumSquares)
    
    return {
      slope,
      intercept,
      r2,
      equation: `y = ${slope.toFixed(4)}x + ${intercept.toFixed(4)}`
    }
  }

  /**
   * K-means clustering simple
   */
  public kMeansClustering(
    data: number[], 
    k: number, 
    maxIterations: number = 100
  ): {
    centroids: number[]
    assignments: number[]
    iterations: number
    inertia: number
  } {
    if (!this.exports?.kmeans_clustering) {
      return this.kMeansClusteringJS(data, k, maxIterations)
    }

    try {
      const dataPtr = this.exports.allocate(data.length * 8)
      const centroidsPtr = this.exports.allocate(k * 8)
      const assignmentsPtr = this.exports.allocate(data.length * 4) // int32
      
      const wasmData = new Float64Array(this.exports.memory.buffer, dataPtr, data.length)
      wasmData.set(data)
      
      const iterations = this.exports.kmeans_clustering(
        dataPtr, data.length, k, centroidsPtr, assignmentsPtr, maxIterations
      )
      
      const centroids = Array.from(new Float64Array(this.exports.memory.buffer, centroidsPtr, k))
      const assignments = Array.from(new Int32Array(this.exports.memory.buffer, assignmentsPtr, data.length))
      
      // Calculate inertia
      let inertia = 0
      for (let i = 0; i < data.length; i++) {
        const centroidValue = centroids[assignments[i]]
        inertia += Math.pow(data[i] - centroidValue, 2)
      }
      
      this.exports.deallocate(dataPtr)
      this.exports.deallocate(centroidsPtr)
      this.exports.deallocate(assignmentsPtr)
      
      return { centroids, assignments, iterations, inertia }
    } catch (error) {
      return this.kMeansClusteringJS(data, k, maxIterations)
    }
  }

  /**
   * Fallback JavaScript para K-means clustering
   */
  private kMeansClusteringJS(
    data: number[], 
    k: number, 
    maxIterations: number
  ): {
    centroids: number[]
    assignments: number[]
    iterations: number
    inertia: number
  } {
    // Initialize centroids randomly
    const centroids = Array(k).fill(0).map(() => 
      data[Math.floor(Math.random() * data.length)]
    )
    
    let assignments = new Array(data.length).fill(0)
    let iterations = 0
    
    for (let iter = 0; iter < maxIterations; iter++) {
      iterations = iter + 1
      let changed = false
      
      // Assign points to nearest centroid
      for (let i = 0; i < data.length; i++) {
        let bestCluster = 0
        let bestDistance = Math.abs(data[i] - centroids[0])
        
        for (let j = 1; j < k; j++) {
          const distance = Math.abs(data[i] - centroids[j])
          if (distance < bestDistance) {
            bestDistance = distance
            bestCluster = j
          }
        }
        
        if (assignments[i] !== bestCluster) {
          assignments[i] = bestCluster
          changed = true
        }
      }
      
      // Update centroids
      for (let j = 0; j < k; j++) {
        const clusterPoints = data.filter((_, i) => assignments[i] === j)
        if (clusterPoints.length > 0) {
          centroids[j] = clusterPoints.reduce((sum, val) => sum + val, 0) / clusterPoints.length
        }
      }
      
      if (!changed) break
    }
    
    // Calculate inertia
    let inertia = 0
    for (let i = 0; i < data.length; i++) {
      inertia += Math.pow(data[i] - centroids[assignments[i]], 2)
    }
    
    return { centroids, assignments, iterations, inertia }
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
export const dataAnalysisWASM = DataAnalysisWASM.getInstance()
export default dataAnalysisWASM