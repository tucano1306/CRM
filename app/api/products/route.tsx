import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'

// GET /api/products - Obtener todos los productos
// ✅ CON TIMEOUT DE 5 SEGUNDOS
// Soporta: ?search=nombre&lowStock=true
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const lowStockParam = searchParams.get('lowStock')
    
    const lowStock = lowStockParam === 'true'

    // Construir filtro
    const whereClause: any = {}
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filtrar por stock bajo (menos de 10 unidades por defecto)
    if (lowStock) {
      whereClause.stock = { lt: 10 }
    }

    // ✅ Obtener productos CON TIMEOUT
    const products = await withPrismaTimeout(
      () => prisma.product.findMany({
        where: whereClause,
        orderBy: {
          name: 'asc',
        },
      })
    )

    return NextResponse.json({
      success: true,
      products: products,
    })
  } catch (error) {
    console.error('Error obteniendo productos:', error)
    
    // ✅ MANEJO ESPECÍFICO DE TIMEOUT
    if (error instanceof TimeoutError) {
      const timeoutResponse = handleTimeoutError(error)
      return NextResponse.json(
        { success: false, ...timeoutResponse },
        { status: timeoutResponse.status }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error obteniendo productos',
      },
      { status: 500 }
    )
  }
}

// POST /api/products - Crear nuevo producto
// ✅ CON TIMEOUT DE 5 SEGUNDOS
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, unit, category, price, stock, sku } = body

    // Validación
    if (!name || !unit || price === undefined || stock === undefined) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // ✅ Crear producto CON TIMEOUT
    const product = await withPrismaTimeout(
      () => prisma.product.create({
        data: {
          name,
          description: description || '',
          unit,
          category: category || 'OTROS',
          price: parseFloat(price),
          stock: parseInt(stock),
          sku: sku || null,
          isActive: true,
        },
      })
    )

    return NextResponse.json({
      success: true,
      data: product,
    })
  } catch (error) {
    console.error('Error creando producto:', error)
    
    // ✅ MANEJO ESPECÍFICO DE TIMEOUT
    if (error instanceof TimeoutError) {
      const timeoutResponse = handleTimeoutError(error)
      return NextResponse.json(
        { success: false, ...timeoutResponse },
        { status: timeoutResponse.status }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error creando producto',
      },
      { status: 500 }
    )
  }
}