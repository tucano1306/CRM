import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Análisis de productos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')

    // Productos más vendidos
    const topSellingProducts = await prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: { status: 'COMPLETED' }
      },
      _sum: { 
        quantity: true, 
        subtotal: true 
      },
      _count: true,
      orderBy: {
        _sum: { quantity: 'desc' }
      },
      take: limit
    })

    // Obtener detalles de productos
    const topProductsWithDetails = await Promise.all(
      topSellingProducts.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            id: true,
            name: true,
            unit: true,
            price: true,
            stock: true
          }
        })

        return {
          product,
          stats: {
            totalSold: item._sum.quantity || 0,
            totalRevenue: item._sum.subtotal || 0,
            ordersCount: item._count,
            averagePerOrder: item._sum.quantity ? (item._sum.quantity / item._count) : 0
          }
        }
      })
    )

    // Productos con mayor ingreso
    const topRevenueProducts = await prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: { status: 'COMPLETED' }
      },
      _sum: { subtotal: true },
      orderBy: {
        _sum: { subtotal: 'desc' }
      },
      take: limit
    })

    // Productos con bajo stock
    const lowStockProducts = await prisma.product.findMany({
      where: {
        stock: { lt: 10 },
        isActive: true
      },
      orderBy: { stock: 'asc' },
      take: limit
    })

    // Productos sin ventas
    const productsWithoutSales = await prisma.product.findMany({
      where: {
        orderItems: { none: {} },
        isActive: true
      },
      take: limit,
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        createdAt: true
      }
    })

    // Resumen general de productos
    const productSummary = await prisma.product.aggregate({
      _count: true,
      _avg: { price: true, stock: true },
      _sum: { stock: true }
    })

    const activeProducts = await prisma.product.count({
      where: { isActive: true }
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalProducts: productSummary._count,
          activeProducts,
          averagePrice: productSummary._avg.price || 0,
          averageStock: productSummary._avg.stock || 0,
          totalInventoryValue: productSummary._sum.stock || 0
        },
        topSelling: topProductsWithDetails,
        topRevenue: topRevenueProducts.map(item => ({
          productId: item.productId,
          productName: item.productName,
          totalRevenue: item._sum.subtotal || 0
        })),
        lowStock: lowStockProducts,
        noSales: productsWithoutSales
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener análisis de productos' 
      },
      { status: 500 }
    )
  }
}