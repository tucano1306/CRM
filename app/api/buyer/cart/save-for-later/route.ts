import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// POST - Guardar carrito para más tarde
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Buscar usuario autenticado
    const user = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener el carrito actual del usuario
    const cart = await prisma.cart.findFirst({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      }
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'No hay productos en el carrito' },
        { status: 400 }
      )
    }

    // Preparar los datos del carrito para guardar
    const cartData = {
      items: cart.items.map((item: any) => ({
        productId: item.productId,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      })),
      total: cart.items.reduce((sum: number, item: any) => sum + (item.product.price * item.quantity), 0)
    }

    // Guardar o actualizar el carrito guardado
    const savedCart = await prisma.savedCart.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        items: cartData.items,
        total: cartData.total
      },
      update: {
        items: cartData.items,
        total: cartData.total,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Carrito guardado exitosamente',
      data: savedCart
    })
  } catch (error) {
    console.error('Error saving cart:', error)
    return NextResponse.json(
      { error: 'Error al guardar el carrito' },
      { status: 500 }
    )
  }
}

// GET - Recuperar carrito guardado
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Buscar usuario autenticado
    const user = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener el carrito guardado
    const savedCart = await prisma.savedCart.findUnique({
      where: { userId: user.id }
    })

    if (!savedCart) {
      return NextResponse.json(
        { error: 'No hay carrito guardado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: savedCart
    })
  } catch (error) {
    console.error('Error getting saved cart:', error)
    return NextResponse.json(
      { error: 'Error al obtener el carrito guardado' },
      { status: 500 }
    )
  }
}
