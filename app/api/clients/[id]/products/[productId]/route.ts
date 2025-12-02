import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db-retry'

/**
 * 🔐 API para gestionar un producto específico en el catálogo de un cliente
 * 
 * GET    - Obtener detalle del producto para este cliente
 * PATCH  - Actualizar precio/visibilidad/notas
 * DELETE - Eliminar producto del catálogo del cliente
 */

// GET - Detalle de un producto del cliente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: clientId, productId } = await params

    const clientProduct = await withDbRetry(() =>
      prisma.clientProduct.findUnique({
        where: {
          clientId_productId: { clientId, productId }
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              stock: true,
              unit: true,
              category: true,
              imageUrl: true,
              sku: true,
              isActive: true,
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    )

    if (!clientProduct) {
      return NextResponse.json(
        { error: 'Producto no encontrado en el catálogo del cliente' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        clientProductId: clientProduct.id,
        productId: clientProduct.product.id,
        name: clientProduct.product.name,
        description: clientProduct.product.description,
        basePrice: clientProduct.product.price,
        customPrice: clientProduct.customPrice,
        stock: clientProduct.product.stock,
        unit: clientProduct.product.unit,
        category: clientProduct.product.category,
        imageUrl: clientProduct.product.imageUrl,
        sku: clientProduct.product.sku,
        isActive: clientProduct.product.isActive,
        isVisible: clientProduct.isVisible,
        notes: clientProduct.notes,
        client: clientProduct.client,
      }
    })

  } catch (error) {
    console.error('❌ [GET CLIENT PRODUCT] Error:', error)
    return NextResponse.json(
      { error: 'Error obteniendo producto del cliente' },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar producto del cliente (precio, visibilidad, notas)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: clientId, productId } = await params
    const body = await request.json()

    // Verificar que el usuario es vendedor
    const user = await withDbRetry(() =>
      prisma.authenticated_users.findUnique({
        where: { authId: userId }
      })
    )

    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Solo vendedores pueden gestionar catálogos' },
        { status: 403 }
      )
    }

    // Verificar que existe la relación cliente-producto
    const existing = await withDbRetry(() =>
      prisma.clientProduct.findUnique({
        where: {
          clientId_productId: { clientId, productId }
        },
        include: {
          product: { select: { name: true, price: true } },
          client: { select: { name: true } }
        }
      })
    )

    if (!existing) {
      return NextResponse.json(
        { error: 'Producto no encontrado en el catálogo del cliente' },
        { status: 404 }
      )
    }

    /**
     * Campos actualizables:
     * - customPrice: number | null (null = usar precio base)
     * - isVisible: boolean
     * - notes: string | null
     */
    const updateData: any = {}

    if (body.customPrice !== undefined) {
      // Si es null, usar precio base del producto
      updateData.customPrice = body.customPrice !== null
        ? parseFloat(body.customPrice)
        : existing.product.price
    }

    if (body.isVisible !== undefined) {
      updateData.isVisible = Boolean(body.isVisible)
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes || null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      )
    }

    const updated = await withDbRetry(() =>
      prisma.clientProduct.update({
        where: {
          clientId_productId: { clientId, productId }
        },
        data: updateData,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              price: true,
              stock: true,
              unit: true,
            }
          }
        }
      })
    )

    console.log(`✅ [PATCH CLIENT PRODUCT] Actualizado: ${existing.product.name} para ${existing.client.name}`)
    console.log(`   - Precio: $${updated.customPrice}`)
    console.log(`   - Visible: ${updated.isVisible}`)

    return NextResponse.json({
      success: true,
      message: 'Producto actualizado',
      data: {
        productId: updated.productId,
        name: updated.product.name,
        basePrice: updated.product.price,
        customPrice: updated.customPrice,
        isVisible: updated.isVisible,
        notes: updated.notes,
      }
    })

  } catch (error) {
    console.error('❌ [PATCH CLIENT PRODUCT] Error:', error)
    return NextResponse.json(
      { error: 'Error actualizando producto del cliente' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar producto del catálogo del cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: clientId, productId } = await params

    // Verificar que el usuario es vendedor
    const user = await withDbRetry(() =>
      prisma.authenticated_users.findUnique({
        where: { authId: userId }
      })
    )

    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Solo vendedores pueden gestionar catálogos' },
        { status: 403 }
      )
    }

    // Verificar que existe
    const existing = await withDbRetry(() =>
      prisma.clientProduct.findUnique({
        where: {
          clientId_productId: { clientId, productId }
        },
        include: {
          product: { select: { name: true } },
          client: { select: { name: true } }
        }
      })
    )

    if (!existing) {
      return NextResponse.json(
        { error: 'Producto no encontrado en el catálogo del cliente' },
        { status: 404 }
      )
    }

    await withDbRetry(() =>
      prisma.clientProduct.delete({
        where: {
          clientId_productId: { clientId, productId }
        }
      })
    )

    console.log(`✅ [DELETE CLIENT PRODUCT] Eliminado: ${existing.product.name} del catálogo de ${existing.client.name}`)

    return NextResponse.json({
      success: true,
      message: `Producto "${existing.product.name}" eliminado del catálogo`
    })

  } catch (error) {
    console.error('❌ [DELETE CLIENT PRODUCT] Error:', error)
    return NextResponse.json(
      { error: 'Error eliminando producto del catálogo' },
      { status: 500 }
    )
  }
}
