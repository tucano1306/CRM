import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Obtener orden por ID con detalles completos
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            businessName: true,
            email: true,
            phone: true,
            address: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                unit: true,
                price: true,
                stock: true
              }
            }
          }
        }
      }
    })
    
    if (!order) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Orden no encontrada' 
        },
        { status: 404 }
      )
    }

    // Calcular estadísticas de la orden
    const stats = {
      totalItems: order.items.length,
      confirmedItems: order.items.filter(item => item.confirmed).length,
      pendingItems: order.items.filter(item => !item.confirmed).length,
      totalAmount: order.totalAmount
    }

    return NextResponse.json({
      success: true,
      data: {
        ...order,
        stats
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener orden' 
      },
      { status: 500 }
    )
  }
}

// PUT - Actualizar orden
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { status, notes } = body

    // Verificar que la orden existe
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Orden no encontrada' 
        },
        { status: 404 }
      )
    }

    // No permitir actualizar órdenes completadas o canceladas
    if (existingOrder.status === 'COMPLETED' || existingOrder.status === 'CANCELED') {
      return NextResponse.json(
        { 
          success: false,
          error: `No se puede actualizar una orden ${existingOrder.status}` 
        },
        { status: 400 }
      )
    }

    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status,
        notes
      },
      include: {
        client: true,
        seller: true,
        items: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Orden actualizada exitosamente',
      data: updatedOrder
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar orden' 
      },
      { status: 500 }
    )
  }
}

// DELETE - Cancelar orden
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar que la orden existe
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Orden no encontrada' 
        },
        { status: 404 }
      )
    }

    // Solo se pueden cancelar órdenes PENDING o PLACED
    if (existingOrder.status !== 'PENDING' && existingOrder.status !== 'PLACED') {
      return NextResponse.json(
        { 
          success: false,
          error: `No se puede cancelar una orden con estado ${existingOrder.status}` 
        },
        { status: 400 }
      )
    }

    // Actualizar estado a CANCELED (soft delete)
    await prisma.order.update({
      where: { id: params.id },
      data: { status: 'CANCELED' }
    })

    return NextResponse.json({
      success: true,
      message: 'Orden cancelada exitosamente'
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al cancelar orden' 
      },
      { status: 500 }
    )
  }
}