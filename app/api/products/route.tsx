import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'
import { createProductSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'

// GET /api/products - Obtener productos del vendedor autenticado
// ✅ CON TIMEOUT DE 5 SEGUNDOS
// ✅ CON FILTRO DE SEGURIDAD POR SELLER
// Soporta: ?search=nombre&lowStock=true
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
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
      return NextResponse.json({ 
        error: 'No tienes permisos para ver productos. Debes ser un vendedor registrado.' 
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const lowStockParam = searchParams.get('lowStock')
    
    const lowStock = lowStockParam === 'true'

    // 🔒 SEGURIDAD: Construir filtro con relación sellers (ProductSeller)
    const whereClause: any = {
      sellers: {
        some: {
          sellerId: seller.id  // ← FILTRO OBLIGATORIO: Solo productos de este vendedor
        }
      }
    }
    
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
// ✅ CON TIMEOUT DE 5 SEGUNDOS Y VALIDACIÓN ZOD
export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    console.log('📦 [CREATE PRODUCT] Datos recibidos:', body)

    // ✅ VALIDACIÓN CON ZOD
    const validation = validateSchema(createProductSchema, body)
    
    if (!validation.success) {
      console.error('❌ [CREATE PRODUCT] Validación fallida:', validation.errors)
      return NextResponse.json(
        { 
          error: 'Datos inválidos',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    // ✅ SANITIZACIÓN DE INPUTS
    const sanitizedData = {
      ...validation.data,
      name: sanitizeText(validation.data.name),
      description: validation.data.description ? sanitizeText(validation.data.description) : undefined,
      sku: validation.data.sku ? sanitizeText(validation.data.sku) : undefined
    }

    console.log('✅ [CREATE PRODUCT] Validaciones pasadas, creando producto...')

    // ✅ Crear producto CON TIMEOUT
    const product = await withPrismaTimeout(
      () => prisma.product.create({
        data: {
          name: sanitizedData.name,
          description: sanitizedData.description || '',
          unit: sanitizedData.unit,
          price: sanitizedData.price,
          stock: sanitizedData.stock,
          sku: sanitizedData.sku,
          imageUrl: sanitizedData.imageUrl || null,
          isActive: sanitizedData.isActive ?? true,
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