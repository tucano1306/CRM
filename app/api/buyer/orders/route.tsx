import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'
import { validateOrderTime, getNextAvailableOrderTime } from '@/lib/scheduleValidation'
import logger, { LogCategory } from '@/lib/logger'
import { notifyNewOrder, notifyBuyerOrderCreated } from '@/lib/notifications'
import { notifySeller } from '@/lib/notifications-multicanal'
import { sendRealtimeEvent, getSellerChannel } from '@/lib/supabase-server'
import { sanitizeText } from '@/lib/sanitize'
import { prisma } from '@/lib/prisma'

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
    
    // ✅ VALIDACIÓN BÁSICA
    if (body.notes && typeof body.notes === 'string' && body.notes.length > 500) {
      return NextResponse.json(
        { error: 'Las notas no pueden exceder 500 caracteres' },
        { status: 400 }
      )
    }

    // ✅ SANITIZACIÓN
    const notes = body.notes ? sanitizeText(body.notes) : null
    const creditNotes = body.creditNotes || [] // Array de { creditNoteId, amountToUse }
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

    // ========================================================================
    // VALIDAR Y PROCESAR CRÉDITOS
    // ========================================================================
    let totalCreditsApplied = 0
    const creditsToApply: Array<{ credit: any, amountToUse: number }> = []

    if (creditNotes && creditNotes.length > 0) {
      logger.info(LogCategory.API, 'Processing credit notes', { count: creditNotes.length })
      
      for (const { creditNoteId, amountToUse } of creditNotes) {
        // Validar el crédito
        const credit = await withPrismaTimeout(
          () => prisma.creditNote.findUnique({
            where: { id: creditNoteId }
          })
        )

        if (!credit) {
          logger.warn(LogCategory.VALIDATION, 'Credit note not found', { creditNoteId })
          return NextResponse.json(
            { error: `Nota de crédito ${creditNoteId} no encontrada` },
            { status: 400 }
          )
        }

        if (!credit.isActive) {
          logger.warn(LogCategory.VALIDATION, 'Credit note not active', { creditNoteId })
          return NextResponse.json(
            { error: `Nota de crédito ${credit.creditNoteNumber} no está activa` },
            { status: 400 }
          )
        }

        if (credit.expiresAt && new Date(credit.expiresAt) < new Date()) {
          logger.warn(LogCategory.VALIDATION, 'Credit note expired', { creditNoteId, expiresAt: credit.expiresAt })
          return NextResponse.json(
            { error: `Nota de crédito ${credit.creditNoteNumber} ha expirado` },
            { status: 400 }
          )
        }

        if (Number(credit.balance) < amountToUse) {
          logger.warn(LogCategory.VALIDATION, 'Insufficient credit balance', {
            creditNoteId,
            requested: amountToUse,
            available: credit.balance
          })
          return NextResponse.json(
            { error: `Balance insuficiente en crédito ${credit.creditNoteNumber}. Disponible: $${Number(credit.balance).toFixed(2)}` },
            { status: 400 }
          )
        }

        creditsToApply.push({ credit, amountToUse })
        totalCreditsApplied += amountToUse
      }

      logger.info(LogCategory.API, 'Credits validated successfully', {
        totalCredits: totalCreditsApplied,
        creditsCount: creditsToApply.length
      })
    }

    // Calcular total final con créditos aplicados
    const finalTotal = Math.max(0, totalAmount - totalCreditsApplied)

    logger.debug(LogCategory.API, 'Final total calculated', {
      originalTotal: totalAmount,
      creditsApplied: totalCreditsApplied,
      finalTotal
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
        // Generar número de orden corto: últimos 5 dígitos del timestamp + 2 aleatorios
        const shortId = String(Date.now()).slice(-5) + String(Math.floor(Math.random() * 100)).padStart(2, '0')
        const newOrder = await tx.order.create({
          data: {
            orderNumber: `ORD-${shortId}`,
            clientId: client!.id,
            sellerId: sellerId!,  // Ahora garantizado que existe
            status: 'PENDING',
            totalAmount: finalTotal, // Usar total con créditos aplicados
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

        // Aplicar créditos seleccionados
        for (const { credit, amountToUse } of creditsToApply) {
          // Registrar uso del crédito
          await tx.creditNoteUsage.create({
            data: {
              creditNoteId: credit.id,
              orderId: newOrder.id,
              amountUsed: amountToUse,
              notes: `Aplicado a orden ${newOrder.orderNumber}`
            }
          })

          // Actualizar balance del crédito
          await tx.creditNote.update({
            where: { id: credit.id },
            data: {
              balance: {
                decrement: amountToUse
              },
              usedAmount: {
                increment: amountToUse
              }
            }
          })

          logger.info(LogCategory.API, 'Credit applied to order', {
            creditNoteId: credit.id,
            creditNoteNumber: credit.creditNoteNumber,
            amountUsed: amountToUse,
            orderId: newOrder.id
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

    // 🔔 CREAR NOTIFICACIÓN PARA EL VENDEDOR
    try {
      await notifyNewOrder(
        order!.sellerId,
        order!.id,
        order!.orderNumber,
        order!.client.name,
        Number(order!.totalAmount)
      )
      logger.info(LogCategory.API, 'Notification sent to seller', {
        sellerId: order!.sellerId,
        orderId: order!.id,
      })
      
      // 📱 NOTIFICACIÓN MULTICANAL AL VENDEDOR (Email/SMS/WhatsApp)
      await notifySeller(order!.sellerId, 'ORDER_CREATED', {
        orderNumber: order!.orderNumber,
        buyerName: order!.client.name,
        total: Number(order!.totalAmount)
      })
      logger.info(LogCategory.API, 'Multichannel notification sent to seller', {
        sellerId: order!.sellerId,
        orderId: order!.id,
      })
    } catch (notifError) {
      // No bloquear la respuesta si falla la notificación
      logger.error(LogCategory.API, 'Error sending notification', notifError instanceof Error ? notifError : new Error(String(notifError)))
    }

    // 📡 ENVIAR EVENTO REALTIME AL VENDEDOR
    try {
      const seller = await prisma.seller.findUnique({
        where: { id: order!.sellerId },
        include: { authenticated_users: { select: { authId: true }, take: 1 } }
      })
      
      if (seller?.authenticated_users[0]?.authId) {
        await sendRealtimeEvent(
          getSellerChannel(seller.authenticated_users[0].authId),
          'order:new',
          {
            orderId: order!.id,
            orderNumber: order!.orderNumber,
            clientName: order!.client.name,
            totalAmount: Number(order!.totalAmount),
            status: 'PENDING',
            createdAt: order!.createdAt
          }
        )
        logger.info(LogCategory.API, 'Realtime event sent for new order', {
          orderId: order!.id,
        })
      }
    } catch (rtError) {
      logger.error(LogCategory.API, 'Error sending realtime event', rtError instanceof Error ? rtError : new Error(String(rtError)))
    }

    // 🔔 CREAR NOTIFICACIÓN PARA EL COMPRADOR
    try {
      await notifyBuyerOrderCreated(
        order!.clientId,
        order!.id,
        order!.orderNumber,
        Number(order!.totalAmount)
      )
      logger.info(LogCategory.API, 'Notification sent to buyer', {
        clientId: order!.clientId,
        orderId: order!.id,
      })
    } catch (notifError) {
      // No bloquear la respuesta si falla la notificación
      logger.error(LogCategory.API, 'Error sending notification to buyer', notifError instanceof Error ? notifError : new Error(String(notifError)))
    }

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
    // prisma singleton
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

    // ✅ Obtener órdenes CON TIMEOUT (incluyendo créditos usados)
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
            // Ordenar para que los items eliminados aparezcan al final
            orderBy: [
              { isDeleted: 'asc' },
              { createdAt: 'asc' }
            ]
          },
          client: true,
          seller: true,
          creditNoteUsages: {  // ← Incluir créditos usados para factura
            include: {
              creditNote: {
                select: {
                  id: true,
                  creditNoteNumber: true,
                  amount: true,
                  balance: true,
                },
              },
            },
          },
          // ← Para mostrar problemas de stock al comprador
          issues: {
            select: {
              id: true,
              productName: true,
              issueType: true,
              requestedQty: true,
              availableQty: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })
    )

    // Agregar itemsCount a cada orden
    const ordersWithCount = orders.map(order => ({
      ...order,
      itemsCount: order.orderItems.length
    }))

    return NextResponse.json({
      success: true,
      orders: ordersWithCount,
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
    // prisma singleton
  }
}