import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener producto por ID con estadísticas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        sellers: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        orderItems: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            order: {
              select: {
                id: true,
                status: true,
                createdAt: true,
                client: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    })
    
    if (!product) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Producto no encontrado' 
        },
        { status: 404 }
      )
    }

    // Calcular estadísticas
    const stats = await prisma.orderItem.aggregate({
      where: { 
        productId: productId,
        order: { status: 'COMPLETED' }
      },
      _sum: { quantity: true },
      _count: true
    })

    return NextResponse.json({
      success: true,
      data: {
        ...product,
        stats: {
          totalOrders: stats._count,
          totalSold: stats._sum.quantity || 0,
          stockStatus: product.stock > 10 ? 'good' : product.stock > 0 ? 'low' : 'out'
        }
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener producto' 
      },
      { status: 500 }
    )
  }
}

// PUT - Actualizar producto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params
  try {
    const body = await request.json()
    const { price, stock } = body

    // Validar valores positivos si se actualizan
    if (price !== undefined && price < 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'El precio debe ser un valor positivo' 
        },
        { status: 400 }
      )
    }

    if (stock !== undefined && stock < 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'El stock debe ser un valor positivo' 
        },
        { status: 400 }
      )
    }

    // Convertir tipos si es necesario
    const updateData: any = { ...body }
    if (price !== undefined) updateData.price = parseFloat(price.toString())
    if (stock !== undefined) updateData.stock = parseInt(stock.toString())

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        sellers: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: updatedProduct
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar producto' 
      },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar producto
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params  // ✅ CORRECTO
  try {
    // Verificar si tiene órdenes
    const orderItemsCount = await prisma.orderItem.count({
      where: { productId: productId }
    })

    if (orderItemsCount > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No se puede eliminar un producto que tiene órdenes asociadas. Considere desactivarlo en su lugar.' 
        },
        { status: 400 }
      )
    }

    await prisma.product.delete({
      where: { id: productId }
    })

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al eliminar producto' 
      },
      { status: 500 }
    )
  }
}