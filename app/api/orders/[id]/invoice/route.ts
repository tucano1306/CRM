/**
 * 📄 Invoice Generation API (Updated with Workers)
 * POST /api/orders/[id]/invoice - Generar factura usando workers
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { generateInvoiceAsync, generateInvoice } from '@/lib/invoiceGeneratorAsync'
import type { InvoiceData } from '@/lib/invoiceGeneratorAsync'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * POST /api/orders/[id]/invoice - Generar factura
 * Ejemplo de uso del nuevo sistema de workers
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: orderId } = await params
    const body = await request.json()
    
    // Opciones de generación
    const { 
      async = true,       // Por defecto async para mejor UX
      priority = 1,
      useWorker = true    // Permitir desactivar workers si es necesario
    } = body

    // Datos de ejemplo para demostrar el sistema
    const invoiceData: InvoiceData = {
      invoiceNumber: `INV-${orderId.slice(-8).toUpperCase()}`,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días

      // Seller info
      sellerCompany: 'Mi Empresa',
      sellerEmail: 'empresa@ejemplo.com',
      sellerPhone: '+1234567890',

      // Client info
      clientName: 'Cliente Demo',
      clientEmail: 'cliente@ejemplo.com',
      clientPhone: '+0987654321',

      // Items de ejemplo
      items: [
        {
          sku: 'PROD001',
          name: 'Producto de Ejemplo',
          quantity: 2,
          unit: 'pcs',
          pricePerUnit: 25,
          subtotal: 50
        },
        {
          sku: 'PROD002',
          name: 'Otro Producto',
          quantity: 1,
          unit: 'pcs',
          pricePerUnit: 75,
          subtotal: 75
        }
      ],

      // Totales
      subtotal: 125,
      discount: 5,
      tax: 12,
      total: 132,

      terms: 'Pago a 30 días. Intereses por mora según la ley.'
    }

    // Generar factura
    if (async) {
      // Modo asíncrono - retorna job ID para polling
      const result = await generateInvoiceAsync(invoiceData, {
        priority,
        useWorker
      })

      return NextResponse.json({
        success: true,
        data: {
          jobId: result.jobId,
          status: result.status,
          message: 'Invoice generation started. Use the jobId to check status.',
          pollUrl: `/api/jobs/${result.jobId}`,
          downloadUrl: `/api/jobs/${result.jobId}/download`
        }
      })

    } else {
      // Modo síncrono - espera el resultado (backward compatibility)
      console.log('🔄 Synchronous PDF generation requested (may block)')
      
      const pdfBuffer = await generateInvoice(invoiceData, {
        priority,
        useWorker,
        async: false
      })

      if (!Buffer.isBuffer(pdfBuffer)) {
        throw new Error('Expected PDF buffer but got job result')
      }

      // Retornar PDF directamente
      const response = new Response(pdfBuffer as any, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="factura-${orderId}.pdf"`,
          'Content-Length': pdfBuffer.length.toString()
        }
      })
      
      return response
    }

  } catch (error) {
    console.error('❌ Error generating invoice:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate invoice',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}