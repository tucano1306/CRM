import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateSchema } from '@/lib/validations'
import DOMPurify from 'isomorphic-dompurify'

// GET - Listar sellers con filtros
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    // Filtros
    const search = searchParams.get('search') || ''
    const isActive = searchParams.get('isActive')
    const territory = searchParams.get('territory')
    
    // Construir filtros dinámicos
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true'
    }
    
    if (territory) {
      where.territory = { contains: territory, mode: 'insensitive' }
    }

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: { 
              clients: true,
              orders: true,
              products: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.seller.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: sellers,
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
        error: 'Error al obtener sellers' 
      },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo seller
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ✅ Validar schema
    const createSellerSchema = z.object({
      name: z.string().min(1).max(200),
      email: z.string().email(),
      phone: z.string().max(50).optional(),
      territory: z.string().max(100).optional(),
      commission: z.number().min(0).max(100).optional()
    })

    const validation = validateSchema(createSellerSchema, body)
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: validation.errors }, { status: 400 })
    }

    const { name, email, phone, territory, commission } = validation.data

    // ✅ Sanitizar campos de texto
    const sanitizedName = DOMPurify.sanitize(name.trim())
    const sanitizedTerritory = territory ? DOMPurify.sanitize(territory.trim()) : null

    // Verificar email duplicado
    const existingSeller = await prisma.seller.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingSeller) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Ya existe un seller con ese email' 
        },
        { status: 400 }
      )
    }

    const newSeller = await prisma.seller.create({
      data: {
        name: sanitizedName,
        email: email.toLowerCase(),
        phone: phone || null,
        territory: sanitizedTerritory,
        commission: commission || null,
        isActive: true
      },
      include: {
        _count: {
          select: {
            clients: true,
            orders: true,
            products: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Seller creado exitosamente',
      data: newSeller
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al crear seller: ' + error.message 
      },
      { status: 500 }
    )
  }
}