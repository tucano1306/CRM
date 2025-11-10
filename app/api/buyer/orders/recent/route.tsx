import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
      include: { clients: true },
    })

    if (!authUser || authUser.clients.length === 0) {
      // Si no hay cliente, retornar array vacío
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    const client = authUser.clients[0]

    // Obtener las últimas 10 órdenes del cliente
    const orders = await prisma.order.findMany({
      where: { clientId: client.id },
      include: {
        orderItems: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Formatear datos para el frontend
    const ordersData = orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      itemsCount: order.orderItems.length,
      createdAt: order.createdAt,
    }))

    return NextResponse.json({
      success: true,
      data: ordersData,
    })
  } catch (error) {
    console.error('Error en buyer recent orders:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener órdenes' },
      { status: 500 }
    )
  } finally {
    // prisma singleton
  }
}