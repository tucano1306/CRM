import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Listar órdenes con filtros
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    
    // Paginación
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit
    
    // Filtros
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const sellerId = searchParams.get('sellerId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Construir filtros dinámicos
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (clientId) {
      where.clientId = clientId
    }
    
    if (sellerId) {
      where.sellerId = sellerId
    }
    
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          seller: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true
                }
              }
            }
          },
          _count: {
            select: { items: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.order.count({ where })
    ])

    return NextResponse.json({
      success: true,
      data: orders,
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
        error: 'Error al obtener órdenes' 
      },
      { status: 500 }
    )
  }
}

// POST - Crear nueva orden
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { clientId, sellerId, items, notes } = body

    // Validaciones
    if (!clientId || !sellerId || !items || items.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Campos requeridos: clientId, sellerId, items (array no vacío)' 
        },
        { status: 400 }
      )
    }

    // Validar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })

    if (!client) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cliente no encontrado' 
        },
        { status: 404 }
      )
    }

    // Validar que el seller existe
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId }
    })

    if (!seller) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Vendedor no encontrado' 
        },
        { status: 404 }
      )
    }

    // Validar y obtener información de productos
    const productIds = items.map((item: any) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    })

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Uno o más productos no existen' 
        },
        { status: 404 }
      )
    }

    // Verificar stock disponible
    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (product && product.stock < item.quantity) {
        return NextResponse.json(
          { 
            success: false,
            error: `Stock insuficiente para ${product.name}. Disponible: ${product.stock}, Solicitado: ${item.quantity}` 
          },
          { status: 400 }
        )
      }
    }

    // Calcular total
    let totalAmount = 0
    const orderItems = items.map((item: any) => {
      const product = products.find(p => p.id === item.productId)!
      const subtotal = product.price * item.quantity
      totalAmount += subtotal
      
      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        pricePerUnit: product.price,
        subtotal: subtotal,  // ← CAMPO AGREGADO
        confirmed: false
      }
    })

    // Crear orden con items
    const newOrder = await prisma.order.create({
      data: {
        clientId,
        sellerId,
        status: 'PENDING',
        totalAmount,
        notes: notes || '',
        items: {
          create: orderItems
        }
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Orden creada exitosamente',
      data: newOrder
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error al crear orden:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al crear orden: ' + error.message 
      },
      { status: 500 }
    )
  }
}