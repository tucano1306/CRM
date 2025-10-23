import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/orders/[id]/delivery-instructions
 * Actualiza las instrucciones de entrega de una orden
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Extraer parámetros
    const { id } = await params
    
    // Validar id
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de orden requerido' },
        { status: 400 }
      )
    }

    // Obtener body
    const body = await request.json()
    const { instructions } = body

    // Validar que instructions sea string o null
    if (instructions !== null && typeof instructions !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Las instrucciones deben ser texto' },
        { status: 400 }
      )
    }

    // Verificar que la orden existe
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        seller: {
          select: {
            id: true,
            authenticated_users: {
              select: { authId: true }
            }
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que el usuario es el vendedor de la orden
    const sellerAuthId = order.seller.authenticated_users[0]?.authId
    if (!sellerAuthId || sellerAuthId !== userId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para editar esta orden' },
        { status: 403 }
      )
    }

    // Actualizar las instrucciones de entrega
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        deliveryInstructions: instructions || null
      }
    })

    console.log(`✅ Instrucciones de entrega actualizadas para orden ${order.orderNumber}`)

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: 'Instrucciones de entrega actualizadas correctamente'
    })

  } catch (error) {
    console.error('❌ Error actualizando instrucciones de entrega:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
