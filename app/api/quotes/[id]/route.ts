// app/api/quotes/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener cotización específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        client: true,
        seller: true,
        convertedOrder: true
      }
    })

    if (!quote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: quote })
  } catch (error) {
    console.error('Error fetching quote:', error)
    return NextResponse.json({ error: 'Error al obtener cotización' }, { status: 500 })
  }
}

// PATCH - Actualizar cotización
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verificar que existe
    const existingQuote = await prisma.quote.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!existingQuote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // No permitir editar si ya fue enviada o convertida
    if (['SENT', 'ACCEPTED', 'CONVERTED'].includes(existingQuote.status)) {
      return NextResponse.json(
        { error: 'No se puede editar una cotización enviada o convertida' },
        { status: 400 }
      )
    }

    // Preparar datos de actualización
    const updateData: any = {}

    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.validUntil !== undefined) updateData.validUntil = new Date(body.validUntil)
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.termsAndConditions !== undefined) updateData.termsAndConditions = body.termsAndConditions
    if (body.discount !== undefined) updateData.discount = body.discount

    // Si se actualizan items
    if (body.items && Array.isArray(body.items)) {
      // Eliminar items antiguos
      await prisma.quoteItem.deleteMany({
        where: { quoteId: id }
      })

      // Calcular nuevos totales
      const subtotal = body.items.reduce((sum: number, item: any) => {
        return sum + (item.quantity * item.pricePerUnit)
      }, 0)
      
      const discount = body.discount || existingQuote.discount
      const tax = (subtotal - discount) * 0.10
      const totalAmount = subtotal - discount + tax

      updateData.subtotal = subtotal
      updateData.tax = tax
      updateData.totalAmount = totalAmount

      updateData.items = {
        create: body.items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          description: item.description,
          quantity: item.quantity,
          pricePerUnit: item.pricePerUnit,
          discount: item.discount || 0,
          subtotal: item.quantity * item.pricePerUnit,
          notes: item.notes
        }))
      }
    }

    // Actualizar cotización
    const updatedQuote = await prisma.quote.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            product: true
          }
        },
        client: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedQuote,
      message: 'Cotización actualizada exitosamente'
    })
  } catch (error) {
    console.error('Error updating quote:', error)
    return NextResponse.json({ error: 'Error al actualizar cotización' }, { status: 500 })
  }
}

// DELETE - Eliminar cotización
export async function DELETE(
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
    const existingQuote = await prisma.quote.findUnique({
      where: { id }
    })

    if (!existingQuote) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // No permitir eliminar si ya fue convertida
    if (existingQuote.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'No se puede eliminar una cotización convertida en orden' },
        { status: 400 }
      )
    }

    // Eliminar cotización (los items se eliminan en cascada)
    await prisma.quote.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Cotización eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error deleting quote:', error)
    return NextResponse.json({ error: 'Error al eliminar cotización' }, { status: 500 })
  }
}
