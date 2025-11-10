import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { validateSchema } from '@/lib/validations'
import { prisma } from '@/lib/prisma'

type RouteContext = {
  params: Promise<{
    itemId: string
  }>
}

// PUT /api/buyer/cart/items/[itemId] - Actualizar cantidad
export async function PUT(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // ✅ Validar schema
    const updateQuantitySchema = z.object({
      quantity: z.number().int().min(1).max(9999)
    })

    const validation = validateSchema(updateQuantitySchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: validation.errors }, { status: 400 })
    }

    const { quantity } = validation.data

    const params = await context.params
    const itemId = params.itemId

    // Verificar que el item existe y pertenece al usuario
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: true,
      },
    })

    if (!item || item.cart.userId !== userId) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Verificar stock
    if (item.product.stock < quantity) {
      return NextResponse.json(
        { error: 'Stock insuficiente' },
        { status: 400 }
      )
    }

    // Actualizar cantidad
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: quantity },
    })

    return NextResponse.json({
      success: true,
      message: 'Cantidad actualizada',
    })
  } catch (error) {
    console.error('Error actualizando item:', error)
    return NextResponse.json(
      { error: 'Error actualizando item' },
      { status: 500 }
    )
  } finally {
    // prisma singleton
  }
}

// DELETE /api/buyer/cart/items/[itemId] - Eliminar item
// ✅ No requiere body, solo itemId en params
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const params = await context.params
    const itemId = params.itemId

    // Verificar que el item existe y pertenece al usuario
    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    })

    if (!item || item.cart.userId !== userId) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar item
    await prisma.cartItem.delete({
      where: { id: itemId },
    })

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado del carrito',
    })
  } catch (error) {
    console.error('Error eliminando item:', error)
    return NextResponse.json(
      { error: 'Error eliminando item' },
      { status: 500 }
    )
  } finally {
    // prisma singleton
  }
}