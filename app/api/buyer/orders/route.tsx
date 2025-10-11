import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/buyer/orders - Crear orden desde el carrito
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const notes = body.notes || null

    // Obtener carrito con items
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    })

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { error: 'El carrito está vacío' },
        { status: 400 }
      )
    }

    // Verificar stock de todos los productos
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return NextResponse.json(
          { 
            error: `Stock insuficiente para ${item.product.name}. Disponible: ${item.product.stock}` 
          },
          { status: 400 }
        )
      }
    }

    // Calcular totales
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    )
    const TAX_RATE = 0.10
    const tax = subtotal * TAX_RATE
    const totalAmount = subtotal + tax

// Buscar cliente por clerkUserId
const client = await prisma.client.findFirst({
  where: { 
    clerkUserId: userId
  },
})

    // Crear orden usando transacción
    const order = await prisma.$transaction(async (tx) => {
      // Crear la orden
      const newOrder = await tx.order.create({
        data: {
          clerkUserId: userId,
          clientId: client?.id,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          totalAmount: totalAmount,
          subtotal: subtotal,
          tax: tax,
          notes: notes,
        },
      })

      // Crear los items de la orden
      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            productName: item.product.name,
            quantity: item.quantity,
            pricePerUnit: item.price,
            subtotal: item.price * item.quantity,
          },
        })

        // Actualizar stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        })
      }

      // Vaciar carrito
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      })

      // Retornar orden completa
      return await tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          client: true,
        },
      })
    })

    return NextResponse.json({
      success: true,
      order,
      message: 'Orden creada exitosamente',
    })
  } catch (error) {
    console.error('Error creando orden:', error)
    return NextResponse.json(
      { error: 'Error creando orden: ' + (error as Error).message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// GET /api/buyer/orders - Obtener órdenes del usuario
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const orders = await prisma.order.findMany({
      where: { clerkUserId: userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        client: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (error) {
    console.error('Error obteniendo órdenes:', error)
    return NextResponse.json(
      { error: 'Error obteniendo órdenes: ' + (error as Error).message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}