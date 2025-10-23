import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener el cliente vinculado al usuario autenticado
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { clients: true }, // ✅ CORREGIDO: clients no clientAccounts
    })

    if (!authUser || authUser.clients.length === 0) {
      // Si no existe el cliente, retornar estadísticas en cero
      return NextResponse.json({
        success: true,
        data: {
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
          totalSpent: 0,
          lastOrderDate: null,
          favoriteProducts: 0,
        },
      })
    }

    const client = authUser.clients[0] // ✅ CORREGIDO

    // Obtener todas las órdenes del cliente
    const orders = await prisma.order.findMany({
      where: { clientId: client.id },
      orderBy: { createdAt: 'desc' },
    })

    const totalOrders = orders.length
    
    const pendingOrders = orders.filter(
      (o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING'
    ).length
    
    const completedOrders = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED').length
    
    const totalSpent = orders
      .filter((o) => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.totalAmount), 0) // ✅ CORREGIDO: Number()

    const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null

    // Productos favoritos (por ahora en 0, se puede expandir)
    const favoriteProducts = 0

    return NextResponse.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalSpent: Number(totalSpent.toFixed(2)), // ✅ CORREGIDO
        lastOrderDate,
        favoriteProducts,
      },
    })
  } catch (error) {
    console.error('Error en buyer stats:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}