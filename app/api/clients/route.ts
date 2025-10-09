import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    // Filtros
    const search = searchParams.get('search') || ''
    
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
    console.error('Error:', error)
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
  try {
    const body = await request.json()
    const { name, businessName, address, phone, email, sellerId } = body

    // Validaciones
    if (!name || !address || !phone || !email) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Campos requeridos: name, address, phone, email' 
        },
        { status: 400 }
      )
    }

    // Verificar email duplicado
    const existingClient = await prisma.client.findFirst({
      where: { email }
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
        name,
        businessName,
        address,
        phone,
        email,
        sellerId
      },
      include: {
        seller: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: newClient
    }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al crear cliente' 
      },
      { status: 500 }
    )
  }
}