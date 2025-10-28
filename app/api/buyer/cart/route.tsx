import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'
import { addToCartSchema, validateSchema } from '@/lib/validations'

const prisma = new PrismaClient()

// GET /api/buyer/cart - Obtener carrito del usuario
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar o crear carrito
    let cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      cart,
    })
  } catch (error) {
    console.error('Error obteniendo carrito:', error)
    return NextResponse.json(
      { error: 'Error obteniendo carrito' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST /api/buyer/cart - Agregar producto al carrito
// ✅ CON VALIDACIÓN ZOD
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // ✅ VALIDACIÓN CON ZOD
    const validation = validateSchema(addToCartSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    const { productId, quantity } = validation.data

    // Verificar que el producto existe y tiene stock
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    if (product.stock < quantity) {
      return NextResponse.json(
        { error: 'Stock insuficiente' },
        { status: 400 }
      )
    }

    // Buscar o crear carrito
    let cart = await prisma.cart.findFirst({
      where: { userId },
    })

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      })
    }

    // Verificar si el producto ya está en el carrito
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: productId,
      },
    })

    if (existingItem) {
      // Actualizar cantidad
      const newQuantity = existingItem.quantity + quantity

      if (product.stock < newQuantity) {
        return NextResponse.json(
          { error: 'Stock insuficiente' },
          { status: 400 }
        )
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      })
    } else {
      // Crear nuevo item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity,
          price: product.price,
        },
      })
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

    return NextResponse.json({
      success: true,
      cart: updatedCart,
    })
  } catch (error) {
    console.error('Error agregando al carrito:', error)
    return NextResponse.json(
      { error: 'Error agregando al carrito' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE /api/buyer/cart - Vaciar carrito
export async function DELETE() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const cart = await prisma.cart.findFirst({
      where: { userId },
    })

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Carrito vaciado',
    })
  } catch (error) {
    console.error('Error vaciando carrito:', error)
    return NextResponse.json(
      { error: 'Error vaciando carrito' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}