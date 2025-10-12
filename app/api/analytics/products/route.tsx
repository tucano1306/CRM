import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener productos más vendidos usando agregación manual
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          status: {
            in: ['COMPLETED', 'CONFIRMED', 'PENDING']
          }
        }
      },
      select: {
        productId: true,
        productName: true,
        quantity: true,
        subtotal: true,
        orderId: true,
      },
    })

    // Agrupar manualmente los datos
    const productMap = new Map<string, {
      productId: string
      productName: string
      totalSold: number
      totalRevenue: number
      ordersCount: Set<string>
    }>()

    orderItems.forEach(item => {
      if (!productMap.has(item.productId)) {
        productMap.set(item.productId, {
          productId: item.productId,
          productName: item.productName,
          totalSold: 0,
          totalRevenue: 0,
          ordersCount: new Set(),
        })
      }

      const product = productMap.get(item.productId)!
      product.totalSold += item.quantity
      product.totalRevenue += item.subtotal
      product.ordersCount.add(item.orderId)
    })

    // Convertir a array y ordenar por cantidad vendida
    const topSelling = Array.from(productMap.values())
      .map(p => ({
        productId: p.productId,
        productName: p.productName,
        totalSold: p.totalSold,
        totalRevenue: p.totalRevenue,
        ordersCount: p.ordersCount.size,
      }))
      .sort((a, b) => b.totalSold - a.totalSold)
      .slice(0, 10)

    // Obtener productos con bajo stock
    const lowStock = await prisma.product.findMany({
      where: {
        stock: {
          lt: 10,
        },
        isActive: true,
      },
      orderBy: {
        stock: 'asc',
      },
      take: 10,
      select: {
        id: true,
        name: true,
        stock: true,
        price: true,
        sku: true,
      },
    })

    // Obtener productos sin ventas
    const allProducts = await prisma.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
        price: true,
      },
    })

    const productIdsWithSales = new Set(topSelling.map(item => item.productId))
    const noSales = allProducts
      .filter(product => !productIdsWithSales.has(product.id))
      .slice(0, 10)

    // Estadísticas generales
    const totalProducts = await prisma.product.count({
      where: { isActive: true },
    })

    const totalValue = await prisma.product.aggregate({
      where: { isActive: true },
      _sum: {
        stock: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        topSelling,
        lowStock,
        noSales,
        stats: {
          totalProducts,
          totalStock: totalValue._sum.stock || 0,
          lowStockCount: lowStock.length,
          noSalesCount: noSales.length,
        },
      },
    })
  } catch (error) {
    console.error('Error obteniendo analytics de productos:', error)
    return NextResponse.json(
      { 
        error: 'Error obteniendo estadísticas de productos',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}