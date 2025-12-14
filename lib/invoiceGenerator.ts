// lib/invoiceGenerator.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { INVOICE_CONFIG } from './invoice-config'
import { formatPrice } from './utils'

interface InvoiceItem {
  sku: string | null
  name: string
  quantity: number
  unit: string
  pricePerUnit: number
  subtotal: number
}

interface CreditNoteUsage {
  creditNoteId: string
  creditNoteNumber: string
  amountUsed: number
  originalAmount: number
  remainingAmount: number
}

interface InvoiceData {
  // Información de la factura
  invoiceNumber: string
  invoiceDate: Date
  dueDate: Date
  
  // Información del vendedor
  sellerName: string
  sellerAddress: string
  sellerPhone: string
  sellerEmail: string
  sellerTaxId?: string
  
  // Información del cliente
  clientName: string
  clientBusinessName?: string
  clientAddress: string
  clientPhone: string
  clientEmail: string
  clientTaxId?: string
  
  // Items de la orden
  items: InvoiceItem[]
  
  // Totales
  subtotal: number
  taxRate: number
  taxAmount: number
  totalBeforeCredits: number  // Total antes de aplicar créditos
  creditNotesUsed?: CreditNoteUsage[]  // Notas de crédito aplicadas
  totalCreditApplied?: number  // Total de crédito aplicado
  total: number  // Total final después de créditos
  
  // Información adicional
  paymentMethod?: string
  paymentTerms?: string
  notes?: string
  termsAndConditions?: string
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF()
  
  // Configuración de colores
  const primaryColor: [number, number, number] = [59, 130, 246] // Azul
  const secondaryColor: [number, number, number] = [107, 114, 128] // Gris
  const accentColor: [number, number, number] = [16, 185, 129] // Verde
  
  let yPos = 20
  
  // ============================================
  // HEADER - Logo y título
  // ============================================
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, 210, 40, 'F')
  
  // Logo de la empresa
  // INSTRUCCIONES: 
  // 1. Actualiza la ruta en: lib/invoice-config.ts → company.logo
  // 2. Coloca tu logo en: public/logo.png (o la ruta configurada)
  // 3. Formatos soportados: PNG, JPG, JPEG
  // 4. Tamaño recomendado: 200x200px o mayor (fondo transparente)
  // 5. Si no hay logo, se muestra un placeholder automáticamente
  try {
    const logoPath = INVOICE_CONFIG.company.logo
    // Detectar formato de imagen
    const format = logoPath.endsWith('.jpg') || logoPath.endsWith('.jpeg') ? 'JPEG' : 'PNG'
    doc.addImage(logoPath, format, 15, 10, 20, 20)
  } catch (error) {
    // Fallback: mostrar placeholder si no hay logo o hay error
    doc.setFillColor(255, 255, 255)
    doc.circle(25, 20, 10, 'F')
    doc.setFontSize(8)
    doc.setTextColor(59, 130, 246)
    doc.text('LOGO', 20, 21)
  }
  
  // Título FACTURA
  doc.setFontSize(28)
  doc.setTextColor(255, 255, 255)
  doc.text('FACTURA', 210 - 20, 25, { align: 'right' })
  
  // Número de factura
  doc.setFontSize(12)
  doc.setTextColor(255, 255, 255)
  doc.text(`#${data.invoiceNumber}`, 210 - 20, 33, { align: 'right' })
  
  yPos = 50
  
  // ============================================
  // INFORMACIÓN DEL VENDEDOR Y CLIENTE
  // ============================================
  doc.setFontSize(10)
  
  // Vendedor (Izquierda)
  doc.setTextColor(...secondaryColor)
  doc.setFont('helvetica', 'bold')
  doc.text('DE:', 20, yPos)
  
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(data.sellerName, 20, yPos + 6)
  
  doc.setFontSize(9)
  doc.setTextColor(...secondaryColor)
  doc.text(data.sellerAddress, 20, yPos + 12)
  doc.text(`Tel: ${data.sellerPhone}`, 20, yPos + 18)
  doc.text(data.sellerEmail, 20, yPos + 24)
  if (data.sellerTaxId) {
    doc.text(`Tax ID: ${data.sellerTaxId}`, 20, yPos + 30)
  }
  
  // Cliente (Derecha)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...secondaryColor)
  doc.text('PARA:', 120, yPos)
  
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(data.clientName, 120, yPos + 6)
  
  if (data.clientBusinessName) {
    doc.setFontSize(9)
    doc.setTextColor(...secondaryColor)
    doc.text(data.clientBusinessName, 120, yPos + 12)
    yPos += 6
  }
  
  doc.setFontSize(9)
  doc.setTextColor(...secondaryColor)
  doc.text(data.clientAddress, 120, yPos + 12)
  doc.text(`Tel: ${data.clientPhone}`, 120, yPos + 18)
  doc.text(data.clientEmail, 120, yPos + 24)
  if (data.clientTaxId) {
    doc.text(`Tax ID: ${data.clientTaxId}`, 120, yPos + 30)
  }
  
  yPos += 45
  
  // ============================================
  // FECHAS E INFORMACIÓN DE PAGO
  // ============================================
  doc.setFillColor(249, 250, 251)
  doc.rect(20, yPos, 170, 20, 'F')
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...secondaryColor)
  
  // Fecha de emisión
  doc.text('Fecha de Emisión:', 25, yPos + 8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(formatDate(data.invoiceDate), 25, yPos + 14)
  
  // Fecha de vencimiento
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...secondaryColor)
  doc.text('Fecha de Vencimiento:', 80, yPos + 8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(formatDate(data.dueDate), 80, yPos + 14)
  
  // Método de pago
  if (data.paymentMethod) {
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...secondaryColor)
    doc.text('Método de Pago:', 145, yPos + 8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text(data.paymentMethod, 145, yPos + 14)
  }
  
  yPos += 30
  
  // ============================================
  // TABLA DE PRODUCTOS
  // ============================================
  const tableData = data.items.map(item => [
    item.sku || '-',
    item.name,
    item.quantity.toString(),
    item.unit,
    formatPrice(Number(item.pricePerUnit)),
    formatPrice(Number(item.subtotal))
  ])
  
  autoTable(doc, {
    startY: yPos,
    head: [['SKU', 'Producto', 'Cantidad', 'Unidad', 'Precio Unit.', 'Subtotal']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 60 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    }
  })
  
  // Obtener posición Y después de la tabla
  yPos = (doc as any).lastAutoTable.finalY + 10
  
  // ============================================
  // TOTALES
  // ============================================
  const totalsX = 130
  const totalsWidth = 60
  
  doc.setFontSize(10)
  
  // Subtotal
  doc.setTextColor(...secondaryColor)
  doc.text('Subtotal:', totalsX, yPos)
  doc.setTextColor(0, 0, 0)
  doc.text(formatPrice(Number(data.subtotal)), totalsX + totalsWidth, yPos, { align: 'right' })
  
  yPos += 7
  
  // Impuestos
  doc.setTextColor(...secondaryColor)
  doc.text(`Impuestos (${(Number(data.taxRate) * 100).toFixed(0)}%):`, totalsX, yPos)
  doc.setTextColor(0, 0, 0)
  doc.text(formatPrice(Number(data.taxAmount)), totalsX + totalsWidth, yPos, { align: 'right' })
  
  yPos += 10
  
  // Total antes de créditos
  const totalBeforeCredits = data.totalBeforeCredits || data.total
  doc.setTextColor(...secondaryColor)
  doc.text('Total Orden:', totalsX, yPos)
  doc.setTextColor(0, 0, 0)
  doc.text(formatPrice(Number(totalBeforeCredits)), totalsX + totalsWidth, yPos, { align: 'right' })
  
  yPos += 10
  
  // Notas de crédito aplicadas
  if (data.creditNotesUsed && data.creditNotesUsed.length > 0) {
    doc.setFontSize(9)
    doc.setTextColor(...secondaryColor)
    doc.text('Créditos Aplicados:', totalsX, yPos)
    yPos += 6
    
    data.creditNotesUsed.forEach((credit) => {
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(`  ${credit.creditNoteNumber}:`, totalsX + 5, yPos)
      doc.setTextColor(220, 38, 38) // Rojo para mostrar descuento
      doc.text(`-${formatPrice(Number(credit.amountUsed)).substring(1)}`, totalsX + totalsWidth, yPos, { align: 'right' })
      yPos += 5
    })
    
    yPos += 5
    
    // Total de crédito aplicado
    if (data.totalCreditApplied && data.totalCreditApplied > 0) {
      doc.setFontSize(9)
      doc.setTextColor(...secondaryColor)
      doc.text('Total Crédito:', totalsX, yPos)
      doc.setTextColor(220, 38, 38)
      doc.text(`-${formatPrice(Number(data.totalCreditApplied)).substring(1)}`, totalsX + totalsWidth, yPos, { align: 'right' })
      yPos += 10
    }
  }
  
  // Total final
  doc.setFillColor(...accentColor)
  doc.rect(totalsX - 5, yPos - 6, totalsWidth + 10, 12, 'F')
  
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL A PAGAR:', totalsX, yPos)
  doc.text(formatPrice(Number(data.total)), totalsX + totalsWidth, yPos, { align: 'right' })
  
  yPos += 20
  
  // ============================================
  // NOTAS Y TÉRMINOS
  // ============================================
  if (data.notes) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...secondaryColor)
    doc.text('Notas:', 20, yPos)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const notesLines = doc.splitTextToSize(data.notes, 170)
    doc.text(notesLines, 20, yPos + 6)
    yPos += (notesLines.length * 5) + 10
  }
  
  if (data.paymentTerms) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...secondaryColor)
    doc.text('Términos de Pago:', 20, yPos)
    
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const termsLines = doc.splitTextToSize(data.paymentTerms, 170)
    doc.text(termsLines, 20, yPos + 6)
    yPos += (termsLines.length * 5) + 10
  }
  
  // ============================================
  // FOOTER
  // ============================================
  const pageHeight = doc.internal.pageSize.height
  
  // Términos y condiciones en la parte inferior
  if (data.termsAndConditions) {
    doc.setFontSize(7)
    doc.setTextColor(...secondaryColor)
    const tcLines = doc.splitTextToSize(data.termsAndConditions, 170)
    doc.text(tcLines, 20, pageHeight - 30)
  }
  
  // Línea separadora
  doc.setDrawColor(...secondaryColor)
  doc.line(20, pageHeight - 20, 190, pageHeight - 20)
  
  // Pie de página
  doc.setFontSize(8)
  doc.setTextColor(...secondaryColor)
  doc.text(
    'Gracias por su preferencia',
    105,
    pageHeight - 15,
    { align: 'center' }
  )
  
  doc.setFontSize(7)
  doc.text(
    `${data.sellerName} | ${data.sellerEmail} | ${data.sellerPhone}`,
    105,
    pageHeight - 10,
    { align: 'center' }
  )
  
  return doc
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}

// Función helper para descargar el PDF
export function downloadInvoice(data: InvoiceData, filename?: string) {
  const doc = generateInvoicePDF(data)
  const finalFilename = filename || `Factura-${data.invoiceNumber}.pdf`
  doc.save(finalFilename)
}

// Función helper para abrir en nueva pestaña
export function openInvoiceInNewTab(data: InvoiceData) {
  const doc = generateInvoicePDF(data)
  const pdfBlob = doc.output('blob')
  const pdfUrl = URL.createObjectURL(pdfBlob)
  window.open(pdfUrl, '_blank')
}

// Función helper para enviar por email (retorna blob)
export function getInvoiceBlob(data: InvoiceData): Blob {
  const doc = generateInvoicePDF(data)
  return doc.output('blob')
}

/* 
 * EJEMPLO DE USO:
 * 
 * import { downloadInvoice, openInvoiceInNewTab, InvoiceData } from '@/lib/invoiceGenerator'
 * 
 * const invoiceData: InvoiceData = {
 *   invoiceNumber: 'INV-2025-001',
 *   invoiceDate: new Date(),
 *   dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
 *   
 *   sellerName: 'Mi Empresa S.A.',
 *   sellerAddress: '123 Calle Principal, Ciudad',
 *   sellerPhone: '+1 234-567-8900',
 *   sellerEmail: 'ventas@miempresa.com',
 *   sellerTaxId: 'RFC123456789',
 *   
 *   clientName: 'Juan Pérez',
 *   clientBusinessName: 'Restaurante El Buen Sabor',
 *   clientAddress: '456 Avenida Central, Ciudad',
 *   clientPhone: '+1 987-654-3210',
 *   clientEmail: 'juan@elbensabor.com',
 *   
 *   items: [
 *     {
 *       sku: 'PROD-001',
 *       name: 'Arroz Blanco 5kg',
 *       quantity: 10,
 *       unit: 'pk',
 *       pricePerUnit: 25.50,
 *       subtotal: 255.00
 *     },
 *     {
 *       sku: 'PROD-002',
 *       name: 'Aceite Vegetal 1L',
 *       quantity: 5,
 *       unit: 'unit',
 *       pricePerUnit: 15.00,
 *       subtotal: 75.00
 *     }
 *   ],
 *   
 *   subtotal: 330.00,
 *   taxRate: 0.16,
 *   taxAmount: 52.80,
 *   total: 382.80,
 *   
 *   paymentMethod: 'Transferencia Bancaria',
 *   paymentTerms: 'Pago a 30 días. Se aplican intereses moratorios del 2% mensual después de la fecha de vencimiento.',
 *   notes: 'Gracias por su pedido. Si tiene alguna pregunta, no dude en contactarnos.',
 *   termsAndConditions: 'Esta factura está sujeta a los términos y condiciones de venta. Los productos no son retornables después de 7 días. Garantía de calidad de 90 días.'
 * }
 * 
 * // Descargar PDF
 * downloadInvoice(invoiceData)
 * 
 * // O abrir en nueva pestaña
 * openInvoiceInNewTab(invoiceData)
 * 
 * // O obtener blob para enviar por email
 * const blob = getInvoiceBlob(invoiceData)
 */

// Exportar tipos para uso externo
export type { InvoiceData, InvoiceItem, CreditNoteUsage }
