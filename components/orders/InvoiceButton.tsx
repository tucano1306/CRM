// components/orders/InvoiceButton.tsx
'use client'

import { useState } from 'react'
import { FileText, Download, Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadInvoice, openInvoiceInNewTab, InvoiceData } from '@/lib/invoiceGenerator'
import { getSellerInfo, getInvoiceDefaults, getInvoiceTerms } from '@/lib/invoice-config'

interface OrderData {
  id: string
  orderNumber: string
  createdAt: string
  totalAmount: number
  notes?: string
  client: {
    name: string
    businessName?: string
    address: string
    phone: string
    email: string
  }
  seller: {
    name: string
    email: string
    phone: string
  }
  orderItems: Array<{
    productName: string
    quantity: number
    pricePerUnit: number
    subtotal: number
    product: {
      sku: string | null
      unit: string
    }
  }>
}

interface InvoiceButtonProps {
  order: OrderData
  variant?: 'download' | 'view' | 'both'
  size?: 'sm' | 'default' | 'lg'
}

export default function InvoiceButton({ 
  order, 
  variant = 'both',
  size = 'default'
}: InvoiceButtonProps) {
  const [generating, setGenerating] = useState(false)

  const prepareInvoiceData = (): InvoiceData => {
    // Obtener configuración centralizada
    const defaults = getInvoiceDefaults()
    const sellerInfo = getSellerInfo({
      name: order.seller.name,
      email: order.seller.email,
      phone: order.seller.phone,
    })
    const terms = getInvoiceTerms()

    // Calcular totales
    const subtotal = order.orderItems.reduce((sum, item) => sum + item.subtotal, 0)
    const taxRate = defaults.taxRate
    const taxAmount = subtotal * taxRate
    const total = subtotal + taxAmount

    // Calcular fecha de vencimiento
    const invoiceDate = new Date(order.createdAt)
    const dueDate = new Date(invoiceDate)
    dueDate.setDate(dueDate.getDate() + defaults.paymentTermsDays)

    return {
      // Información de la factura
      invoiceNumber: order.orderNumber,
      invoiceDate: invoiceDate,
      dueDate: dueDate,
      
      // Información del vendedor (desde configuración centralizada)
      ...sellerInfo,
      
      // Información del cliente
      clientName: order.client.name,
      clientBusinessName: order.client.businessName,
      clientAddress: order.client.address,
      clientPhone: order.client.phone,
      clientEmail: order.client.email,
      
      // Items
      items: order.orderItems.map(item => ({
        sku: item.product.sku,
        name: item.productName,
        quantity: item.quantity,
        unit: item.product.unit,
        pricePerUnit: item.pricePerUnit,
        subtotal: item.subtotal
      })),
      
      // Totales
      subtotal,
      taxRate,
      taxAmount,
      total,
      
      // Información adicional (desde configuración centralizada)
      paymentMethod: 'Transferencia Bancaria',
      paymentTerms: terms.paymentTerms,
      notes: order.notes || terms.notes,
      termsAndConditions: terms.termsAndConditions
    }
  }

  const handleDownload = async () => {
    try {
      setGenerating(true)
      const invoiceData = prepareInvoiceData()
      downloadInvoice(invoiceData, `Factura-${order.orderNumber}.pdf`)
    } catch (error) {
      console.error('Error generando factura:', error)
      alert('Error al generar la factura')
    } finally {
      setGenerating(false)
    }
  }

  const handleView = async () => {
    try {
      setGenerating(true)
      const invoiceData = prepareInvoiceData()
      openInvoiceInNewTab(invoiceData)
    } catch (error) {
      console.error('Error generando factura:', error)
      alert('Error al generar la factura')
    } finally {
      setGenerating(false)
    }
  }

  if (variant === 'both') {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          size={size}
          onClick={handleView}
          disabled={generating}
          className="gap-2"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Ver Factura
        </Button>
        <Button
          variant="default"
          size={size}
          onClick={handleDownload}
          disabled={generating}
          className="gap-2"
        >
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Descargar PDF
        </Button>
      </div>
    )
  }

  if (variant === 'view') {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleView}
        disabled={generating}
        className="gap-2"
      >
        {generating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        Ver Factura
      </Button>
    )
  }

  return (
    <Button
      variant="default"
      size={size}
      onClick={handleDownload}
      disabled={generating}
      className="gap-2"
    >
      {generating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Descargar Factura
    </Button>
  )
}
