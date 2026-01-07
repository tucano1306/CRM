import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { updateOrderSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'
import { notifyOrderModified } from '@/lib/notifications'

// Usar singleton de Prisma para evitar múltiples conexiones en serverless

// GET /api/orders/[id] - Obtener orden específica
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const params = await context.params
    const orderId = params.id

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        client: true,
        seller: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error) {
    console.error('Error obteniendo orden:', error)
    return NextResponse.json(
      { error: 'Error obteniendo orden' },
      { status: 500 }
    )
  } finally {
    // No desconectar el singleton en cada request
  }
}

function buildUpdateData(status: any, notes: any, deliveryAddress: any, deliveryInstructions: any) {
  const updateData: any = {}
  
  if (status) {
    updateData.status = status
  }
  
  if (notes !== undefined) {
    updateData.notes = notes ? sanitizeText(notes) : null
  }
  
  if (deliveryAddress !== undefined) {
    updateData.deliveryAddress = sanitizeText(deliveryAddress)
  }
  
  if (deliveryInstructions !== undefined) {
    updateData.deliveryInstructions = sanitizeText(deliveryInstructions)
  }

  return updateData
}

function buildChangesList(status: any, notes: any, deliveryAddress: any, deliveryInstructions: any) {
  const changes: string[] = []
  if (status) changes.push(`Estado: ${status}`)
  if (notes !== undefined) changes.push('Notas')
  if (deliveryAddress !== undefined) changes.push('Dirección de entrega')
  if (deliveryInstructions !== undefined) changes.push('Instrucciones de entrega')
  return changes
}

async function sendOrderModifiedNotification(updatedOrder: any, changes: string[]) {
  if (updatedOrder.sellerId && changes.length > 0) {
    await notifyOrderModified(
      updatedOrder.sellerId,
      updatedOrder.id,
      updatedOrder.orderNumber,
      updatedOrder.client?.name || 'Cliente',
      'Comprador',
      changes
    ).catch(err => console.error('Error creando notificación:', err))
  }
}

// PATCH /api/orders/[id] - Actualizar estado de la orden
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const params = await context.params
    const orderId = params.id
    const body = await request.json()

    const validation = validateSchema(updateOrderSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: validation.errors
      }, { status: 400 })
    }

    const { status, notes, deliveryAddress, deliveryInstructions } = validation.data

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    const updateData = buildUpdateData(status, notes, deliveryAddress, deliveryInstructions)

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        client: true,
        seller: true,
      },
    })

    const changes = buildChangesList(status, notes, deliveryAddress, deliveryInstructions)
    await sendOrderModifiedNotification(updatedOrder, changes)

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Orden actualizada exitosamente',
    })
  } catch (error) {
    console.error('Error actualizando orden:', error)
    return NextResponse.json(
      { error: 'Error actualizando orden: ' + (error as Error).message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// PUT /api/orders/[id] - Alias para PATCH (por compatibilidad)
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(request, context)
}