import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Listar productos con paginación y filtros
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    // Filtros
    const search = searchParams.get('search') || ''
    const unit = searchParams.get('unit') || ''
    const minPrice = searchParams.get('minPrice')
    const maxPrice = searchParams.get('maxPrice')
    const inStock = searchParams.get('inStock')
    
    // Construir filtros dinámicos
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (unit) {
      where.unit = unit
    }
    
    if (minPrice || maxPrice) {
      where.price = {}
      if (minPrice) where.price.gte = parseFloat(minPrice)
      if (maxPrice) where.price.lte = parseFloat(maxPrice)
    }
    
    if (inStock === 'true') {
      where.stock = { gt: 0 }
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          sellers: {
            include: {
              seller: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          _count: {
            select: { orderItems: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.product.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: products,
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
        error: 'Error al obtener productos' 
      },
      { status: 500 }
    )
  }
}

// POST - Crear nuevo producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, unit, price, stock, sellerId, sku } = body

    // Validaciones
    if (!name || !unit || price === undefined || stock === undefined) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Campos requeridos: name, unit, price, stock' 
        },
        { status: 400 }
      )
    }

    // Validar precio y stock positivos
    if (price < 0 || stock < 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Precio y stock deben ser valores positivos' 
        },
        { status: 400 }
      )
    }

    // Verificar SKU duplicado si se proporciona
    if (sku) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku }
      })

      if (existingProduct) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Ya existe un producto con ese SKU' 
          },
          { status: 400 }
        )
      }
    }

    // Generar SKU automático si no se proporciona
    const finalSku = sku || `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Crear producto
    const newProduct = await prisma.product.create({
      data: {
        name,
        description: description || '',
        unit,
        price: parseFloat(price.toString()),
        stock: parseInt(stock.toString()),
        sku: finalSku
      }
    })

    // Si hay sellerId, crear la relación
    if (sellerId) {
      await prisma.productSeller.create({
        data: {
          productId: newProduct.id,
          sellerId: sellerId
        }
      })
    }

    // Obtener producto completo con relaciones
    const productWithRelations = await prisma.product.findUnique({
      where: { id: newProduct.id },
      include: {
        sellers: {
          include: {
            seller: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Producto creado exitosamente',
      data: productWithRelations
    }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al crear producto' 
      },
      { status: 500 }
    )
  }
}