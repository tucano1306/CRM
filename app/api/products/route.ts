import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'
import { createProductSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'
import { withCache, CACHE_CONFIGS, getAdaptiveCache } from '@/lib/apiCache'
import { invalidateProductsCache } from '@/lib/cache-invalidation'
import { autoClassifyCategory } from '@/lib/autoClassifyCategory'

// GET /api/products - Obtener productos
// ✅ CON TIMEOUT DE 5 SEGUNDOS
// ✅ VENDEDORES: Solo sus productos
// ✅ COMPRADORES: Todos los productos activos
// Soporta: ?search=nombre&lowStock=true&page=1&pageSize=20
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const lowStockParam = searchParams.get('lowStock')
  const outOfStockParam = searchParams.get('outOfStock')
  const pageParam = searchParams.get('page')
  const pageSizeParam = searchParams.get('pageSize')

  const lowStock = lowStockParam === 'true'
  const outOfStock = outOfStockParam === 'true'
  let page = Math.max(parseInt(pageParam || '1', 10) || 1, 1)
  let pageSize = parseInt(pageSizeParam || '20', 10) || 20
  pageSize = Math.min(Math.max(pageSize, 1), 100) // 1..100

    // 🔒 SEGURIDAD: Determinar si el usuario es vendedor o comprador
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    const client = await prisma.client.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    // 🔒 SEGURIDAD: Construir filtro según el rol
    const whereClause: any = {}
    
    if (seller) {
      // VENDEDOR: Solo sus productos
      whereClause.sellers = {
        some: {
          sellerId: seller.id
        }
      }
      
      // Filtros de stock para vendedor
      if (lowStock) {
        // Stock bajo: 1-9 unidades, no incluye agotados
        whereClause.stock = { gt: 0, lt: 10 }
        whereClause.isActive = true
        console.log('🔍 [PRODUCTS API] Low stock filter applied for seller:', seller.id)
      } else if (outOfStock) {
        // Productos agotados: stock = 0
        whereClause.stock = 0
        whereClause.isActive = true
        console.log('🔍 [PRODUCTS API] Out of stock filter applied for seller:', seller.id)
      }
      
    } else if (client) {
      // COMPRADOR: Solo productos activos con stock
      whereClause.isActive = true
      whereClause.stock = { gt: 0 }
    } else {
      // Usuario sin rol asignado
      return NextResponse.json({ 
        error: 'No tienes permisos para ver productos. Debes ser vendedor o comprador registrado.' 
      }, { status: 403 })
    }
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
    }

    console.log('📋 [PRODUCTS API] Final where clause:', JSON.stringify(whereClause, null, 2))
    console.log('🔍 [PRODUCTS API] Filters - lowStock:', lowStock, 'outOfStock:', outOfStock, 'seller:', !!seller)

    // ✅ Conteo total y productos paginados (ambos con timeout)
    const total = await withPrismaTimeout(() =>
      prisma.product.count({ where: whereClause })
    )
    
    console.log('📊 [PRODUCTS API] Total products found:', total)
    
    // Debug: Si no hay productos con filtros de stock, verificar sin filtro
    if ((lowStock || outOfStock) && total === 0) {
      console.log('⚠️ [PRODUCTS API] No products found with stock filter, checking without filter...')
      const allSellerProducts = await prisma.product.count({
        where: {
          sellers: { some: { sellerId: seller!.id } },
          isActive: true
        }
      })
      console.log('📦 [PRODUCTS API] Total active products for seller:', allSellerProducts)
      
      const lowStockCount = await prisma.product.count({
        where: {
          sellers: { some: { sellerId: seller!.id } },
          isActive: true,
          stock: { gt: 0, lt: 10 }
        }
      })
      console.log('⚠️ [PRODUCTS API] Low stock count (1-9):', lowStockCount)
      
      const outOfStockCount = await prisma.product.count({
        where: {
          sellers: { some: { sellerId: seller!.id } },
          isActive: true,
          stock: 0
        }
      })
      console.log('🚨 [PRODUCTS API] Out of stock count (0):', outOfStockCount)
    }

    // Si la página solicitada excede las páginas totales, ajusta a la última página
    const totalPages = Math.max(Math.ceil(total / pageSize), 1)
    if (page > totalPages) page = totalPages

    const products = await withPrismaTimeout(
      () => prisma.product.findMany({
        where: whereClause,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      })
    )

    console.log('✅ [PRODUCTS API] Products returned:', products.length)
    if (lowStock) {
      console.log('📦 [PRODUCTS API] Low stock products:', products.map(p => ({ name: p.name, stock: p.stock })))
    }
    if (outOfStock) {
      console.log('📦 [PRODUCTS API] Out of stock products:', products.map(p => ({ name: p.name, stock: p.stock })))
    }

    const response = NextResponse.json({
      success: true,
      data: products,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
      },
    })

    // 🚀 CACHE: Products API con cache adaptativo
    return withCache(response, getAdaptiveCache(request))
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

    // 🏷️ Auto-clasificar categoría si no se proporcionó o está en OTROS
    const finalCategory = (!sanitizedData.category || sanitizedData.category === 'OTROS')
      ? autoClassifyCategory(sanitizedData.name, sanitizedData.description || '')
      : sanitizedData.category

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
        error: 'No tienes permisos para crear productos. Debes ser un vendedor registrado.' 
      }, { status: 403 })
    }

    console.log('✅ [CREATE PRODUCT] Seller encontrado:', seller.id)

    // ✅ Crear producto CON TIMEOUT y relación con seller
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
          category: finalCategory,
          sellers: {
            create: {
              sellerId: seller.id
            }
          }
        },
        include: {
          sellers: true // Incluir la relación creada para confirmar
        }
      })
    )

    console.log('✅ [CREATE PRODUCT] Producto creado exitosamente:', {
      id: product.id,
      name: product.name,
      sellerId: seller.id,
      productSellers: product.sellers
    })

    // 🔄 INVALIDATE CACHE: Products cache after creation
    await invalidateProductsCache(product.id)

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
    if ((error as any).code === 'P2002') {
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
