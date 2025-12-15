// app/api/quotes/[id]/convert/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// ✅ Este endpoint no requiere body, solo convierte la quote existente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que existe
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        client: true
      }
    })

    if (!quote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Verificar que fue aceptada o al menos enviada
    if (!['SENT', 'VIEWED', 'ACCEPTED'].includes(quote.status)) {
      return NextResponse.json(
        { error: 'Solo se pueden convertir cotizaciones enviadas o aceptadas' },
        { status: 400 }
      )
    }

    // Verificar que no expiró
    if (new Date() > quote.validUntil) {
      return NextResponse.json(
        { error: 'La cotización ha expirado' },
        { status: 400 }
      )
    }

    // Verificar que no ya fue convertida
    if (quote.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'Esta cotización ya fue convertida en orden' },
        { status: 400 }
      )
    }

    // Generar número de orden
    const orderNumber = `ORD-${Date.now()}${Math.random().toString(36).substring(2, 11).toUpperCase()}`

    // Crear orden
    const order = await prisma.order.create({
      data: {
        orderNumber,
        clientId: quote.clientId,
        sellerId: quote.sellerId,
        status: 'PENDING',
        totalAmount: quote.totalAmount,
        notes: `Orden generada desde cotización ${quote.quoteNumber}\n\n${quote.notes || ''}`,
        orderItems: {
          create: quote.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            subtotal: item.subtotal,
            itemNote: item.notes
          }))
        }
      },
      include: {
        orderItems: true
      }
    })

    // Actualizar cotización como convertida
    await prisma.quote.update({
      where: { id },
      data: {
        status: 'CONVERTED',
        convertedOrderId: order.id
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        order,
        quote: { ...quote, status: 'CONVERTED' }
      },
      message: 'Cotización convertida en orden exitosamente'
    })
  } catch (error) {
    console.error('Error converting quote:', error)
    return NextResponse.json({ error: 'Error al convertir cotización' }, { status: 500 })
  }
}
