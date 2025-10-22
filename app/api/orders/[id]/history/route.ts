import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getOrderHistory } from '@/lib/orderStatusAudit'

/**
 * GET /api/orders/[id]/history - Obtener historial de cambios de estado
 * 
 * Retorna todos los cambios de estado registrados para una orden específica
 * con información de auditoría completa (quién, cuándo, por qué)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Await params (Next.js 15 requirement)
    const { id } = await params

    // Verificar que la orden existe y el usuario tiene acceso
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        sellerId: true,
        clientId: true,
        status: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Obtener el historial de cambios
    const history = await getOrderHistory(id)

    return NextResponse.json({
      success: true,
      data: history,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        currentStatus: order.status,
      },
      totalChanges: history.length,
    })
  } catch (error) {
    console.error('Error obteniendo historial de orden:', error)
    return NextResponse.json(
      { error: 'Error al obtener el historial' },
      { status: 500 }
    )
  }
}
