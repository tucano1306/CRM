import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db-retry'

/**
 * GET /api/buyer/products
 * 
 * 🔐 CATÁLOGO AISLADO POR CLIENTE
 * Cada cliente solo ve los productos que el vendedor le ha asignado
 * con sus precios personalizados.
 * 
 * Si el usuario no está autenticado o no tiene cliente asociado,
 * se devuelve un catálogo vacío.
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const category = searchParams.get('category') || ''

    console.log('🔍 [BUYER PRODUCTS] Buscando productos personalizados...')
    console.log('   - Usuario:', userId || 'ANÓNIMO')
    console.log('   - Búsqueda:', search || 'ninguna')
    console.log('   - Categoría:', category || 'todas')

    // Si no hay usuario autenticado, devolver catálogo vacío
    if (!userId) {
      console.log('⚠️ [BUYER PRODUCTS] Usuario no autenticado - catálogo vacío')
      return NextResponse.json({
        success: true,
        data: {
          data: [],
          total: 0,
          message: 'Debes iniciar sesión para ver tu catálogo personalizado'
        }
      })
    }

    // Buscar el cliente asociado a este usuario
    const authenticatedUser = await withDbRetry(() => 
      prisma.authenticated_users.findUnique({
        where: { authId: userId },
        include: { client: true }
      })
    )

    if (!authenticatedUser || !authenticatedUser.clientId) {
      console.log('⚠️ [BUYER PRODUCTS] Usuario sin cliente asociado')
      return NextResponse.json({
        success: true,
        data: {
          data: [],
          total: 0,
          message: 'No tienes un perfil de comprador configurado'
        }
      })
    }

    const clientId = authenticatedUser.clientId
    console.log('   - Cliente ID:', clientId)
    console.log('   - Cliente:', authenticatedUser.client?.name)

    // 🔐 AISLAMIENTO: Solo productos asignados a este cliente
    const whereConditions: any = {
      clientId: clientId,
      isVisible: true,
      product: {
        isActive: true,
        stock: { gt: 0 }
      }
    }

    // Filtro de búsqueda
    if (search) {
      whereConditions.product.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filtro de categoría
    if (category && category !== 'all' && category !== 'TODOS') {
      whereConditions.product.category = category.toUpperCase()
    }

    // Obtener productos del catálogo del cliente
    const clientProducts = await withDbRetry(() => withPrismaTimeout(() => 
      prisma.clientProduct.findMany({
        where: whereConditions,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true, // Precio base (referencia)
              stock: true,
              unit: true,
              category: true,
              imageUrl: true,
              sku: true,
              isActive: true,
            }
          }
        },
        orderBy: {
          product: { name: 'asc' }
        }
      })
    ))

    // Transformar datos para el frontend
    // El precio que ve el cliente es su customPrice, no el precio base
    const products = clientProducts.map(cp => ({
      id: cp.product.id,
      name: cp.product.name,
      description: cp.product.description,
      price: cp.customPrice, // 🔐 Precio personalizado del cliente
      originalPrice: cp.product.price, // Precio base (oculto o referencia)
      stock: cp.product.stock,
      unit: cp.product.unit,
      category: cp.product.category,
      imageUrl: cp.product.imageUrl,
      sku: cp.product.sku,
      isActive: cp.product.isActive,
      notes: cp.notes, // Notas del vendedor para este cliente
    }))

    console.log(`✅ [BUYER PRODUCTS] Encontrados ${products.length} productos para cliente ${authenticatedUser.client?.name}`)
    
    if (products.length > 0) {
      console.log('   Primeros productos:')
      products.slice(0, 3).forEach((p: any) => {
        console.log(`   - ${p.name} (Precio cliente: $${p.price}, Stock: ${p.stock})`)
      })
    } else {
      console.log('   ⚠️ Este cliente no tiene productos asignados')
    }

    return NextResponse.json({
      success: true,
      data: {
        data: products,
        total: products.length,
        clientName: authenticatedUser.client?.name
      }
    })

  } catch (error) {
    console.error('❌ [BUYER PRODUCTS] Error:', error)
    
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
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}