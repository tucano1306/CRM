import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { sendCartUpdateEvent } from '@/lib/supabase-server'
import { z } from 'zod'

// Schema para batch add to cart
const batchAddToCartSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1, 'ProductId requerido'),
    quantity: z.number().int().positive('Cantidad debe ser mayor a 0'),
  })).min(1, 'Debe incluir al menos un producto'),
})

type BatchItem = {
  productId: string
  quantity: number
}

type BatchResult = {
  productId: string
  success: boolean
  error?: string
  productName?: string
}

// POST /api/buyer/cart/batch - Agregar múltiples productos al carrito en una sola llamada
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Validación
    const validation = batchAddToCartSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validation.error.issues
        },
        { status: 400 }
      )
    }

    const { items } = validation.data
    const results: BatchResult[] = []
    let successCount = 0
    let failCount = 0

    // Buscar o crear carrito
    let cart = await prisma.cart.findFirst({
      where: { userId },
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      })
    }

    // Obtener todos los productos de una vez (optimización)
    const productIds = items.map(item => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    // Crear mapa para búsqueda rápida
    const productMap = new Map(products.map(p => [p.id, p]))

    // Obtener items existentes en el carrito
    const existingItems = await prisma.cartItem.findMany({
      where: {
        cartId: cart.id,
        productId: { in: productIds },
      },
    })
    const existingItemMap = new Map(existingItems.map(item => [item.productId, item]))

    // Procesar cada item
    for (const item of items) {
      const product = productMap.get(item.productId)

      if (!product) {
        results.push({
          productId: item.productId,
          success: false,
          error: 'Producto no encontrado'
        })
        failCount++
        continue
      }

      // Verificar stock
      const existingItem = existingItemMap.get(item.productId)
      const currentQuantity = existingItem?.quantity || 0
      const newQuantity = currentQuantity + item.quantity

      if (product.stock === 0) {
        results.push({
          productId: item.productId,
          success: false,
          error: 'Sin stock disponible',
          productName: product.name
        })
        failCount++
        continue
      }

      if (product.stock < newQuantity) {
        results.push({
          productId: item.productId,
          success: false,
          error: `Stock insuficiente. Disponible: ${product.stock}`,
          productName: product.name
        })
        failCount++
        continue
      }

      try {
        if (existingItem) {
          // Actualizar cantidad
          await prisma.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: newQuantity },
          })
        } else {
          // Crear nuevo item
          await prisma.cartItem.create({
            data: {
              cartId: cart.id,
              productId: item.productId,
              quantity: item.quantity,
              price: product.price,
            },
          })
        }

        results.push({
          productId: item.productId,
          success: true,
          productName: product.name
        })
        successCount++
      } catch (err) {
        results.push({
          productId: item.productId,
          success: false,
          error: 'Error al agregar producto',
          productName: product.name
        })
        failCount++
      }
    }

    // Obtener carrito actualizado
    const updatedCart = await prisma.cart.findFirst({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    // 📡 Enviar evento realtime
    const itemCount = updatedCart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
    const totalAmount = updatedCart?.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0

    try {
      await sendCartUpdateEvent(userId, {
        action: 'add',
        itemCount,
        totalAmount,
      })
    } catch (realtimeError) {
      console.error('Error sending cart realtime event:', realtimeError)
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        total: items.length,
        success: successCount,
        failed: failCount
      },
      cart: updatedCart
    })
  } catch (error) {
    console.error('Error en batch add al carrito:', error)
    return NextResponse.json(
      { error: 'Error agregando productos al carrito' },
      { status: 500 }
    )
  }
}

// DELETE /api/buyer/cart/batch - Eliminar múltiples items del carrito
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { itemIds } = body

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar itemIds' },
        { status: 400 }
      )
    }

    const cart = await prisma.cart.findFirst({
      where: { userId },
    })

    if (!cart) {
      return NextResponse.json(
        { error: 'Carrito no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar todos los items de una vez
    const deleteResult = await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        id: { in: itemIds },
      },
    })

    // Obtener carrito actualizado
    const updatedCart = await prisma.cart.findFirst({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    // 📡 Enviar evento realtime
    const itemCount = updatedCart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
    const totalAmount = updatedCart?.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0

    try {
      await sendCartUpdateEvent(userId, {
        action: 'remove',
        itemCount,
        totalAmount,
      })
    } catch (realtimeError) {
      console.error('Error sending cart realtime event:', realtimeError)
    }

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      cart: updatedCart
    })
  } catch (error) {
    console.error('Error en batch delete del carrito:', error)
    return NextResponse.json(
      { error: 'Error eliminando productos del carrito' },
      { status: 500 }
    )
  }
}
