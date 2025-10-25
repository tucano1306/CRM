import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener productos más populares (más vendidos)
export async function GET() {
  try {
    // Obtener productos con más items de orden vendidos
    const popularProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 }
      },
      include: {
        _count: {
          select: {
            orderItems: true
          }
        }
      },
      orderBy: [
        { orderItems: { _count: 'desc' } },
        { createdAt: 'desc' }
      ],
      take: 10
    })

    // Remover el campo _count antes de enviar al cliente
    const products = popularProducts.map(({ _count, ...product }) => product)

    return NextResponse.json({
      success: true,
      data: products
    })
  } catch (error) {
    console.error('Error getting popular products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos populares' },
      { status: 500 }
    )
  }
}
