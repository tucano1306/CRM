import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Esta es una API pública cacheable para el catálogo de productos
export async function GET(request: NextRequest) {
  try {
    // Obtener productos activos para mostrar públicamente
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        category: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const response = NextResponse.json({
      success: true,
      data: products,
      count: products.length
    })

    // Headers de cache para optimización
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600')
    response.headers.set('CDN-Cache-Control', 'public, s-maxage=300')
    response.headers.set('Vercel-CDN-Cache-Control', 'public, s-maxage=300')

    return response

  } catch (error) {
    console.error('Error fetching public products:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al obtener productos' 
      },
      { status: 500 }
    )
  }
}