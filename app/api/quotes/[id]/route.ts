// app/api/quotes/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyQuoteUpdated } from '@/lib/notifications'
import logger, { LogCategory } from '@/lib/logger'

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

    // No permitir editar si ya fue enviada o convertida (excepto cambio de estado por comprador)
    const isStatusChange = body.status && ['ACCEPTED', 'REJECTED'].includes(body.status)
    
    if (['SENT', 'ACCEPTED', 'CONVERTED'].includes(existingQuote.status) && !isStatusChange) {
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
    
    // Manejar cambio de estado (aceptar/rechazar por comprador)
    if (isStatusChange) {
      updateData.status = body.status
      
      // Crear notificación para el vendedor
      if (existingQuote.sellerId) {
        const statusMessage = body.status === 'ACCEPTED' 
          ? `✅ ha aceptado la cotización #${existingQuote.quoteNumber} por $${existingQuote.totalAmount.toFixed(2)}`
          : `❌ ha rechazado la cotización #${existingQuote.quoteNumber}`
        
        await prisma.notification.create({
          data: {
            type: body.status === 'ACCEPTED' ? 'QUOTE_ACCEPTED' : 'QUOTE_REJECTED',
            title: body.status === 'ACCEPTED' ? '✅ Cotización Aceptada' : '❌ Cotización Rechazada',
            message: `El cliente ${statusMessage}`,
            sellerId: existingQuote.sellerId,
            relatedId: existingQuote.id,
            isRead: false
          }
        })
      }
    }

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

    // 🔔 ENVIAR NOTIFICACIÓN AL COMPRADOR sobre cambios en la cotización
    try {
      // Detectar qué cambió
      const changes: string[] = []
      if (body.title !== undefined) changes.push('Título modificado')
      if (body.validUntil !== undefined) changes.push('Fecha de validez actualizada')
      if (body.items) changes.push('Items actualizados')
      if (body.discount !== undefined) changes.push('Descuento modificado')
      
      await notifyQuoteUpdated(
        updatedQuote.clientId,
        updatedQuote.id,
        updatedQuote.quoteNumber,
        changes.length > 0 ? changes : ['Cotización actualizada']
      )
      
      logger.info(
        LogCategory.API,
        'Quote update notification sent to client',
        {
          clientId: updatedQuote.clientId,
          quoteId: id,
          changes
        }
      )
    } catch (notifError) {
      // No bloquear la respuesta si falla la notificación
      logger.error(
        LogCategory.API,
        'Error sending quote update notification',
        notifError
      )
    }

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
