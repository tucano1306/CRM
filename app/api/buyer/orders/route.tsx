import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
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
    // Idempotency: accept an optional idempotencyKey from client. If provided,
    // return previously created order with the same key.
    const idempotencyKey: string | undefined = body.idempotencyKey

    if (idempotencyKey) {
      const existing = await prisma.order.findFirst({ where: { idempotencyKey } })
      if (existing) {
        return NextResponse.json({ success: true, order: existing, message: 'Order already processed (idempotent)' })
      }
    }

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

    console.log('userId:', userId)

    // Primero buscar o crear el authenticated_users
    let authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId }
    })

    console.log('AuthUser encontrado:', authUser ? 'SÍ' : 'NO')

    if (!authUser) {
      console.log('Creando authenticated_users...')
      // Obtener datos del usuario de Clerk
      const user = await currentUser()
      
      if (!user) {
        return NextResponse.json(
          { error: 'Usuario no autenticado' },
          { status: 401 }
        )
      }
      
      authUser = await prisma.authenticated_users.create({
        data: {
          id: crypto.randomUUID(),
          authId: userId,
          email: user.emailAddresses[0]?.emailAddress || '',
          name: user.firstName || user.username || 'Usuario',
          role: 'CLIENT',
          updatedAt: new Date()
        }
      })
      console.log('AuthUser creado:', authUser.id)
    }

    // Ahora buscar o crear el cliente
    let client = await prisma.client.findFirst({
      where: {
        authenticated_users: {
          some: {
            authId: userId
          }
        }
      }
    })

    console.log('Cliente encontrado:', client ? 'SÍ' : 'NO')

    if (!client) {
      console.log('Creando cliente automáticamente...')
      client = await prisma.client.create({
        data: {
          name: authUser.name || 'Cliente Nuevo',
          businessName: authUser.name || 'Mi Negocio',
          address: 'Dirección por definir',
          phone: 'Teléfono por definir',
          email: authUser.email,
          orderConfirmationEnabled: true,
          notificationsEnabled: true,
          authenticated_users: {
            connect: { id: authUser.id }
          }
        }
      })
      console.log('Cliente creado:', client.id)
    }

    // Asegurar que el cliente tenga un seller válido
    let sellerId = client.sellerId

    if (!sellerId) {
      console.log('Cliente sin seller, buscando uno disponible...')
      const availableSeller = await prisma.seller.findFirst({
        where: { isActive: true }
      })
      
      if (!availableSeller) {
        return NextResponse.json(
          { error: 'No hay vendedores disponibles' },
          { status: 400 }
        )
      }
      
      sellerId = availableSeller.id
      
      // Actualizar el cliente con el seller
      await prisma.client.update({
        where: { id: client.id },
        data: { sellerId: sellerId }
      })
      
      console.log('Seller asignado:', sellerId)
    }

    // Ahora crear la orden con el sellerId válido
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: `ORD-${Date.now()}`,
          clientId: client.id,
          sellerId: sellerId,  // Ahora garantizado que existe
          status: 'PENDING',
          totalAmount: totalAmount,
          notes: notes,
          idempotencyKey: idempotencyKey || null,
        }
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
        where: { cartId: cart.id },  // CORRECTO
      })

      // Retornar orden completa
      return await tx.order.findUnique({
        where: { id: newOrder.id },
        include: {
          orderItems: true,  // Cambiado de items a orderItems
          client: true
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

    // Primero buscar o crear el authenticated_users (para consistencia, aunque en GET solo se necesita lectura)
    let authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId }
    })

    if (!authUser) {
      // En GET, si no existe authUser, no creamos automáticamente (solo lectura). Retornar error o manejar según lógica de negocio.
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Buscar cliente por authId a través de la relación (para obtener client.id)
    const client = await prisma.client.findFirst({
      where: {
        authenticated_users: {
          some: {
            authId: userId
          }
        }
      }
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    const orders = await prisma.order.findMany({
      where: { 
        // clerkUserId: userId,  // ELIMINADO
        clientId: client.id  // Usado clientId
      },
      include: {
        orderItems: {  // Cambiado de items a orderItems
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