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
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            sellerId: true
          }
        }
      }
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
            id: true,
            name: true,
            email: true,
            sellerId: true
          }
        }
      }
    })

    console.log(`✅ [RECURRING ORDER] Orden recurrente ${body.isActive ? 'activada' : 'pausada'}:`, id)

    // 🔔 CREAR NOTIFICACIÓN PARA EL VENDEDOR
    try {
      if (updatedOrder.client.sellerId) {
        const actionText = body.isActive ? 'reactivado' : 'pausado'
        const actionEmoji = body.isActive ? '▶️' : '⏸️'
        
        const notification = await prisma.notification.create({
          data: {
            type: 'ORDER_STATUS_CHANGED',
            title: `${actionEmoji} Orden Recurrente ${body.isActive ? 'Reactivada' : 'Pausada'}`,
            message: `${updatedOrder.client.name} ha ${actionText} la orden recurrente "${updatedOrder.name}" (${getFrequencyLabel(updatedOrder.frequency)}).`,
            clientId: updatedOrder.client.id,
            sellerId: updatedOrder.client.sellerId,
            relatedId: id,
            isRead: false
          }
        })
        console.log('✅ [NOTIFICATION] Notificación de cambio de estado enviada al vendedor:', notification.id)
      } else {
        console.warn('⚠️ [NOTIFICATION] Cliente no tiene vendedor asociado')
      }
    } catch (notifError) {
      console.error('❌ [NOTIFICATION] Error creando notificación:', notifError)
      // No fallar el toggle por error en notificación
    }

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

// Función auxiliar para obtener etiqueta de frecuencia legible
function getFrequencyLabel(frequency: string): string {
  switch (frequency) {
    case 'DAILY': return 'Diaria'
    case 'WEEKLY': return 'Semanal'
    case 'BIWEEKLY': return 'Quincenal'
    case 'MONTHLY': return 'Mensual'
    case 'CUSTOM': return 'Personalizada'
    default: return frequency
  }
}
