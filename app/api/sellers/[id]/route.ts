import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'



// GET - Obtener seller por ID con estadísticas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const seller = await prisma.seller.findUnique({
      where: { id },
      include: {
        clients: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true
          }
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            client: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            clients: true,
            orders: true,
            products: true
          }
        }
      }
    })
    
    if (!seller) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Seller no encontrado' 
        },
        { status: 404 }
      )
    }

    // Calcular estadísticas
    const stats = await prisma.order.aggregate({
      where: { 
        sellerId: id,
        status: 'COMPLETED'
      },
      _sum: { totalAmount: true },
      _count: true
    })

    const totalOrders = await prisma.order.count({
      where: { sellerId: id }
    })

    const pendingOrders = await prisma.order.count({
      where: { 
        sellerId: id,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...seller,
        stats: {
          totalClients: seller._count.clients,
          totalProducts: seller._count.products,
          totalOrders,
          completedOrders: stats._count,
          pendingOrders,
          totalRevenue: stats._sum.totalAmount || 0,
          commission: seller.commission 
            ? (stats._sum.totalAmount || 0) * (seller.commission / 100)
            : 0
        }
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener seller' 
      },
      { status: 500 }
    )
  }
}

// PUT - Actualizar seller
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { commission } = body

    // Convertir tipos si es necesario
    const updateData: any = { ...body }
    if (commission !== undefined) {
      updateData.commission = parseFloat(commission.toString())
    }

    const updatedSeller = await prisma.seller.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: {
            clients: true,
            orders: true,
            products: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Seller actualizado exitosamente',
      data: updatedSeller
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar seller' 
      },
      { status: 500 }
    )
  }
}

// DELETE - Desactivar seller (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // No eliminar, solo desactivar
    await prisma.seller.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: 'Seller desactivado exitosamente'
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al desactivar seller' 
      },
      { status: 500 }
    )
  }
}