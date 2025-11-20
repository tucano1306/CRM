import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    console.log('🔍 [DEBUG STOCK] Seller ID:', seller.id)

    // Todos los productos del vendedor
    const allProducts = await prisma.product.findMany({
      where: {
        sellers: {
          some: {
            sellerId: seller.id
          }
        }
      },
      select: {
        id: true,
        name: true,
        stock: true,
        isActive: true,
        sellers: {
          where: {
            sellerId: seller.id
          },
          select: {
            isAvailable: true,
            sellerPrice: true
          }
        }
      },
      orderBy: { stock: 'asc' }
    })

    console.log('📦 [DEBUG STOCK] Total products:', allProducts.length)

    const lowStock = allProducts.filter(p => p.stock > 0 && p.stock < 10 && p.isActive)
    const outOfStock = allProducts.filter(p => p.stock === 0 && p.isActive)

    console.log('⚠️ [DEBUG STOCK] Low stock (1-9):', lowStock.length)
    console.log('🚨 [DEBUG STOCK] Out of stock (0):', outOfStock.length)

    return NextResponse.json({
      success: true,
      sellerId: seller.id,
      totalProducts: allProducts.length,
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      lowStockProducts: lowStock.map(p => ({
        name: p.name,
        stock: p.stock,
        isActive: p.isActive,
        sellerInfo: p.sellers[0]
      })),
      outOfStockProducts: outOfStock.map(p => ({
        name: p.name,
        stock: p.stock,
        isActive: p.isActive,
        sellerInfo: p.sellers[0]
      })),
      allProducts: allProducts.map(p => ({
        name: p.name,
        stock: p.stock,
        isActive: p.isActive,
        sellerInfo: p.sellers[0]
      }))
    })
  } catch (error) {
    console.error('❌ [DEBUG STOCK] Error:', error)
    return NextResponse.json({ 
      error: 'Error al obtener información de stock',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
