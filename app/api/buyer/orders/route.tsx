import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'
import { validateOrderTime, getNextAvailableOrderTime } from '@/lib/scheduleValidation'
import logger, { LogCategory } from '@/lib/logger'

const prisma = new PrismaClient()

// POST /api/buyer/orders - Crear orden desde el carrito
// ✅ CON TIMEOUT DE 5 SEGUNDOS
export async function POST(request: Request) {
  try {
    logger.debug(LogCategory.API, 'POST /api/buyer/orders - Creating order from cart')

    const { userId } = await auth()

    if (!userId) {
      logger.warn(LogCategory.AUTH, 'Unauthorized access attempt to create order')
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const notes = body.notes || null
    // Idempotency: accept an optional idempotencyKey from client. If provided,
    // return previously created order with the same key.
    const idempotencyKey: string | undefined = body.idempotencyKey

    // ✅ Verificar idempotencia CON TIMEOUT
    if (idempotencyKey) {
      const existing = await withPrismaTimeout(
        () => prisma.order.findFirst({ where: { idempotencyKey } })
      )
      if (existing) {
        logger.info(LogCategory.API, 'Order already processed (idempotent)', { orderId: existing.id, idempotencyKey })
        return NextResponse.json({ success: true, order: existing, message: 'Order already processed (idempotent)' })
      }
    }

    // ✅ Obtener carrito con items CON TIMEOUT
    const cart = await withPrismaTimeout(
      () => prisma.cart.findFirst({
        where: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      })
    )

    if (!cart || cart.items.length === 0) {
      logger.warn(LogCategory.API, 'Empty cart', { userId })
      return NextResponse.json(
        { error: 'El carrito está vacío' },
        { status: 400 }
      )
    }

    // Verificar stock de todos los productos
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        logger.warn(LogCategory.API, 'Insufficient stock', {
          productId: item.productId,
          productName: item.product.name,
          requested: item.quantity,
          available: item.product.stock
        })
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

    logger.debug(LogCategory.API, 'Cart totals calculated', {
      userId,
      subtotal,
      tax,
      totalAmount,
      itemCount: cart.items.length
    })

    // ✅ Buscar o crear authenticated_users CON TIMEOUT
    let authUser = await withPrismaTimeout(
      () => prisma.authenticated_users.findFirst({
        where: { authId: userId }
      })
    )

    if (!authUser) {
      logger.info(LogCategory.AUTH, 'Creating authenticated_users record', { userId })
      // Obtener datos del usuario de Clerk
      const user = await currentUser()
      
      if (!user) {
        logger.warn(LogCategory.AUTH, 'User not authenticated')
        return NextResponse.json(
          { error: 'Usuario no autenticado' },
          { status: 401 }
        )
      }
      
      // ✅ Crear authUser CON TIMEOUT
      authUser = await withPrismaTimeout(
        () => prisma.authenticated_users.create({
          data: {
            id: crypto.randomUUID(),
            authId: userId,
            email: user.emailAddresses[0]?.emailAddress || '',
            name: user.firstName || user.username || 'Usuario',
            role: 'CLIENT',
            updatedAt: new Date()
          }
        })
      )
      logger.info(LogCategory.AUTH, 'Authenticated user created', { authUserId: authUser.id, userId })
    }

    // ✅ Buscar o crear cliente CON TIMEOUT
    let client = await withPrismaTimeout(
      () => prisma.client.findFirst({
        where: {
          authenticated_users: {
            some: {
              authId: userId
            }
          }
        }
      })
    )

    if (!client) {
      logger.info(LogCategory.API, 'Creating client automatically', { userId })
      // ✅ Crear cliente CON TIMEOUT
      client = await withPrismaTimeout(
        () => prisma.client.create({
          data: {
            name: authUser!.name || 'Cliente Nuevo',
            businessName: authUser!.name || 'Mi Negocio',
            address: 'Dirección por definir',
            phone: 'Teléfono por definir',
            email: authUser!.email,
            orderConfirmationEnabled: true,
            notificationsEnabled: true,
            authenticated_users: {
              connect: { id: authUser!.id }
            }
          }
        })
      )
      logger.info(LogCategory.API, 'Client created', { clientId: client.id })
    }

    // Asegurar que el cliente tenga un seller válido
    let sellerId = client.sellerId

    if (!sellerId) {
      logger.warn(LogCategory.API, 'Client without seller, finding available seller', { clientId: client.id })
      // ✅ Buscar seller disponible CON TIMEOUT
      const availableSeller = await withPrismaTimeout(
        () => prisma.seller.findFirst({
          where: { isActive: true }
        })
      )
      
      if (!availableSeller) {
        logger.error(LogCategory.API, 'No available sellers', new Error('No sellers available'))
        return NextResponse.json(
          { error: 'No hay vendedores disponibles' },
          { status: 400 }
        )
      }
      
      sellerId = availableSeller.id
      
      // ✅ Actualizar cliente con seller CON TIMEOUT
      await withPrismaTimeout(
        () => prisma.client.update({
          where: { id: client!.id },
          data: { sellerId: sellerId }
        })
      )
      
      logger.info(LogCategory.API, 'Seller assigned to client', { sellerId, clientId: client.id })
    }

    // ========================================================================
    // VALIDAR HORARIO DEL VENDEDOR
    // ========================================================================
    const scheduleValidation = await validateOrderTime(sellerId)
    
    if (!scheduleValidation.isValid) {
      logger.warn(LogCategory.VALIDATION, 'Order outside seller schedule', {
        sellerId,
        message: scheduleValidation.message,
        schedule: scheduleValidation.schedule
      })

      // Obtener próximo horario disponible
      const nextAvailable = await getNextAvailableOrderTime(sellerId)
      
      const errorMessage = nextAvailable
        ? `${scheduleValidation.message}. Próximo horario disponible: ${nextAvailable.dayOfWeek} a las ${nextAvailable.startTime}`
        : scheduleValidation.message

      return NextResponse.json(
        { 
          error: errorMessage,
          schedule: scheduleValidation.schedule,
          nextAvailable
        },
        { status: 400 }
      )
    }

    logger.info(LogCategory.VALIDATION, 'Order time validated successfully', {
      sellerId,
      schedule: scheduleValidation.schedule
    })

    // Calcular confirmationDeadline (24 horas desde ahora)
    const confirmationDeadline = new Date()
    confirmationDeadline.setHours(confirmationDeadline.getHours() + 24)

    // ✅ Crear orden con transacción CON TIMEOUT
    const order = await withPrismaTimeout(
      () => prisma.$transaction(async (tx) => {
        const newOrder = await tx.order.create({
          data: {
            orderNumber: `ORD-${Date.now()}`,
            clientId: client!.id,
            sellerId: sellerId!,  // Ahora garantizado que existe
            status: 'PENDING',
            totalAmount: totalAmount,
            notes: notes,
            idempotencyKey: idempotencyKey || null,
            confirmationDeadline: client!.orderConfirmationEnabled ? confirmationDeadline : null,
          }
        })

        // Crear los items de la orden
        for (const item of cart!.items) {
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
          where: { cartId: cart!.id },  // CORRECTO
        })

        // Retornar orden completa
        return await tx.order.findUnique({
          where: { id: newOrder.id },
          include: {
            orderItems: true,  // Cambiado de items a orderItems
            client: true
        },
      })
    }),
    8000 // ✅ 8 segundos para transacción compleja
    )

    // Emitir evento ORDER_CREATED
    await eventEmitter.emit({
      type: EventType.ORDER_CREATED,
      timestamp: new Date(),
      userId: userId,
      data: {
        orderId: order!.id,
        clientId: order!.clientId,
        amount: order!.totalAmount,
        status: order!.status,
      },
    })

    return NextResponse.json({
      success: true,
      order,
      message: 'Orden creada exitosamente',
    })
  } catch (error) {
    logger.error(LogCategory.API, 'Error creating order', error instanceof Error ? error : new Error(String(error)))
    
    // ✅ MANEJO ESPECÍFICO DE TIMEOUT
    if (error instanceof TimeoutError) {
      const timeoutResponse = handleTimeoutError(error)
      return NextResponse.json(
        { success: false, ...timeoutResponse },
        { status: timeoutResponse.status }
      )
    }

    return NextResponse.json(
      { error: 'Error creando orden: ' + (error as Error).message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// GET /api/buyer/orders - Obtener órdenes del usuario
// ✅ CON TIMEOUT DE 5 SEGUNDOS
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // ✅ Buscar authUser CON TIMEOUT
    let authUser = await withPrismaTimeout(
      () => prisma.authenticated_users.findFirst({
        where: { authId: userId }
      })
    )

    if (!authUser) {
      // En GET, si no existe authUser, no creamos automáticamente (solo lectura). Retornar error o manejar según lógica de negocio.
      return NextResponse.json(
        { success: true, orders: [] },
        { status: 200 }
      )
    }

    // ✅ Buscar cliente CON TIMEOUT
    const client = await withPrismaTimeout(
      () => prisma.client.findFirst({
        where: {
          authenticated_users: {
            some: {
              authId: userId
            }
          }
        }
      })
    )

    if (!client) {
      return NextResponse.json(
        { success: true, orders: [] },
        { status: 200 }
      )
    }

    // ✅ Obtener órdenes CON TIMEOUT
    const orders = await withPrismaTimeout(
      () => prisma.order.findMany({
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
          seller: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    )

    return NextResponse.json({
      success: true,
      orders,
    })
  } catch (error) {
    logger.error(LogCategory.API, 'Error fetching orders', error instanceof Error ? error : new Error(String(error)))
    
    // ✅ MANEJO ESPECÍFICO DE TIMEOUT
    if (error instanceof TimeoutError) {
      const timeoutResponse = handleTimeoutError(error)
      return NextResponse.json(
        { success: false, ...timeoutResponse },
        { status: timeoutResponse.status }
      )
    }

    return NextResponse.json(
      { error: 'Error obteniendo órdenes: ' + (error as Error).message },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}