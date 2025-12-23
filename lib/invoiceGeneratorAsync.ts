/**
 * 🔄 Backward Compatible Invoice Generator
 * Wrapper que mantiene la API existente pero usa workers en segundo plano
 */

import { queuePDFGeneration, jobQueue } from '@/lib/workers/job-queue'

// Re-exportar tipos existentes para compatibilidad
export interface InvoiceItem {
  sku: string | null
  name: string
  quantity: number
  unit: string
  pricePerUnit: number
  subtotal: number
}

export interface CreditNoteUsage {
  creditNoteId: string
  creditNoteNumber: string
  amountUsed: number
  originalAmount: number
  remainingAmount: number
}

export interface InvoiceData {
  // Información de la factura
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date
  
  // Información del vendedor
  sellerCompany: string
  sellerAddress?: string
  sellerEmail?: string
  sellerPhone?: string
  
  // Información del cliente
  clientName: string
  clientEmail?: string
  clientAddress?: string
  clientPhone?: string
  
  // Items de la factura
  items: InvoiceItem[]
  
  // Totales
  subtotal: number
  discount?: number
  tax?: number
  total: number
  
  // Créditos aplicados
  creditNotesUsed?: CreditNoteUsage[]
  
  // Términos y condiciones
  terms?: string
  notes?: string
}

export interface GenerationOptions {
  // Opciones de generación
  priority?: number
  timeout?: number
  
  // Modo de generación
  async?: boolean // Si true, retorna jobId; si false, espera el resultado
  
  // Backward compatibility
  useWorker?: boolean // Por defecto true, false para fallback
}

/**
 * 📄 Generar factura (API principal - BACKWARD COMPATIBLE)
 * 
 * Esta función mantiene la API existente pero internamente usa workers
 * para evitar bloquear el hilo principal
 */
export async function generateInvoice(
  data: InvoiceData,
  options: GenerationOptions = {}
): Promise<Buffer | { jobId: string; status: string }> {
  
  const {
    priority = 1,
    timeout = 30000,
    async = false,
    useWorker = true
  } = options

  // Si no usar worker, fallback al método original (solo para emergencias)
  if (!useWorker) {
    console.warn('⚠️ Using fallback PDF generation (blocking main thread)')
    return generateInvoiceFallback(data)
  }

  try {
    // Crear trabajo en la cola
    const jobId = await queuePDFGeneration(data, {
      priority,
      timeout
    })

    // Si modo async, retornar job ID inmediatamente
    if (async) {
      return {
        jobId,
        status: 'pending'
      }
    }

    // Si modo sync, esperar resultado (para backward compatibility)
    return await waitForJobCompletion(jobId, timeout)

  } catch (error) {
    console.error('❌ Error generating invoice with worker:', error)
    
    // Fallback automático en caso de error del worker
    console.warn('🔄 Falling back to synchronous PDF generation')
    return generateInvoiceFallback(data)
  }
}

/**
 * 📋 Generar factura asíncrona (nueva API)
 * 
 * Siempre retorna un job ID para polling
 */
export async function generateInvoiceAsync(
  data: InvoiceData,
  options: Omit<GenerationOptions, 'async'> = {}
): Promise<{ jobId: string; status: string }> {
  
  const result = await generateInvoice(data, { ...options, async: true })
  
  if (Buffer.isBuffer(result)) {
    throw new TypeError('Unexpected synchronous result')
  }
  
  return result
}

/**
 * ⏱️ Esperar completion de trabajo
 */
async function waitForJobCompletion(jobId: string, timeoutMs: number): Promise<Buffer> {
  const startTime = Date.now()
  const pollInterval = 500 // Poll cada 500ms
  
  return new Promise((resolve, reject) => {
    const checkJob = () => {
      // Verificar timeout
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error(`Job ${jobId} timed out after ${timeoutMs}ms`))
        return
      }

      const job = jobQueue.getJob(jobId)
      
      if (!job) {
        reject(new Error(`Job ${jobId} not found`))
        return
      }

      switch (job.status) {
        case 'completed':
          if (job.result?.buffer) {
            resolve(job.result.buffer)
          } else {
            reject(new Error('Job completed but no PDF buffer found'))
          }
          break
          
        case 'failed':
          reject(new Error(job.error || 'PDF generation failed'))
          break
          
        case 'pending':
        case 'processing':
        case 'retrying':
          // Continuar polling
          setTimeout(checkJob, pollInterval)
          break
          
        default:
          reject(new Error(`Unknown job status: ${job.status}`))
      }
    }

    // Iniciar polling
    checkJob()
  })
}

/**
 * 🔄 Fallback síncrono (método original - SOLO PARA EMERGENCIAS)
 * 
 * NOTA: Este método bloquea el hilo principal y solo debe usarse
 * como último recurso si el sistema de workers falla
 */
async function generateInvoiceFallback(data: InvoiceData): Promise<Buffer> {
  // Importar dinámicamente para evitar bloquear el startup
  const jsPDF = await import('jspdf')
  await import('jspdf-autotable')
  
  console.warn('⚠️ BLOCKING MAIN THREAD - PDF generation fallback active')
  
  const doc = new jsPDF.default({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // Configuración básica de colores
  const primaryColor = [41, 128, 185] as const
  const secondaryColor = [52, 73, 94] as const

  // Encabezado simple
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2])
  doc.rect(0, 0, 210, 40, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(data.sellerCompany || 'Factura', 20, 25)

  // Información básica
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2])
  doc.setFontSize(10)
  doc.text(`Número: ${data.invoiceNumber}`, 20, 50)
  doc.text(`Cliente: ${data.clientName}`, 20, 56)
  doc.text(`Total: $${data.total.toFixed(2)}`, 20, 62)

  // Generar buffer
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
  
  console.warn('⚠️ Fallback PDF generation completed')
  return pdfBuffer
}

/**
 * 📊 Obtener estadísticas del sistema de workers
 */
export function getWorkerStats() {
  return jobQueue.getStats()
}

/**
 * 🔍 Obtener estado de trabajo
 */
export function getJobStatus(jobId: string) {
  return jobQueue.getJob(jobId)
}