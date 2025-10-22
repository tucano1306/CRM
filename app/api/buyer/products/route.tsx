import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'
import { withPrismaTimeout, handleTimeoutError, TimeoutError } from '@/lib/timeout'

const prisma = new PrismaClient()

// GET /api/buyer/products - VERSIÓN SIMPLIFICADA Y REPARADA
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    console.log('🔍 [BUYER PRODUCTS] Buscando productos...')
    console.log('   - Usuario:', userId)
    console.log('   - Búsqueda:', search || 'ninguna')

    // ✅ SIMPLIFICADO: Solo verificar stock > 0
    const whereConditions: any = {
      stock: { gt: 0 },
    }

    // Filtro de búsqueda
    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Obtener productos
    const products = await withPrismaTimeout(
      () => prisma.product.findMany({
        where: whereConditions,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stock: true,
          unit: true,
          imageUrl: true,
          sku: true,
          isActive: true,
          createdAt: true,
        },
      })
    )

    console.log(`✅ [BUYER PRODUCTS] Encontrados ${products.length} productos`)
    
    // Debug: Mostrar primeros 3 productos
    if (products.length > 0) {
      console.log('   Primeros productos:')
      products.slice(0, 3).forEach((p: any) => {
        console.log(`   - ${p.name} (Stock: ${p.stock}, Active: ${p.isActive})`)
      })
    } else {
      console.log('   ⚠️ No se encontraron productos con stock > 0')
      
      // Debug adicional: verificar TODOS los productos
      const allProducts = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          stock: true,
          isActive: true,
        }
      })
      console.log(`   ℹ️ Total de productos en DB: ${allProducts.length}`)
      if (allProducts.length > 0) {
        console.log('   Todos los productos:')
        allProducts.forEach((p: any) => {
          console.log(`   - ${p.name} (Stock: ${p.stock}, Active: ${p.isActive})`)
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: products,
      total: products.length,
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
  } finally {
    await prisma.$disconnect()
  }
}