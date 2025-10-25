import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener productos relacionados (misma categoría)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Obtener el producto actual
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Obtener productos de la misma categoría
    const relatedProducts = await prisma.product.findMany({
      where: {
        category: product.category,
        isActive: true,
        stock: { gt: 0 },
        id: { not: id } // Excluir el producto actual
      },
      take: 6,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: relatedProducts
    })
  } catch (error) {
    console.error('Error getting related products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos relacionados' },
      { status: 500 }
    )
  }
}
