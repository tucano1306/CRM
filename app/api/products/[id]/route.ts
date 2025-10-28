import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateProductSchema, validateSchema } from '@/lib/validations'
import DOMPurify from 'isomorphic-dompurify'

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
// ✅ CON VALIDACIÓN ZOD
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params
  try {
    const body = await request.json()

    // ✅ VALIDACIÓN CON ZOD
    const validation = validateSchema(updateProductSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Datos inválidos',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    // ✅ SANITIZACIÓN
    const sanitizedData: any = {}
    
    if (validation.data.name) {
      sanitizedData.name = DOMPurify.sanitize(validation.data.name.trim())
    }
    if (validation.data.description !== undefined) {
      sanitizedData.description = validation.data.description ? 
        DOMPurify.sanitize(validation.data.description.trim()) : ''
    }
    if (validation.data.unit) {
      sanitizedData.unit = validation.data.unit
    }
    if (validation.data.price !== undefined) {
      sanitizedData.price = validation.data.price
    }
    if (validation.data.stock !== undefined) {
      sanitizedData.stock = validation.data.stock
    }
    if (validation.data.sku !== undefined) {
      sanitizedData.sku = validation.data.sku ? 
        DOMPurify.sanitize(validation.data.sku.trim()) : null
    }
    if (validation.data.imageUrl !== undefined) {
      sanitizedData.imageUrl = validation.data.imageUrl || null
    }
    if (validation.data.isActive !== undefined) {
      sanitizedData.isActive = validation.data.isActive
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: sanitizedData,
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