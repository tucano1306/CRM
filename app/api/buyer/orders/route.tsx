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

// ============================================================================
// Types
// ============================================================================

interface CreditNoteInput {
  creditNoteId: string
  amountToUse: number
}

interface CreditToApply {
  credit: any
  amountToUse: number
}

interface CreditValidationResult {
  success: boolean
  error?: string
  creditsToApply: CreditToApply[]
  totalCreditsApplied: number
}

const EMPTY_CREDIT_RESULT: CreditValidationResult = { success: false, error: '', creditsToApply: [], totalCreditsApplied: 0 }

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validate a single credit note and return error message if invalid
 */
function validateSingleCredit(credit: any | null, creditNoteId: string, amountToUse: number): string | null {
  if (!credit) {
    logger.warn(LogCategory.VALIDATION, 'Credit note not found', { creditNoteId })
    return `Nota de crédito ${creditNoteId} no encontrada`
  }

  if (!credit.isActive) {
    logger.warn(LogCategory.VALIDATION, 'Credit note not active', { creditNoteId })
    return `Nota de crédito ${credit.creditNoteNumber} no está activa`
  }

  const isExpired = credit.expiresAt && new Date(credit.expiresAt) < new Date()
  if (isExpired) {
    logger.warn(LogCategory.VALIDATION, 'Credit note expired', { creditNoteId, expiresAt: credit.expiresAt })
    return `Nota de crédito ${credit.creditNoteNumber} ha expirado`
  }

  const hasInsufficientBalance = Number(credit.balance) < amountToUse
  if (hasInsufficientBalance) {
    logger.warn(LogCategory.VALIDATION, 'Insufficient credit balance', { creditNoteId, requested: amountToUse, available: credit.balance })
    return `Balance insuficiente en crédito ${credit.creditNoteNumber}. Disponible: $${Number(credit.balance).toFixed(2)}`
  }

  return null
}

/**
 * Validate request body and extract notes
 */
function validateAndExtractBody(body: any): { valid: boolean; error?: string; notes: string | null; creditNotes: CreditNoteInput[]; idempotencyKey?: string } {
  if (body.notes && typeof body.notes === 'string' && body.notes.length > 500) {
    return { valid: false, error: 'Las notas no pueden exceder 500 caracteres', notes: null, creditNotes: [] }
  }
  
  return {
    valid: true,
    notes: body.notes ? sanitizeText(body.notes) : null,
    creditNotes: body.creditNotes || [],
    idempotencyKey: body.idempotencyKey
  }
}

/**
 * Validate stock for all cart items
 */
function validateCartStock(items: any[]): { valid: boolean; error?: string } {
  for (const item of items) {
    if (item.product.stock < item.quantity) {
      logger.warn(LogCategory.API, 'Insufficient stock', {
        productId: item.productId,
        productName: item.product.name,
        requested: item.quantity,
        available: item.product.stock
      })
      return {
        valid: false,
        error: `Stock insuficiente para ${item.product.name}. Disponible: ${item.product.stock}`
      }
    }
  }
  return { valid: true }
}

/**
 * Calculate cart totals
 */
function calculateCartTotals(items: any[]): { subtotal: number; tax: number; totalAmount: number } {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const TAX_RATE = 0.1
  const tax = subtotal * TAX_RATE
  const totalAmount = subtotal + tax
  return { subtotal, tax, totalAmount }
}

/**
 * Validate credit notes and return credits to apply
 */
async function validateCreditNotes(creditNotes: CreditNoteInput[]): Promise<CreditValidationResult> {
  if (!creditNotes || creditNotes.length === 0) {
    return { success: true, creditsToApply: [], totalCreditsApplied: 0 }
  }

  logger.info(LogCategory.API, 'Processing credit notes', { count: creditNotes.length })
  
  const creditsToApply: CreditToApply[] = []
  let totalCreditsApplied = 0

  for (const { creditNoteId, amountToUse } of creditNotes) {
    const credit = await withPrismaTimeout(
      () => prisma.creditNote.findUnique({ where: { id: creditNoteId } })
    )

    const validationError = validateSingleCredit(credit, creditNoteId, amountToUse)
    if (validationError) {
      return { ...EMPTY_CREDIT_RESULT, error: validationError }
    }

    creditsToApply.push({ credit, amountToUse })
    totalCreditsApplied += amountToUse
  }

  logger.info(LogCategory.API, 'Credits validated successfully', { totalCredits: totalCreditsApplied, creditsCount: creditsToApply.length })
  return { success: true, creditsToApply, totalCreditsApplied }
}

/**
 * Get or create authenticated user
 */
async function getOrCreateAuthUser(userId: string): Promise<{ authUser: any; error?: string }> {
  let authUser = await withPrismaTimeout(
    () => prisma.authenticated_users.findFirst({ where: { authId: userId } })
  )

  if (!authUser) {
    logger.info(LogCategory.AUTH, 'Creating authenticated_users record', { userId })
    const user = await currentUser()
    
    if (!user) {
      logger.warn(LogCategory.AUTH, 'User not authenticated')
      return { authUser: null, error: 'Usuario no autenticado' }
    }
    
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

  return { authUser }
}

/**
 * Get or create client
 */
async function getOrCreateClient(userId: string, authUser: any): Promise<any> {
  let client = await withPrismaTimeout(
    () => prisma.client.findFirst({
      where: { authenticated_users: { some: { authId: userId } } }
    })
  )

  if (!client) {
    logger.info(LogCategory.API, 'Creating client automatically', { userId })
    client = await withPrismaTimeout(
      () => prisma.client.create({
        data: {
          name: authUser.name || 'Cliente Nuevo',
          businessName: authUser.name || 'Mi Negocio',
          address: 'Dirección por definir',
          phone: 'Teléfono por definir',
          email: authUser.email,
          orderConfirmationEnabled: true,
          notificationsEnabled: true,
          authenticated_users: { connect: { id: authUser.id } }
        }
      })
    )
    logger.info(LogCategory.API, 'Client created', { clientId: client.id })
  }

  return client
}

/**
 * Ensure client has a seller and return sellerId
 */
async function ensureClientHasSeller(client: any): Promise<{ sellerId: string; error?: string }> {
  let sellerId = client.sellerId

  if (!sellerId) {
    logger.warn(LogCategory.API, 'Client without seller, finding available seller', { clientId: client.id })
    const availableSeller = await withPrismaTimeout(
      () => prisma.seller.findFirst({ where: { isActive: true } })
    )
    
    if (!availableSeller) {
      logger.error(LogCategory.API, 'No available sellers', new Error('No sellers available'))
      return { sellerId: '', error: 'No hay vendedores disponibles' }
    }
    
    sellerId = availableSeller.id
    await withPrismaTimeout(
      () => prisma.client.update({
        where: { id: client.id },
        data: { sellerId }
      })
    )
    logger.info(LogCategory.API, 'Seller assigned to client', { sellerId, clientId: client.id })
  }

  return { sellerId }
}

/**
 * Validate seller schedule
 */
async function validateSellerSchedule(sellerId: string): Promise<{ valid: boolean; error?: string; nextAvailable?: any; schedule?: any }> {
  const scheduleValidation = await validateOrderTime(sellerId)
  
  if (!scheduleValidation.isValid) {
    logger.warn(LogCategory.VALIDATION, 'Order outside seller schedule', {
      sellerId,
      message: scheduleValidation.message,
      schedule: scheduleValidation.schedule
    })

    const nextAvailable = await getNextAvailableOrderTime(sellerId)
    const errorMessage = nextAvailable
      ? `${scheduleValidation.message}. Próximo horario disponible: ${nextAvailable.dayOfWeek} a las ${nextAvailable.startTime}`
      : scheduleValidation.message

    return { valid: false, error: errorMessage, nextAvailable, schedule: scheduleValidation.schedule }
  }

  logger.info(LogCategory.VALIDATION, 'Order time validated successfully', { sellerId, schedule: scheduleValidation.schedule })
  return { valid: true }
}

/**
 * Create order in transaction
 */
async function createOrderInTransaction(
  client: any,
  sellerId: string,
  finalTotal: number,
  notes: string | null,
  idempotencyKey: string | undefined,
  cart: any,
  creditsToApply: CreditToApply[]
): Promise<any> {
  const confirmationDeadline = new Date()
  confirmationDeadline.setHours(confirmationDeadline.getHours() + 24)

  return await withPrismaTimeout(
    () => prisma.$transaction(async (tx) => {
      const shortId = String(Date.now()).slice(-5) + String(Math.floor(Math.random() * 100)).padStart(2, '0')
      const newOrder = await tx.order.create({
        data: {
          orderNumber: `ORD-${shortId}`,
          clientId: client.id,
          sellerId,
          status: 'PENDING',
          totalAmount: finalTotal,
          notes,
          idempotencyKey: idempotencyKey || null,
          confirmationDeadline: client.orderConfirmationEnabled ? confirmationDeadline : null,
        }
      })

      // Create order items and update stock
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

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      // Apply credits
      for (const { credit, amountToUse } of creditsToApply) {
        await tx.creditNoteUsage.create({
          data: {
            creditNoteId: credit.id,
            orderId: newOrder.id,
            amountUsed: amountToUse,
            notes: `Aplicado a orden ${newOrder.orderNumber}`
          }
        })

        await tx.creditNote.update({
          where: { id: credit.id },
          data: {
            balance: { decrement: amountToUse },
            usedAmount: { increment: amountToUse }
          }
        })

        logger.info(LogCategory.API, 'Credit applied to order', {
          creditNoteId: credit.id,
          creditNoteNumber: credit.creditNoteNumber,
          amountUsed: amountToUse,
          orderId: newOrder.id
        })
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } })

      return await tx.order.findUnique({
        where: { id: newOrder.id },
        include: { orderItems: true, client: true },
      })
    }),
    8000
  )
}

/**
 * Send all notifications for new order
 */
async function sendOrderNotifications(order: any, userId: string): Promise<void> {
  // Emit ORDER_CREATED event
  await eventEmitter.emit({
    type: EventType.ORDER_CREATED,
    timestamp: new Date(),
    userId,
    data: {
      orderId: order.id,
      clientId: order.clientId,
      amount: order.totalAmount,
      status: order.status,
    },
  })

  // Notify seller
  try {
    await notifyNewOrder(order.sellerId, order.id, order.orderNumber, order.client.name, Number(order.totalAmount))
    logger.info(LogCategory.API, 'Notification sent to seller', { sellerId: order.sellerId, orderId: order.id })
    
    await notifySeller(order.sellerId, 'ORDER_CREATED', {
      orderNumber: order.orderNumber,
      buyerName: order.client.name,
      total: Number(order.totalAmount)
    })
    logger.info(LogCategory.API, 'Multichannel notification sent to seller', { sellerId: order.sellerId, orderId: order.id })
  } catch (notifError) {
    logger.error(LogCategory.API, 'Error sending notification', notifError instanceof Error ? notifError : new Error(String(notifError)))
  }

  // Send realtime event
  try {
    const seller = await prisma.seller.findUnique({
      where: { id: order.sellerId },
      include: { authenticated_users: { select: { authId: true }, take: 1 } }
    })
    
    if (seller?.authenticated_users[0]?.authId) {
      await sendRealtimeEvent(
        getSellerChannel(seller.authenticated_users[0].authId),
        'order:new',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          clientName: order.client.name,
          totalAmount: Number(order.totalAmount),
          status: 'PENDING',
          createdAt: order.createdAt
        }
      )
      logger.info(LogCategory.API, 'Realtime event sent for new order', { orderId: order.id })
    }
  } catch (rtError) {
    logger.error(LogCategory.API, 'Error sending realtime event', rtError instanceof Error ? rtError : new Error(String(rtError)))
  }

  // Notify buyer
  try {
    await notifyBuyerOrderCreated(order.clientId, order.id, order.orderNumber, Number(order.totalAmount))
    logger.info(LogCategory.API, 'Notification sent to buyer', { clientId: order.clientId, orderId: order.id })
  } catch (notifError) {
    logger.error(LogCategory.API, 'Error sending notification to buyer', notifError instanceof Error ? notifError : new Error(String(notifError)))
  }
}

// ============================================================================
// Main POST Handler
// ============================================================================

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
    
    // Validate body
    const bodyValidation = validateAndExtractBody(body)
    if (!bodyValidation.valid) {
      return NextResponse.json({ error: bodyValidation.error }, { status: 400 })
    }
    const { notes, creditNotes, idempotencyKey } = bodyValidation

    // Check idempotency
    if (idempotencyKey) {
      const existing = await withPrismaTimeout(() => prisma.order.findFirst({ where: { idempotencyKey } }))
      if (existing) {
        logger.info(LogCategory.API, 'Order already processed (idempotent)', { orderId: existing.id, idempotencyKey })
        return NextResponse.json({ success: true, order: existing, message: 'Order already processed (idempotent)' })
      }
    }

    // Get cart with items
    const cart = await withPrismaTimeout(
      () => prisma.cart.findFirst({
        where: { userId },
        include: { items: { include: { product: true } } },
      })
    )

    if (!cart || cart.items.length === 0) {
      logger.warn(LogCategory.API, 'Empty cart', { userId })
      return NextResponse.json({ error: 'El carrito está vacío' }, { status: 400 })
    }

    // Validate stock
    const stockValidation = validateCartStock(cart.items)
    if (!stockValidation.valid) {
      return NextResponse.json({ error: stockValidation.error }, { status: 400 })
    }

    // Calculate totals
    const { totalAmount } = calculateCartTotals(cart.items)
    logger.debug(LogCategory.API, 'Cart totals calculated', { userId, totalAmount, itemCount: cart.items.length })

    // Validate credits
    const creditValidation = await validateCreditNotes(creditNotes)
    if (!creditValidation.success) {
      return NextResponse.json({ error: creditValidation.error }, { status: 400 })
    }

    const finalTotal = Math.max(0, totalAmount - creditValidation.totalCreditsApplied)
    logger.debug(LogCategory.API, 'Final total calculated', { originalTotal: totalAmount, creditsApplied: creditValidation.totalCreditsApplied, finalTotal })

    // Get or create auth user
    const { authUser, error: authError } = await getOrCreateAuthUser(userId)
    if (authError) {
      return NextResponse.json({ error: authError }, { status: 401 })
    }

    // Get or create client
    const client = await getOrCreateClient(userId, authUser)

    // Ensure client has seller
    const { sellerId, error: sellerError } = await ensureClientHasSeller(client)
    if (sellerError) {
      return NextResponse.json({ error: sellerError }, { status: 400 })
    }

    // Validate seller schedule
    const scheduleResult = await validateSellerSchedule(sellerId)
    if (!scheduleResult.valid) {
      return NextResponse.json(
        { error: scheduleResult.error, schedule: scheduleResult.schedule, nextAvailable: scheduleResult.nextAvailable },
        { status: 400 }
      )
    }

    // Create order
    const order = await createOrderInTransaction(
      client, sellerId, finalTotal, notes, idempotencyKey, cart, creditValidation.creditsToApply
    )

    // Send notifications
    await sendOrderNotifications(order!, userId)

    return NextResponse.json({ success: true, order, message: 'Orden creada exitosamente' })
  } catch (error) {
    logger.error(LogCategory.API, 'Error creating order', error instanceof Error ? error : new Error(String(error)))
    
    if (error instanceof TimeoutError) {
      const timeoutResponse = handleTimeoutError(error)
      return NextResponse.json({ success: false, ...timeoutResponse }, { status: timeoutResponse.status })
    }

    return NextResponse.json({ error: 'Error creando orden: ' + (error as Error).message }, { status: 500 })
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