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
    const authUser = await prisma.authenticatedUser.findUnique({
      where: { authId: userId },
      include: { clientAccounts: true },
    })

    if (!authUser || authUser.clientAccounts.length === 0) {
      // Si no hay cliente, retornar array vacío
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    const client = authUser.clientAccounts[0]

    // Obtener las últimas 10 órdenes del cliente
    const orders = await prisma.order.findMany({
      where: { clientId: client.id },
      include: {
        items: true,
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
      itemsCount: order.items.length,
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
    await prisma.$disconnect()
  }
}