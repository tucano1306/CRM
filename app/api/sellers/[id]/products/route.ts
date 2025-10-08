import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Obtener productos de un seller
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Obtener productos asociados al seller a través de ProductSeller
    const productSellers = await prisma.productSeller.findMany({
      where: { sellerId: id },
      include: {
        product: {
          include: {
            _count: {
              select: { orderItems: true }
            }
          }
        }
      }
    })

    const products = productSellers.map(ps => ps.product)

    // Calcular estadísticas de ventas por producto
    const productsWithStats = await Promise.all(
      products.map(async (product) => {
        const salesStats = await prisma.orderItem.aggregate({
          where: {
            productId: product.id,
            order: { 
              status: 'COMPLETED',
              sellerId: id
            }
          },
          _sum: { quantity: true, subtotal: true },
          _count: true
        })

        return {
          ...product,
          salesStats: {
            totalSold: salesStats._sum.quantity || 0,
            totalRevenue: salesStats._sum.subtotal || 0,
            totalOrders: salesStats._count
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: productsWithStats,
      count: productsWithStats.length
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener productos del seller' 
      },
      { status: 500 }
    )
  }
}