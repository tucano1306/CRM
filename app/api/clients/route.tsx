import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'
import { 
  validateSchema, 
  validateQueryParams,
  createClientSchema, 
  paginationSchema 
} from '@/lib/validations'
import DOMPurify from 'isomorphic-dompurify'
import logger, { LogCategory, createRequestLogger } from '@/lib/logger'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'

export async function GET(request: NextRequest) {
  const requestLogger = createRequestLogger({
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined
  })
  requestLogger.start('/api/clients', 'GET')

  try {
    const { userId } = await auth()

    if (!userId) {
      requestLogger.end('/api/clients', 'GET', 401)
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔒 SEGURIDAD: Obtener vendedor del usuario autenticado
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      requestLogger.end('/api/clients', 'GET', 403)
      return NextResponse.json({ 
        error: 'No tienes permisos para ver clientes. Debes ser un vendedor registrado.' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    
    // Validar parámetros de paginación
    const validation = validateQueryParams(paginationSchema, searchParams)
    
    if (!validation.success) {
      logger.warn(LogCategory.VALIDATION, 'Invalid pagination parameters', {
        endpoint: '/api/clients',
        method: 'GET'
      }, { errors: validation.errors })

      requestLogger.end('/api/clients', 'GET', 400)
      return NextResponse.json(
        { 
          success: false,
          error: 'Parámetros inválidos',
          details: validation.errors
        },
        { status: 400 }
      )
    }
    
    const { page, limit, search } = validation.data
    const skip = (page - 1) * limit
    
    // 🔒 SEGURIDAD: Filtrar SIEMPRE por sellerId
    const where: any = {
      sellerId: seller.id  // ← FILTRO OBLIGATORIO: Solo clientes de este vendedor
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } }
      ]
    }

    const [clientsRaw, total] = await Promise.all([
      withPrismaTimeout(
        () => prisma.client.findMany({
          where,
          skip,
          take: limit,
          include: {
            seller: true,
            authenticated_users: {
              select: {
                authId: true
              }
            },
            orders: {
              select: {
                id: true,
                totalAmount: true,
                status: true
              }
            },
            _count: {
              select: { orders: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        5000
      ),
      withPrismaTimeout(
        () => prisma.client.count({ where }),
        5000
      )
    ])

    // Calcular estadísticas para cada cliente
    const clients = clientsRaw.map(client => {
      const totalOrders = client.orders.length
      const totalSpent = client.orders.reduce((sum, order) => {
        // Solo contar órdenes completadas
        if (order.status === 'COMPLETED' || order.status === 'DELIVERED') {
          return sum + Number(order.totalAmount)
        }
        return sum
      }, 0)

      const clerkUserId = client.authenticated_users?.[0]?.authId || null

      return {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        address: client.address,
        zipCode: client.zipCode,
        businessName: client.businessName,
        createdAt: client.createdAt,
        clerkUserId,
        seller: client.seller,
        stats: {
          totalOrders,
          totalSpent
        }
      }
    })

    requestLogger.end('/api/clients', 'GET', 200)
    logger.debug(LogCategory.API, 'Clients fetched successfully', {
      endpoint: '/api/clients',
      method: 'GET',
      count: clients.length,
      total
    })

    return NextResponse.json({
      success: true,
      data: clients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    // Manejo de timeout
    if (error instanceof TimeoutError) {
      const { error: errorMsg, code, status } = handleTimeoutError(error)
      logger.error(LogCategory.API, 'Timeout fetching clients', error, {
        endpoint: '/api/clients',
        method: 'GET'
      })
      return NextResponse.json({ error: errorMsg, code }, { status })
    }

    requestLogger.error('/api/clients', 'GET', error)
    logger.error(LogCategory.API, 'Failed to fetch clients', error, {
      endpoint: '/api/clients',
      method: 'GET'
    })

    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener clientes' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const requestLogger = createRequestLogger({
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined
  })
  requestLogger.start('/api/clients', 'POST')

  try {
    const body = await request.json()
    
    // Validar con Zod schema
    const validation = validateSchema(createClientSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Datos de cliente inválidos',
          details: validation.errors
        },
        { status: 400 }
      )
    }
    
    const validatedData = validation.data

    // ✅ SANITIZACIÓN DE DATOS
    const sanitizedData = {
      ...validatedData,
      name: DOMPurify.sanitize(validatedData.name.trim()),
      businessName: validatedData.businessName ? 
        DOMPurify.sanitize(validatedData.businessName.trim()) : undefined,
      address: DOMPurify.sanitize(validatedData.address.trim()),
      email: validatedData.email.toLowerCase().trim()
    }

    // Verificar email duplicado
    const existingClient = await withPrismaTimeout(
      () => prisma.client.findFirst({
        where: { email: sanitizedData.email }
      }),
      5000
    )

    if (existingClient) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Ya existe un cliente con ese email' 
        },
        { status: 400 }
      )
    }

    const newClient = await withPrismaTimeout(
      () => prisma.client.create({
        data: {
          name: sanitizedData.name,
          businessName: sanitizedData.businessName,
          address: sanitizedData.address,
          phone: sanitizedData.phone,
          email: sanitizedData.email,
          orderConfirmationEnabled: sanitizedData.orderConfirmationEnabled,
          orderConfirmationMethod: sanitizedData.orderConfirmationMethod,
          notificationsEnabled: sanitizedData.notificationsEnabled,
          ...(sanitizedData.sellerId && { sellerId: sanitizedData.sellerId })
        },
        include: {
          seller: true
        }
      }),
      5000
    )

    // Emitir evento CLIENT_CREATED
    await eventEmitter.emit({
      type: EventType.CLIENT_CREATED,
      timestamp: new Date(),
      data: {
        clientId: newClient.id,
        name: newClient.name,
        email: newClient.email,
      },
    })

    requestLogger.end('/api/clients', 'POST', 201)
    logger.info(LogCategory.API, 'Client created successfully', {
      endpoint: '/api/clients',
      method: 'POST',
      clientId: newClient.id
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: newClient
    }, { status: 201 })
  } catch (error) {
    // Manejo de timeout
    if (error instanceof TimeoutError) {
      const { error: errorMsg, code, status } = handleTimeoutError(error)
      logger.error(LogCategory.API, 'Timeout creating client', error, {
        endpoint: '/api/clients',
        method: 'POST'
      })
      return NextResponse.json({ error: errorMsg, code }, { status })
    }

    requestLogger.error('/api/clients', 'POST', error)
    logger.error(LogCategory.API, 'Failed to create client', error, {
      endpoint: '/api/clients',
      method: 'POST'
    })

    return NextResponse.json(
      { 
        success: false,
        error: 'Error al crear cliente' 
      },
      { status: 500 }
    )
  }
}