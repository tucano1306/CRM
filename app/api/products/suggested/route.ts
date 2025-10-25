import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener productos sugeridos basados en compras previas
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Buscar usuario autenticado
    const user = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener productos de órdenes previas del usuario
    const previousOrders = await prisma.order.findMany({
      where: {
        client: {
          authenticated_users: {
            some: { id: user.id }
          }
        }
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    // Extraer IDs de productos comprados
    const purchasedProductIds = new Set(
      previousOrders.flatMap(order => 
        order.orderItems.map(item => item.product.id)
      )
    )

    // Si hay productos comprados, sugerir de la misma categoría
    let suggestedProducts: any[] = []
    
    if (purchasedProductIds.size > 0) {
      const firstProduct = previousOrders[0]?.orderItems[0]?.product
      
      if (firstProduct) {
        suggestedProducts = await prisma.product.findMany({
          where: {
            category: firstProduct.category,
            isActive: true,
            stock: { gt: 0 },
            id: { notIn: Array.from(purchasedProductIds) }
          },
          take: 6,
          orderBy: { createdAt: 'desc' }
        })
      }
    }

    // Si no hay suficientes, completar con productos populares
    if (suggestedProducts.length < 6) {
      const popularProducts = await prisma.product.findMany({
        where: {
          isActive: true,
          stock: { gt: 0 },
          id: { notIn: Array.from(purchasedProductIds) }
        },
        take: 6 - suggestedProducts.length,
        orderBy: { createdAt: 'desc' }
      })

      suggestedProducts = [...suggestedProducts, ...popularProducts]
    }

    return NextResponse.json({
      success: true,
      data: suggestedProducts
    })
  } catch (error) {
    console.error('Error getting suggested products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos sugeridos' },
      { status: 500 }
    )
  }
}
