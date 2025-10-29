// lib/orderToInvoice.ts
/**
 * Utilidad para convertir una Order del sistema a InvoiceData
 * para generar facturas PDF
 */

import { InvoiceData, InvoiceItem } from './invoiceGenerator'

interface OrderItem {
  id: string
  quantity: number
  priceAtOrder: number
  itemNote?: string | null
  product: {
    id: string
    name: string
    sku: string | null
    unit: string
  }
}

interface Order {
  id: string
  orderNumber: string
  totalAmount: number
  createdAt: Date
  client: {
    name: string
    businessName?: string | null
    email: string
    phone: string
    address: string
  }
  seller?: {
    name: string
    email: string
    phone?: string | null
  } | null
  items: OrderItem[]
  creditNoteUsages?: Array<{
    amountUsed: number
    creditNote: {
      id: string
      creditNoteNumber: string
      amount: number
      balance: number
    }
  }>
}

interface InvoiceOptions {
  taxRate?: number
  paymentMethod?: string
  paymentTerms?: string
  dueInDays?: number
  notes?: string
  termsAndConditions?: string
  sellerAddress?: string
  sellerTaxId?: string
}

/**
 * Convierte una orden del sistema a datos de factura
 */
export function convertOrderToInvoice(
  order: Order,
  options: InvoiceOptions = {}
): InvoiceData {
  const {
    taxRate = 0.16, // 16% por defecto (México)
    paymentMethod = 'Transferencia Bancaria',
    paymentTerms = 'Pago a 30 días',
    dueInDays = 30,
    notes,
    termsAndConditions,
    sellerAddress = 'Dirección del vendedor',
    sellerTaxId
  } = options

  // Calcular totales
  const subtotal = order.items.reduce((sum, item) => {
    return sum + (item.quantity * item.priceAtOrder)
  }, 0)

  const taxAmount = subtotal * taxRate
  const totalBeforeCredits = subtotal + taxAmount
  
  // Calcular créditos aplicados (si existen)
  const creditNotesUsed = order.creditNoteUsages?.map((usage: any) => ({
    creditNoteId: usage.creditNote.id,
    creditNoteNumber: usage.creditNote.creditNoteNumber,
    amountUsed: usage.amountUsed,
    originalAmount: usage.creditNote.amount,
    remainingAmount: usage.creditNote.balance
  })) || []
  
  const totalCreditApplied = creditNotesUsed.reduce((sum: number, credit: any) => sum + credit.amountUsed, 0)
  const total = totalBeforeCredits - totalCreditApplied

  // Convertir items de orden a items de factura
  const invoiceItems: InvoiceItem[] = order.items.map(item => ({
    sku: item.product.sku,
    name: item.product.name,
    quantity: item.quantity,
    unit: item.product.unit,
    pricePerUnit: item.priceAtOrder,
    subtotal: item.quantity * item.priceAtOrder
  }))

  // Fecha de vencimiento
  const dueDate = new Date(order.createdAt)
  dueDate.setDate(dueDate.getDate() + dueInDays)

  // Información del vendedor (usar seller de la orden o valores por defecto)
  const sellerName = order.seller?.name || 'Nombre de tu Empresa'
  const sellerEmail = order.seller?.email || 'ventas@tuempresa.com'
  const sellerPhone = order.seller?.phone || '+1 234-567-8900'

  return {
    // Información de la factura
    invoiceNumber: order.orderNumber,
    invoiceDate: order.createdAt,
    dueDate,

    // Información del vendedor
    sellerName,
    sellerAddress,
    sellerPhone,
    sellerEmail,
    sellerTaxId,

    // Información del cliente
    clientName: order.client.name,
    clientBusinessName: order.client.businessName || undefined,
    clientAddress: order.client.address,
    clientPhone: order.client.phone,
    clientEmail: order.client.email,

    // Items
    items: invoiceItems,

    // Totales
    subtotal,
    taxRate,
    taxAmount,
    totalBeforeCredits,
    creditNotesUsed: creditNotesUsed.length > 0 ? creditNotesUsed : undefined,
    totalCreditApplied: totalCreditApplied > 0 ? totalCreditApplied : undefined,
    total,

    // Información adicional
    paymentMethod,
    paymentTerms,
    notes,
    termsAndConditions
  }
}

/**
 * Genera el número de factura basado en la fecha y orden
 */
export function generateInvoiceNumber(orderNumber: string, date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `INV-${year}${month}-${orderNumber}`
}

/**
 * Términos y condiciones por defecto en español
 */
export const DEFAULT_TERMS_ES = `
Esta factura está sujeta a los siguientes términos y condiciones:
1. Los productos entregados son propiedad del vendedor hasta que se realice el pago completo.
2. Las reclamaciones por productos defectuosos deben realizarse dentro de 7 días después de la entrega.
3. Los productos no son retornables después de 7 días de la entrega.
4. Garantía de calidad de 90 días desde la fecha de entrega.
5. Se aplicarán intereses moratorios del 2% mensual sobre pagos vencidos.
6. El comprador acepta todos los términos al recibir los productos.
`.trim()

/**
 * Términos de pago por defecto
 */
export const DEFAULT_PAYMENT_TERMS_ES = `
Pago a 30 días desde la fecha de emisión. Se aplican intereses moratorios del 2% mensual después de la fecha de vencimiento.
Métodos de pago aceptados: Transferencia bancaria, Efectivo, Cheque.
`.trim()
