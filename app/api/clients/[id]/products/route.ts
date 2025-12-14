import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db-retry'

/**
 * 🔐 API para gestionar el catálogo personalizado de un cliente
 * 
 * GET    /api/clients/[id]/products - Lista productos asignados al cliente
 * POST   /api/clients/[id]/products - Asigna productos al cliente con precios personalizados
 * DELETE /api/clients/[id]/products - Elimina productos del catálogo del cliente
 */

// GET - Lista de productos asignados al cliente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: clientId } = await params

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

    // Verificar que el cliente existe
    const client = await withDbRetry(() =>
      prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true, email: true }
      })
    )

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Obtener productos asignados al cliente
    const clientProducts = await withDbRetry(() =>
      prisma.clientProduct.findMany({
        where: { clientId },
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
          }
        },
        orderBy: { product: { name: 'asc' } }
      })
    )

    // Transformar para incluir precio base y personalizado
    const products = clientProducts.map(cp => ({
      clientProductId: cp.id,
      productId: cp.product.id,
      name: cp.product.name,
      description: cp.product.description,
      basePrice: cp.product.price, // Precio base del producto
      customPrice: cp.customPrice, // Precio para este cliente
      stock: cp.product.stock,
      unit: cp.product.unit,
      category: cp.product.category,
      imageUrl: cp.product.imageUrl,
      sku: cp.product.sku,
      isActive: cp.product.isActive,
      isVisible: cp.isVisible,
      notes: cp.notes,
      createdAt: cp.createdAt,
      updatedAt: cp.updatedAt,
    }))

    console.log(`✅ [CLIENT PRODUCTS] Cliente ${client.name}: ${products.length} productos asignados`)

    return NextResponse.json({
      success: true,
      data: {
        client,
        products,
        total: products.length
      }
    })

  } catch (error) {
    console.error('❌ [GET CLIENT PRODUCTS] Error:', error)
    return NextResponse.json(
      { error: 'Error obteniendo catálogo del cliente' },
      { status: 500 }
    )
  }
}

// POST - Asignar productos al cliente
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: clientId } = await params
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

    // Verificar que el cliente existe
    const client = await withDbRetry(() =>
      prisma.client.findUnique({ where: { id: clientId } })
    )

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    /**
     * Formato del body:
     * {
     *   products: [
     *     { productId: "...", customPrice: 100.50, isVisible: true, notes: "..." },
     *     { productId: "...", customPrice: null }, // null = usar precio base
     *   ]
     * }
     */
    const { products } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de productos' },
        { status: 400 }
      )
    }

    // Verificar que todos los productos existen
    const productIds = products.map((p: any) => p.productId)
    const existingProducts = await withDbRetry(() =>
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, price: true }
      })
    )

    if (existingProducts.length !== productIds.length) {
      const foundIds = existingProducts.map(p => p.id)
      const missingIds = productIds.filter((id: string) => !foundIds.includes(id))
      return NextResponse.json(
        { error: `Productos no encontrados: ${missingIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Crear mapa de precios base para validación
    const basePriceMap = new Map(existingProducts.map(p => [p.id, p.price]))

    // Crear los registros de ClientProduct usando upsert
    const results = await Promise.all(
      products.map(async (p: any) => {
        // Si no se especifica customPrice, usar precio base
        const basePrice = basePriceMap.get(p.productId) ?? 0
        const finalPrice = p.customPrice !== undefined && p.customPrice !== null
          ? parseFloat(p.customPrice)
          : basePrice

        return withDbRetry(() =>
          prisma.clientProduct.upsert({
            where: {
              clientId_productId: {
                clientId,
                productId: p.productId
              }
            },
            update: {
              customPrice: finalPrice,
              isVisible: p.isVisible === undefined ? true : p.isVisible,
              notes: p.notes || null,
              updatedAt: new Date()
            },
            create: {
              clientId,
              productId: p.productId,
              customPrice: finalPrice,
              isVisible: p.isVisible === undefined ? true : p.isVisible,
              notes: p.notes || null,
            }
          })
        )
      })
    )

    console.log(`✅ [POST CLIENT PRODUCTS] Asignados ${results.length} productos al cliente ${client.name}`)

    return NextResponse.json({
      success: true,
      message: `${results.length} productos asignados al cliente`,
      data: results
    })

  } catch (error) {
    console.error('❌ [POST CLIENT PRODUCTS] Error:', error)
    return NextResponse.json(
      { error: 'Error asignando productos al cliente' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar productos del catálogo del cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: clientId } = await params
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

    /**
     * Formato del body:
     * { productIds: ["...", "..."] }
     * 
     * Si no se envía productIds, se elimina TODO el catálogo
     */
    const { productIds } = body

    if (productIds && Array.isArray(productIds) && productIds.length > 0) {
      // Eliminar productos específicos
      const result = await withDbRetry(() =>
        prisma.clientProduct.deleteMany({
          where: {
            clientId,
            productId: { in: productIds }
          }
        })
      )

      console.log(`✅ [DELETE CLIENT PRODUCTS] Eliminados ${result.count} productos del cliente ${clientId}`)

      return NextResponse.json({
        success: true,
        message: `${result.count} productos eliminados del catálogo`,
        deleted: result.count
      })
    } else {
      // Eliminar TODO el catálogo
      const result = await withDbRetry(() =>
        prisma.clientProduct.deleteMany({
          where: { clientId }
        })
      )

      console.log(`✅ [DELETE CLIENT PRODUCTS] Catálogo completo eliminado: ${result.count} productos`)

      return NextResponse.json({
        success: true,
        message: `Catálogo eliminado: ${result.count} productos`,
        deleted: result.count
      })
    }

  } catch (error) {
    console.error('❌ [DELETE CLIENT PRODUCTS] Error:', error)
    return NextResponse.json(
      { error: 'Error eliminando productos del catálogo' },
      { status: 500 }
    )
  }
}
