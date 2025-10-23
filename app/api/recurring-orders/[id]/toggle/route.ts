import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH - Activar/Pausar orden recurrente
export async function PATCH(
  request: Request,
  context: RouteContext
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const params = await context.params
    const { id } = params
    const body = await request.json()

    // Verificar que la orden existe
    const existingOrder = await prisma.recurringOrder.findUnique({
      where: { id }
    })

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Orden recurrente no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar estado
    const updatedOrder = await prisma.recurringOrder.update({
      where: { id },
      data: {
        isActive: body.isActive
      },
      include: {
        items: true,
        client: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedOrder,
      message: `Orden recurrente ${body.isActive ? 'activada' : 'pausada'} exitosamente`
    })
  } catch (error) {
    console.error('Error toggling recurring order:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cambiar estado de orden recurrente' },
      { status: 500 }
    )
  }
}
