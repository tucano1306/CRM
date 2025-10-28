import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'
import { updateOrderSchema, validateSchema } from '@/lib/validations'
import DOMPurify from 'isomorphic-dompurify'

const prisma = new PrismaClient()

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
    await prisma.$disconnect()
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

    // ✅ VALIDACIÓN CON ZOD
    const validation = validateSchema(updateOrderSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: validation.errors
      }, { status: 400 })
    }

    const { status, notes, deliveryAddress, deliveryInstructions } = validation.data

    // Verificar que la orden existe
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // ✅ CONSTRUIR OBJETO DE ACTUALIZACIÓN CON SANITIZACIÓN
    const updateData: any = {}
    
    if (status) {
      updateData.status = status
    }
    
    if (notes !== undefined) {
      updateData.notes = notes ? DOMPurify.sanitize(notes.trim()) : null
    }
    
    if (deliveryAddress !== undefined) {
      updateData.deliveryAddress = DOMPurify.sanitize(deliveryAddress.trim())
    }
    
    if (deliveryInstructions !== undefined) {
      updateData.deliveryInstructions = DOMPurify.sanitize(deliveryInstructions.trim())
    }

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
      },
    })

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