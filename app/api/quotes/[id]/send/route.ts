// app/api/quotes/[id]/send/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
        client: true,
        items: true
      }
    })

    if (!quote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Solo se puede enviar si está en DRAFT
    if (quote.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Solo se pueden enviar cotizaciones en borrador' },
        { status: 400 }
      )
    }

    // Actualizar estado a SENT
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date()
      },
      include: {
        client: true,
        items: true
      }
    })

    // TODO: Aquí puedes agregar envío de email al cliente
    // sendQuoteEmail(updatedQuote)

    return NextResponse.json({
      success: true,
      data: updatedQuote,
      message: 'Cotización enviada exitosamente'
    })
  } catch (error) {
    console.error('Error sending quote:', error)
    return NextResponse.json({ error: 'Error al enviar cotización' }, { status: 500 })
  }
}
