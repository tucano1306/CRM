/**
 * 🖼️ Image Processing WASM Module
 * Procesamiento de imágenes optimizado para tareas CPU-intensivas
 */

export interface ImageWASMFunctions {
  // Filtros básicos
  applyGrayscale: (imageData: ImageData) => ImageData
  applyBlur: (imageData: ImageData, radius: number) => ImageData
  applySharpen: (imageData: ImageData) => ImageData
  adjustBrightness: (imageData: ImageData, factor: number) => ImageData
  adjustContrast: (imageData: ImageData, factor: number) => ImageData
  
  // Operaciones geométricas
  resize: (imageData: ImageData, newWidth: number, newHeight: number) => ImageData
  rotate: (imageData: ImageData, angle: number) => ImageData
  crop: (imageData: ImageData, x: number, y: number, width: number, height: number) => ImageData
  
  // Análisis de imagen
  calculateHistogram: (imageData: ImageData) => { r: number[], g: number[], b: number[] }
  detectEdges: (imageData: ImageData) => ImageData
  calculateAverageColor: (imageData: ImageData) => { r: number, g: number, b: number }
}

/**
 * Wrapper para procesamiento de imágenes con WASM
 */
export class ImageWASM {
  private static instance: ImageWASM
  private module: WebAssembly.Module | null = null
  private wasmInstance: WebAssembly.Instance | null = null
  private exports: any = null

  private constructor() {}

  public static getInstance(): ImageWASM {
    if (!ImageWASM.instance) {
      ImageWASM.instance = new ImageWASM()
    }
    return ImageWASM.instance
  }

  /**
   * Inicializar módulo WASM de procesamiento de imágenes
   */
  public async initialize(wasmUrl: string = '/wasm/image-processing.wasm'): Promise<boolean> {
    try {
      const wasmBytes = await fetch(wasmUrl).then(r => r.arrayBuffer())
      this.module = await WebAssembly.compile(wasmBytes)
      
      const imports = {
        env: {
          memory: new WebAssembly.Memory({ initial: 512, maximum: 1024 }), // Más memoria para imágenes
          table: new WebAssembly.Table({ initial: 1, element: 'anyfunc' }),
          __memory_base: 0,
          __table_base: 0,
          abort: () => {
            throw new Error('Image WASM abort called')
          },
          // Funciones matemáticas necesarias
          cos: Math.cos,
          sin: Math.sin,
          sqrt: Math.sqrt,
          floor: Math.floor,
          ceil: Math.ceil,
          round: Math.round
        }
      }

      this.wasmInstance = await WebAssembly.instantiate(this.module, imports)
      this.exports = this.wasmInstance.exports

      console.log('✅ Image WASM module initialized')
      return true
    } catch (error) {
      console.error('❌ Failed to initialize Image WASM:', error)
      return false
    }
  }

  /**
   * Aplicar filtro de escala de grises
   */
  public applyGrayscale(imageData: ImageData): ImageData {
    if (!this.exports?.apply_grayscale) {
      return this.applyGrayscaleJS(imageData)
    }

    try {
      const pixelCount = imageData.width * imageData.height
      const dataPtr = this.exports.allocate(pixelCount * 4) // RGBA
      
      // Copy image data to WASM memory
      const wasmMemory = new Uint8ClampedArray(this.exports.memory.buffer, dataPtr, pixelCount * 4)
      wasmMemory.set(imageData.data)
      
      // Process in WASM
      this.exports.apply_grayscale(dataPtr, pixelCount)
      
      // Create new ImageData with processed pixels
      const processedData = new Uint8ClampedArray(wasmMemory)
      const result = new ImageData(processedData, imageData.width, imageData.height)
      
      this.exports.deallocate(dataPtr)
      return result
    } catch (error) {
      console.warn('WASM grayscale failed, falling back to JS:', error)
      return this.applyGrayscaleJS(imageData)
    }
  }

  /**
   * Fallback JavaScript para escala de grises
   */
  private applyGrayscaleJS(imageData: ImageData): ImageData {
    const data = new Uint8ClampedArray(imageData.data)
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
      data[i] = gray     // R
      data[i + 1] = gray // G
      data[i + 2] = gray // B
      // Alpha channel (i + 3) remains unchanged
    }
    
    return new ImageData(data, imageData.width, imageData.height)
  }

  /**
   * Aplicar desenfoque
   */
  public applyBlur(imageData: ImageData, radius: number = 1): ImageData {
    if (!this.exports?.apply_blur) {
      return this.applyBlurJS(imageData, radius)
    }

    try {
      const pixelCount = imageData.width * imageData.height
      const dataPtr = this.exports.allocate(pixelCount * 4)
      const resultPtr = this.exports.allocate(pixelCount * 4)
      
      const wasmMemory = new Uint8ClampedArray(this.exports.memory.buffer, dataPtr, pixelCount * 4)
      wasmMemory.set(imageData.data)
      
      this.exports.apply_blur(dataPtr, resultPtr, imageData.width, imageData.height, radius)
      
      const processedData = new Uint8ClampedArray(this.exports.memory.buffer, resultPtr, pixelCount * 4)
      const result = new ImageData(new Uint8ClampedArray(processedData), imageData.width, imageData.height)
      
      this.exports.deallocate(dataPtr)
      this.exports.deallocate(resultPtr)
      
      return result
    } catch (error) {
      // WASM execution failed, falling back to JavaScript implementation
      console.debug('WASM blur operation failed, using JS fallback:', error)
      return this.applyBlurJS(imageData, radius)
    }
  }

  // Helper: compute blur kernel sum for a pixel
  private computeBlurKernel(
    data: Uint8ClampedArray,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): { r: number; g: number; b: number; a: number; count: number } {
    let r = 0, g = 0, b = 0, a = 0, count = 0
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const idx = (ny * width + nx) * 4
          r += data[idx]
          g += data[idx + 1]
          b += data[idx + 2]
          a += data[idx + 3]
          count++
        }
      }
    }
    return { r, g, b, a, count }
  }

  /**
   * Fallback JavaScript para desenfoque (box blur simple)
   */
  private applyBlurJS(imageData: ImageData, radius: number): ImageData {
    const { width, height, data } = imageData
    const output = new Uint8ClampedArray(data)
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const { r, g, b, a, count } = this.computeBlurKernel(data, x, y, width, height, radius)
        const idx = (y * width + x) * 4
        output[idx] = r / count
        output[idx + 1] = g / count
        output[idx + 2] = b / count
        output[idx + 3] = a / count
      }
    }
    
    return new ImageData(output, width, height)
  }

  /**
   * Redimensionar imagen
   */
  public resize(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
    if (!this.exports?.resize_image) {
      return this.resizeJS(imageData, newWidth, newHeight)
    }

    try {
      const originalSize = imageData.width * imageData.height * 4
      const newSize = newWidth * newHeight * 4
      
      const sourcePtr = this.exports.allocate(originalSize)
      const targetPtr = this.exports.allocate(newSize)
      
      const sourceMemory = new Uint8ClampedArray(this.exports.memory.buffer, sourcePtr, originalSize)
      sourceMemory.set(imageData.data)
      
      this.exports.resize_image(
        sourcePtr, imageData.width, imageData.height,
        targetPtr, newWidth, newHeight
      )
      
      const resizedData = new Uint8ClampedArray(this.exports.memory.buffer, targetPtr, newSize)
      const result = new ImageData(new Uint8ClampedArray(resizedData), newWidth, newHeight)
      
      this.exports.deallocate(sourcePtr)
      this.exports.deallocate(targetPtr)
      
      return result
    } catch (error) {
      // WASM execution failed, falling back to JavaScript implementation
      console.debug('WASM resize operation failed, using JS fallback:', error)
      return this.resizeJS(imageData, newWidth, newHeight)
    }
  }

  /**
   * Fallback JavaScript para redimensionamiento (nearest neighbor)
   */
  private resizeJS(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
    const { width, height, data } = imageData
    const output = new Uint8ClampedArray(newWidth * newHeight * 4)
    
    const scaleX = width / newWidth
    const scaleY = height / newHeight
    
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const sourceX = Math.floor(x * scaleX)
        const sourceY = Math.floor(y * scaleY)
        
        const sourceIdx = (sourceY * width + sourceX) * 4
        const targetIdx = (y * newWidth + x) * 4
        
        output[targetIdx] = data[sourceIdx]         // R
        output[targetIdx + 1] = data[sourceIdx + 1] // G
        output[targetIdx + 2] = data[sourceIdx + 2] // B
        output[targetIdx + 3] = data[sourceIdx + 3] // A
      }
    }
    
    return new ImageData(output, newWidth, newHeight)
  }

  /**
   * Ajustar brillo
   */
  public adjustBrightness(imageData: ImageData, factor: number): ImageData {
    if (!this.exports?.adjust_brightness) {
      return this.adjustBrightnessJS(imageData, factor)
    }

    try {
      const pixelCount = imageData.width * imageData.height
      const dataPtr = this.exports.allocate(pixelCount * 4)
      
      const wasmMemory = new Uint8ClampedArray(this.exports.memory.buffer, dataPtr, pixelCount * 4)
      wasmMemory.set(imageData.data)
      
      this.exports.adjust_brightness(dataPtr, pixelCount, factor)
      
      const result = new ImageData(new Uint8ClampedArray(wasmMemory), imageData.width, imageData.height)
      
      this.exports.deallocate(dataPtr)
      return result
    } catch (error) {
      // WASM execution failed, falling back to JavaScript implementation
      console.debug('WASM brightness adjustment failed, using JS fallback:', error)
      return this.adjustBrightnessJS(imageData, factor)
    }
  }

  /**
   * Fallback JavaScript para ajuste de brillo
   */
  private adjustBrightnessJS(imageData: ImageData, factor: number): ImageData {
    const data = new Uint8ClampedArray(imageData.data)
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] + factor))         // R
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + factor)) // G
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + factor)) // B
      // Alpha channel remains unchanged
    }
    
    return new ImageData(data, imageData.width, imageData.height)
  }

  /**
   * Calcular color promedio de la imagen
   */
  public calculateAverageColor(imageData: ImageData): { r: number, g: number, b: number } {
    if (!this.exports?.calculate_average_color) {
      return this.calculateAverageColorJS(imageData)
    }

    try {
      const pixelCount = imageData.width * imageData.height
      const dataPtr = this.exports.allocate(pixelCount * 4)
      const resultPtr = this.exports.allocate(3 * 8) // 3 double values
      
      const wasmMemory = new Uint8ClampedArray(this.exports.memory.buffer, dataPtr, pixelCount * 4)
      wasmMemory.set(imageData.data)
      
      this.exports.calculate_average_color(dataPtr, pixelCount, resultPtr)
      
      const results = new Float64Array(this.exports.memory.buffer, resultPtr, 3)
      const averageColor = {
        r: Math.round(results[0]),
        g: Math.round(results[1]),
        b: Math.round(results[2])
      }
      
      this.exports.deallocate(dataPtr)
      this.exports.deallocate(resultPtr)
      
      return averageColor
    } catch (error) {
      // WASM execution failed, falling back to JavaScript implementation
      console.debug('WASM average color calculation failed, using JS fallback:', error)
      return this.calculateAverageColorJS(imageData)
    }
  }

  /**
   * Fallback JavaScript para color promedio
   */
  private calculateAverageColorJS(imageData: ImageData): { r: number, g: number, b: number } {
    const { data } = imageData
    let r = 0, g = 0, b = 0
    const pixelCount = data.length / 4
    
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]
      g += data[i + 1]
      b += data[i + 2]
    }
    
    return {
      r: Math.round(r / pixelCount),
      g: Math.round(g / pixelCount),
      b: Math.round(b / pixelCount)
    }
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
export const imageWASM = ImageWASM.getInstance()
export default imageWASM