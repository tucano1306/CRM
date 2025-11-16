/**
 * 📄 PDF Generation Worker Thread
 * Worker dedicado para generación de PDFs sin bloquear el hilo principal
 */

const { parentPort, workerData } = require('worker_threads')

// Importar dependencias necesarias para PDF
const jsPDF = require('jspdf')
require('jspdf-autotable')

// Función principal del worker
async function processPDFTask(task) {
  const startTime = Date.now()
  
  try {
    console.log(`🔧 PDF Worker processing task: ${task.id}`)
    
    switch (task.type) {
      case 'pdf-generation':
        return await generateInvoicePDF(task.data)
      default:
        throw new Error(`Unknown task type: ${task.type}`)
    }
  } catch (error) {
    console.error(`❌ PDF Worker error in task ${task.id}:`, error)
    return {
      success: false,
      error: error.message,
      executionTime: Date.now() - startTime
    }
  }
}

/**
 * Generar PDF de factura (movido desde lib/invoiceGenerator.ts)
 */
async function generateInvoicePDF(invoiceData) {
  const startTime = Date.now()
  
  try {
    // Configuración del documento
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    // Configuración de colores
    const primaryColor = [41, 128, 185]
    const secondaryColor = [52, 73, 94]
    const lightGray = [236, 240, 241]

    // Encabezado de la empresa
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, 210, 40, 'F')

    // Logo y información de la empresa
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text(invoiceData.sellerCompany || 'Tu Empresa', 20, 25)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (invoiceData.sellerAddress) {
      doc.text(invoiceData.sellerAddress, 20, 32)
    }

    // Información de la factura
    doc.setTextColor(...secondaryColor)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURA', 150, 25)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Número: ${invoiceData.invoiceNumber}`, 150, 32)
    doc.text(`Fecha: ${new Date(invoiceData.invoiceDate).toLocaleDateString()}`, 150, 37)

    // Información del cliente
    let yPos = 60
    doc.setFillColor(...lightGray)
    doc.rect(20, yPos - 5, 170, 25, 'F')

    doc.setTextColor(...secondaryColor)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('FACTURAR A:', 25, yPos + 5)

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(invoiceData.clientName, 25, yPos + 12)
    if (invoiceData.clientEmail) {
      doc.text(invoiceData.clientEmail, 25, yPos + 17)
    }
    if (invoiceData.clientAddress) {
      doc.text(invoiceData.clientAddress, 25, yPos + 22)
    }

    // Tabla de productos
    yPos += 40
    const tableColumns = [
      { header: 'SKU', dataKey: 'sku' },
      { header: 'Producto', dataKey: 'name' },
      { header: 'Cant.', dataKey: 'quantity' },
      { header: 'Unidad', dataKey: 'unit' },
      { header: 'Precio Unit.', dataKey: 'pricePerUnit' },
      { header: 'Subtotal', dataKey: 'subtotal' }
    ]

    const tableRows = invoiceData.items.map(item => ({
      sku: item.sku || 'N/A',
      name: item.name,
      quantity: item.quantity.toString(),
      unit: item.unit,
      pricePerUnit: `$${item.pricePerUnit.toFixed(2)}`,
      subtotal: `$${item.subtotal.toFixed(2)}`
    }))

    doc.autoTable({
      startY: yPos,
      columns: tableColumns,
      body: tableRows,
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: secondaryColor
      },
      alternateRowStyles: {
        fillColor: [249, 249, 249]
      },
      margin: { left: 20, right: 20 },
      tableWidth: 'auto'
    })

    // Obtener posición después de la tabla
    yPos = doc.lastAutoTable.finalY + 20

    // Totales
    const totalsStartX = 130
    doc.setDrawColor(...secondaryColor)
    doc.line(totalsStartX, yPos, 190, yPos)

    yPos += 10
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', totalsStartX, yPos)
    doc.text(`$${invoiceData.subtotal.toFixed(2)}`, 180, yPos, { align: 'right' })

    if (invoiceData.discount && invoiceData.discount > 0) {
      yPos += 6
      doc.text('Descuento:', totalsStartX, yPos)
      doc.text(`-$${invoiceData.discount.toFixed(2)}`, 180, yPos, { align: 'right' })
    }

    if (invoiceData.tax && invoiceData.tax > 0) {
      yPos += 6
      doc.text('Impuestos:', totalsStartX, yPos)
      doc.text(`$${invoiceData.tax.toFixed(2)}`, 180, yPos, { align: 'right' })
    }

    // Créditos aplicados
    if (invoiceData.creditNotesUsed && invoiceData.creditNotesUsed.length > 0) {
      yPos += 6
      doc.text('Créditos aplicados:', totalsStartX, yPos)
      const totalCredits = invoiceData.creditNotesUsed.reduce((sum, credit) => sum + credit.amountUsed, 0)
      doc.text(`-$${totalCredits.toFixed(2)}`, 180, yPos, { align: 'right' })
    }

    // Total final
    yPos += 10
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(1)
    doc.line(totalsStartX, yPos, 190, yPos)

    yPos += 8
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...primaryColor)
    doc.text('TOTAL:', totalsStartX, yPos)
    doc.text(`$${invoiceData.total.toFixed(2)}`, 180, yPos, { align: 'right' })

    // Términos y condiciones
    if (invoiceData.terms) {
      yPos += 20
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...secondaryColor)
      doc.text('Términos y Condiciones:', 20, yPos)
      
      const splitText = doc.splitTextToSize(invoiceData.terms, 170)
      doc.text(splitText, 20, yPos + 5)
    }

    // Generar buffer del PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    return {
      success: true,
      data: {
        buffer: pdfBuffer,
        filename: `factura-${invoiceData.invoiceNumber}.pdf`,
        mimeType: 'application/pdf'
      },
      executionTime: Date.now() - startTime
    }

  } catch (error) {
    console.error('❌ Error generating PDF:', error)
    throw error
  }
}

// Escuchar mensajes del hilo principal
if (parentPort) {
  parentPort.on('message', async (task) => {
    try {
      const result = await processPDFTask(task)
      parentPort.postMessage(result)
    } catch (error) {
      parentPort.postMessage({
        success: false,
        error: error.message,
        executionTime: 0
      })
    }
  })

  // Notificar que el worker está listo
  parentPort.postMessage({ type: 'ready' })
} else {
  console.error('❌ parentPort is not available')
  process.exit(1)
}