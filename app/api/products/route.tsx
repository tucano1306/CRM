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
      data: products,
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

    console.log('📦 [CREATE PRODUCT] Datos recibidos:', { name, description, unit, category, price, stock, sku })

    // Validación
    if (!name || !unit || price === undefined || stock === undefined) {
      console.error('❌ [CREATE PRODUCT] Validación fallida - campos faltantes')
      return NextResponse.json(
        { error: 'Faltan campos requeridos: name, unit, price, stock son obligatorios' },
        { status: 400 }
      )
    }

    // Validar que price y stock sean números válidos
    const priceNum = parseFloat(price)
    const stockNum = parseInt(stock)

    if (isNaN(priceNum) || priceNum < 0) {
      console.error('❌ [CREATE PRODUCT] Precio inválido:', price)
      return NextResponse.json(
        { error: 'El precio debe ser un número válido mayor o igual a 0' },
        { status: 400 }
      )
    }

    if (isNaN(stockNum) || stockNum < 0) {
      console.error('❌ [CREATE PRODUCT] Stock inválido:', stock)
      return NextResponse.json(
        { error: 'El stock debe ser un número entero válido mayor o igual a 0' },
        { status: 400 }
      )
    }

    // Validar categoría
    const validCategories = ['CARNES', 'EMBUTIDOS', 'SALSAS', 'LACTEOS', 'GRANOS', 'VEGETALES', 'CONDIMENTOS', 'BEBIDAS', 'OTROS']
    const productCategory = category || 'OTROS'
    
    if (!validCategories.includes(productCategory)) {
      console.error('❌ [CREATE PRODUCT] Categoría inválida:', category)
      return NextResponse.json(
        { error: `Categoría inválida. Debe ser una de: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('✅ [CREATE PRODUCT] Validaciones pasadas, creando producto...')

    // ✅ Crear producto CON TIMEOUT
    const product = await withPrismaTimeout(
      () => prisma.product.create({
        data: {
          name: name.trim(),
          description: description?.trim() || '',
          unit,
          category: productCategory,
          price: priceNum,
          stock: stockNum,
          sku: sku?.trim() || null,
          isActive: true,
        },
      })
    )

    console.log('✅ [CREATE PRODUCT] Producto creado exitosamente:', product.id)

    return NextResponse.json({
      success: true,
      data: product,
    })
  } catch (error: any) {
    console.error('❌ [CREATE PRODUCT] Error completo:', error)
    console.error('❌ [CREATE PRODUCT] Error message:', error.message)
    console.error('❌ [CREATE PRODUCT] Error stack:', error.stack)
    
    // ✅ MANEJO ESPECÍFICO DE TIMEOUT
    if (error instanceof TimeoutError) {
      const timeoutResponse = handleTimeoutError(error)
      return NextResponse.json(
        { success: false, ...timeoutResponse },
        { status: timeoutResponse.status }
      )
    }

    // Manejo de errores de Prisma
    if (error.code === 'P2002') {
      return NextResponse.json(
        {
          success: false,
          error: 'Ya existe un producto con ese SKU. Por favor, usa un SKU diferente.',
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Error creando producto',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}