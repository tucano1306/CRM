import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { updateProductSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build sanitized data object from validated input
 */
function buildSanitizedProductData(validatedData: any): Record<string, any> {
  const sanitizedData: Record<string, any> = {}

  if (validatedData.name) {
    sanitizedData.name = sanitizeText(validatedData.name)
  }
  if (validatedData.description !== undefined) {
    sanitizedData.description = validatedData.description
      ? sanitizeText(validatedData.description)
      : ''
  }
  if (validatedData.unit) {
    sanitizedData.unit = validatedData.unit
  }
  if (validatedData.price !== undefined) {
    sanitizedData.price = validatedData.price
  }
  if (validatedData.stock !== undefined) {
    sanitizedData.stock = validatedData.stock
  }
  if (validatedData.sku !== undefined) {
    sanitizedData.sku = validatedData.sku ? sanitizeText(validatedData.sku) : null
  }
  if (validatedData.imageUrl !== undefined) {
    sanitizedData.imageUrl = validatedData.imageUrl || null
  }
  if (validatedData.isActive !== undefined) {
    sanitizedData.isActive = validatedData.isActive
  }
  if (validatedData.category !== undefined) {
    sanitizedData.category = validatedData.category
  }

  return sanitizedData
}

/**
 * Verify seller authorization for product updates
 */
async function verifySeller(userId: string) {
  return prisma.seller.findFirst({
    where: {
      authenticated_users: {
        some: { authId: userId }
      }
    }
  })
}

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
// ✅ CON VALIDACIÓN ZOD Y SEGURIDAD DE ROL
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔒 SEGURIDAD: Verificar que es un vendedor
    const seller = await verifySeller(userId)

    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'Solo vendedores pueden actualizar productos' },
        { status: 403 }
      )
    }

    const body = await request.json()

    // 🔒 CRÍTICO: Log price updates
    if (body.price !== undefined) {
      console.log(`💰 [PRICE UPDATE] Seller ${seller.id} updating price for product ${productId}`)
    }

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

    // ✅ SANITIZACIÓN using helper function
    const sanitizedData = buildSanitizedProductData(validation.data)

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