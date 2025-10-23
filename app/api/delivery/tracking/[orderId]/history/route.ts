import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

// GET /api/delivery/tracking/:orderId/history
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { orderId } = params

    // Verificar usuario autenticado
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId }
    })

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que la orden existe
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Verificar permisos: solo el cliente o vendedor pueden ver el historial
    const isClient = order.clientId === authUser.id
    const isSeller = order.sellerId === authUser.id

    if (!isClient && !isSeller) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para ver este historial' },
        { status: 403 }
      )
    }

    // Obtener tracking
    const tracking = await prisma.deliveryTracking.findUnique({
      where: { orderId }
    })

    if (!tracking) {
      return NextResponse.json(
        { success: false, error: 'No hay información de tracking para esta orden' },
        { status: 404 }
      )
    }

    // Obtener historial de ubicaciones
    const history = await prisma.deliveryLocationHistory.findMany({
      where: { trackingId: tracking.id },
      orderBy: { timestamp: 'asc' }
    })

    // Convertir Decimal a number para JSON
    const historyData = history.map(location => ({
      id: location.id,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
      timestamp: location.timestamp.toISOString()
    }))

    return NextResponse.json({
      success: true,
      history: historyData,
      count: historyData.length
    })

  } catch (error) {
    console.error('Error obteniendo historial de tracking:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
