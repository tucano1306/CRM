import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'
import { 
  validateSchema, 
  validateQueryParams,
  createClientSchema, 
  paginationSchema 
} from '@/lib/validations'
import logger, { LogCategory, createRequestLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestLogger = createRequestLogger({
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined
  })
  requestLogger.start('/api/clients', 'GET')

  try {
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
    
    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } }
      ]
    } : {}

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: true,
          _count: {
            select: { orders: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.client.count({ where })
    ])

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

    // Verificar email duplicado
    const existingClient = await prisma.client.findFirst({
      where: { email: validatedData.email }
    })

    if (existingClient) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Ya existe un cliente con ese email' 
        },
        { status: 400 }
      )
    }

    const newClient = await prisma.client.create({
      data: {
        name: validatedData.name,
        businessName: validatedData.businessName,
        address: validatedData.address,
        phone: validatedData.phone,
        email: validatedData.email,
        orderConfirmationEnabled: validatedData.orderConfirmationEnabled,
        orderConfirmationMethod: validatedData.orderConfirmationMethod,
        notificationsEnabled: validatedData.notificationsEnabled,
        ...(validatedData.sellerId && { sellerId: validatedData.sellerId })
      },
      include: {
        seller: true
      }
    })

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