/**
 * 🔒 SECURITY HELPERS
 * Funciones reutilizables para validar autorización en APIs
 * 
 * USO:
 * - getSeller(userId): Obtiene seller del usuario autenticado, lanza error si no existe
 * - getClient(userId): Obtiene client del usuario autenticado, lanza error si no existe
 * - validateSellerClientRelation(): Valida que un seller y client están relacionados
 * 
 * TODAS las APIs de vendedor deben usar getSeller() para validar permisos
 * TODAS las APIs de cliente deben usar getClient() para validar permisos
 */

import { prisma } from '@/lib/prisma'

/**
 * Error personalizado para problemas de autorización
 */
export class UnauthorizedError extends Error {
  public statusCode: number

  constructor(message: string, statusCode: number = 403) {
    super(message)
    this.name = 'UnauthorizedError'
    this.statusCode = statusCode
  }
}

/**
 * 🔒 Obtener vendedor del usuario autenticado
 * Lanza UnauthorizedError si el usuario no es vendedor
 * 
 * @param userId - Clerk userId del usuario autenticado
 * @returns Seller con relaciones authenticated_users
 * @throws UnauthorizedError si no es vendedor
 */
export async function getSeller(userId: string) {
  if (!userId) {
    throw new UnauthorizedError('No autorizado. Debes iniciar sesión.', 401)
  }

  // CRITICAL: Force bypass any Prisma cache by using raw query first
  // This ensures we always get fresh data from database
  const rawResult = await prisma.$queryRaw<Array<{id: string, authId: string, email: string, role: string}>>`
    SELECT id, "authId", email, role::text
    FROM authenticated_users
    WHERE "authId" = ${userId}
    LIMIT 1
  `

  console.log('🔍 [AUTH] Raw database query result:', {
    userId,
    found: rawResult.length > 0,
    id: rawResult[0]?.id,
    email: rawResult[0]?.email,
    role: rawResult[0]?.role
  })

  // Now use the ID from raw query for subsequent lookups
  const seller = await prisma.seller.findFirst({
    where: {
      authenticated_users: {
        some: { authId: userId }
      }
    },
    include: {
      authenticated_users: true
    }
  })

  console.log('🔍 [AUTH] Seller lookup:', {
    userId,
    found: !!seller,
    sellerId: seller?.id,
    sellerName: seller?.name,
    usersLinked: seller?.authenticated_users?.length || 0
  })

  if (!seller) {
    // Self-heal: if user record exists with SELLER role but no seller linkage, create/link it idempotently
    const shouldRepair = rawResult.length > 0 && rawResult[0]?.role === 'SELLER'
    if (shouldRepair) {
      const au = await prisma.authenticated_users.findFirst({ where: { authId: userId } })
      if (au) {
        const repaired = await prisma.$transaction(async (tx) => {
          let s = await tx.seller.findFirst({ where: { email: au.email } })
          if (s) {
            // Ensure linkage exists
            const alreadyLinked = await tx.seller.findFirst({
              where: {
                id: s.id,
                authenticated_users: { some: { id: au.id } }
              }
            })
            if (!alreadyLinked) {
              await tx.seller.update({
                where: { id: s.id },
                data: { authenticated_users: { connect: { id: au.id } } }
              })
            }
          } else {
            s = await tx.seller.create({
              data: {
                name: au.name || au.email.split('@')[0] || 'Vendedor',
                email: au.email,
                isActive: true,
                authenticated_users: { connect: { id: au.id } }
              }
            })
          }
          return s
        })

        console.log('🛠️ [AUTH] Self-healed seller linkage for SELLER user', {
          userId,
          authUserId: au.id,
          repairedSellerId: repaired.id,
          email: au.email
        })

        return repaired
      }
    }

    console.warn('🚨 SECURITY: Non-seller user attempted to access seller resource', {
      userId,
      authUserExists: rawResult.length > 0,
      authUserRole: rawResult[0]?.role,
      endpoint: 'getSeller()'
    })
    throw new UnauthorizedError(
      'No tienes permisos para acceder a este recurso. Debes ser un vendedor registrado.',
      403
    )
  }

  console.log('✅ SECURITY: Seller authorized', {
    sellerId: seller.id,
    sellerName: seller.name,
    userId
  })

  return seller
}

/**
 * 🔒 Obtener cliente del usuario autenticado
 * Lanza UnauthorizedError si el usuario no es cliente
 * 
 * @param userId - Clerk userId del usuario autenticado
 * @returns Client con relaciones seller y authenticated_users
 * @throws UnauthorizedError si no es cliente
 */
export async function getClient(userId: string) {
  if (!userId) {
    throw new UnauthorizedError('No autorizado. Debes iniciar sesión.', 401)
  }

  const authUser = await prisma.authenticated_users.findFirst({
    where: { authId: userId },
    include: {
      clients: {
        include: {
          seller: true
        }
      }
    }
  })

  if (!authUser || authUser.clients.length === 0) {
    console.warn('🚨 SECURITY: Non-client user attempted to access client resource', {
      userId,
      endpoint: 'getClient()'
    })
    throw new UnauthorizedError(
      'No tienes permisos para acceder a este recurso. Debes ser un cliente registrado.',
      403
    )
  }

  const client = authUser.clients[0]

  console.log('✅ SECURITY: Client authorized', {
    clientId: client.id,
    clientName: client.name,
    sellerId: client.sellerId,
    userId
  })

  return client
}

/**
 * 🔒 Validar que un vendedor tiene acceso a un cliente específico
 * Lanza UnauthorizedError si el cliente no pertenece al vendedor
 * 
 * @param sellerId - ID del vendedor
 * @param clientId - ID del cliente
 * @throws UnauthorizedError si no hay relación
 */
export async function validateSellerClientRelation(sellerId: string, clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { 
      id: true, 
      sellerId: true,
      name: true 
    }
  })

  if (!client) {
    throw new UnauthorizedError('Cliente no encontrado.', 404)
  }

  if (client.sellerId !== sellerId) {
    console.warn('🚨 SECURITY: Seller attempted to access client from another seller', {
      sellerId,
      clientId,
      actualSellerId: client.sellerId
    })
    throw new UnauthorizedError(
      'No tienes permisos para acceder a este cliente. Solo puedes ver tus propios clientes.',
      403
    )
  }

  console.log('✅ SECURITY: Seller-Client relation validated', {
    sellerId,
    clientId,
    clientName: client.name
  })

  return client
}

/**
 * 🔒 Validar que un vendedor tiene acceso a una orden específica
 * Lanza UnauthorizedError si la orden no pertenece al vendedor
 * 
 * @param sellerId - ID del vendedor
 * @param orderId - ID de la orden
 * @throws UnauthorizedError si no hay relación
 */
export async function validateSellerOrderRelation(sellerId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { 
      id: true, 
      sellerId: true,
      orderNumber: true,
      client: {
        select: {
          name: true
        }
      }
    }
  })

  if (!order) {
    throw new UnauthorizedError('Orden no encontrada.', 404)
  }

  if (order.sellerId !== sellerId) {
    console.warn('🚨 SECURITY: Seller attempted to access order from another seller', {
      sellerId,
      orderId,
      actualSellerId: order.sellerId
    })
    throw new UnauthorizedError(
      'No tienes permisos para acceder a esta orden. Solo puedes ver tus propias órdenes.',
      403
    )
  }

  console.log('✅ SECURITY: Seller-Order relation validated', {
    sellerId,
    orderId,
    orderNumber: order.orderNumber,
    clientName: order.client?.name
  })

  return order
}

/**
 * 🔒 Validar que un cliente tiene acceso a una orden específica
 * Lanza UnauthorizedError si la orden no pertenece al cliente
 * 
 * @param clientId - ID del cliente
 * @param orderId - ID de la orden
 * @throws UnauthorizedError si no hay relación
 */
export async function validateClientOrderRelation(clientId: string, orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { 
      id: true, 
      clientId: true,
      orderNumber: true
    }
  })

  if (!order) {
    throw new UnauthorizedError('Orden no encontrada.', 404)
  }

  if (order.clientId !== clientId) {
    console.warn('🚨 SECURITY: Client attempted to access order from another client', {
      clientId,
      orderId,
      actualClientId: order.clientId
    })
    throw new UnauthorizedError(
      'No tienes permisos para acceder a esta orden. Solo puedes ver tus propias órdenes.',
      403
    )
  }

  console.log('✅ SECURITY: Client-Order relation validated', {
    clientId,
    orderId,
    orderNumber: order.orderNumber
  })

  return order
}

/**
 * 🔒 Validar que un vendedor tiene acceso a un producto específico
 * Lanza UnauthorizedError si el producto no pertenece al vendedor
 * 
 * @param sellerId - ID del vendedor
 * @param productId - ID del producto
 * @throws UnauthorizedError si no hay relación
 */
export async function validateSellerProductRelation(sellerId: string, productId: string) {
  const productSeller = await prisma.productSeller.findFirst({
    where: {
      productId,
      sellerId
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true
        }
      }
    }
  })

  if (!productSeller) {
    console.warn('🚨 SECURITY: Seller attempted to access product from another seller', {
      sellerId,
      productId
    })
    throw new UnauthorizedError(
      'No tienes permisos para acceder a este producto. Solo puedes ver tus propios productos.',
      403
    )
  }

  console.log('✅ SECURITY: Seller-Product relation validated', {
    sellerId,
    productId,
    productName: productSeller.product.name,
    productSku: productSeller.product.sku
  })

  return productSeller.product
}

/**
 * 🔧 Wrapper para manejar errores de autorización en route handlers
 * Convierte UnauthorizedError en respuestas HTTP apropiadas
 * 
 * @example
 * export async function GET(request: Request) {
 *   return withAuth(request, async (userId) => {
 *     const seller = await getSeller(userId)
 *     // ... resto de la lógica
 *   })
 * }
 */
export async function handleAuthError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return {
      error: error.message,
      statusCode: error.statusCode
    }
  }

  // Error genérico
  console.error('Unexpected error in auth handler:', error)
  return {
    error: 'Error interno del servidor',
    statusCode: 500
  }
}
