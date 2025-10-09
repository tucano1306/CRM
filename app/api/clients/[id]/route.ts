import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'



export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await prisma.client.findUnique({
      where: { id: params.id },
      include: {
        seller: true,
        users: true,
        orders: {
          include: {
            items: true
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })
    
    if (!client) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cliente no encontrado' 
        },
        { status: 404 }
      )
    }

    // Calcular estadísticas
    const stats = await prisma.order.aggregate({
      where: { 
        clientId: params.id,
        status: 'COMPLETED'
      },
      _sum: { totalAmount: true },
      _count: true
    })

    const totalOrders = await prisma.order.count({
      where: { clientId: params.id }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...client,
        stats: {
          totalOrders,
          completedOrders: stats._count,
          totalSpent: stats._sum.totalAmount || 0
        }
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener cliente' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const updatedClient = await prisma.client.update({
      where: { id: params.id },
      data: body,
      include: { seller: true }
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: updatedClient
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar cliente' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar si tiene órdenes
    const ordersCount = await prisma.order.count({
      where: { clientId: params.id }
    })

    if (ordersCount > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No se puede eliminar un cliente con órdenes existentes' 
        },
        { status: 400 }
      )
    }

    await prisma.client.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al eliminar cliente' 
      },
      { status: 500 }
    )
  }
}