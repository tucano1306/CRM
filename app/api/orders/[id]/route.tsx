import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

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
    const newStatus = body.status
    const notes = body.notes

    // Validar estado
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED']
    if (newStatus && !validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      )
    }

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

    // Construir objeto de actualización
    const updateData: {
      status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED'
      notes?: string | null
    } = {}
    
    if (newStatus) {
      updateData.status = newStatus as 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED'
    }
    
    if (notes !== undefined) {
      updateData.notes = notes
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