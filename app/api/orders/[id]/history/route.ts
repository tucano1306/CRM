import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getOrderHistory } from '@/lib/orderStatusAudit'

/**
 * GET /api/orders/[id]/history - Obtener historial completo de la orden
 * 
 * Incluye:
 * - Cambios de estado
 * - Productos agregados/eliminados
 * - Mensajes del chat relacionados con la orden
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
        createdAt: true,
      },
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Obtener el historial de cambios de estado
    const statusHistory = await getOrderHistory(id)

    // Obtener productos eliminados/modificados
    const deletedItems = await prisma.orderItem.findMany({
      where: { 
        orderId: id,
        isDeleted: true 
      },
      select: {
        id: true,
        productName: true,
        deletedReason: true,
        deletedAt: true,
        quantity: true,
      }
    })

    // Obtener mensajes del chat que mencionan esta orden (productos agregados, etc)
    const chatMessages = await prisma.chatMessage.findMany({
      where: { 
        orderId: id,
        message: {
          contains: '📦' // Mensajes de productos
        }
      },
      select: {
        id: true,
        message: true,
        createdAt: true,
        senderId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Obtener info de los usuarios que enviaron los mensajes
    const senderIds = chatMessages.map(m => m.senderId)
    const senders = await prisma.authenticated_users.findMany({
      where: { id: { in: senderIds } },
      select: { id: true, name: true, role: true }
    })
    const senderMap = new Map(senders.map(s => [s.id, s]))

    // Combinar todo en un historial unificado
    const unifiedHistory = [
      // Cambios de estado
      ...statusHistory.map(h => ({
        id: h.id,
        type: 'STATUS_CHANGE' as const,
        previousStatus: h.previousStatus,
        newStatus: h.newStatus,
        changedBy: h.changedBy,
        changedByName: h.changedByName,
        changedByRole: h.changedByRole,
        notes: h.notes,
        createdAt: h.createdAt,
        description: `Estado cambiado de ${h.previousStatus || 'NUEVO'} a ${h.newStatus}`
      })),
      // Productos eliminados
      ...deletedItems.map(item => ({
        id: `deleted-${item.id}`,
        type: 'PRODUCT_DELETED' as const,
        previousStatus: null,
        newStatus: null,
        changedBy: '',
        changedByName: 'Sistema',
        changedByRole: 'SYSTEM',
        notes: item.deletedReason,
        createdAt: item.deletedAt?.toISOString() || new Date().toISOString(),
        description: `Producto eliminado: "${item.productName}" (${item.quantity} unid.) - ${item.deletedReason || 'Sin motivo'}`
      })),
      // Mensajes de chat sobre productos
      ...chatMessages.map(msg => {
        const sender = senderMap.get(msg.senderId)
        return {
          id: `chat-${msg.id}`,
          type: 'PRODUCT_ACTION' as const,
          previousStatus: null,
          newStatus: null,
          changedBy: msg.senderId,
          changedByName: sender?.name || 'Usuario',
          changedByRole: sender?.role || 'USER',
          notes: msg.message,
          createdAt: msg.createdAt.toISOString(),
          description: msg.message.replace('📦 ', '').replace('He ', '')
        }
      }),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      success: true,
      data: unifiedHistory,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        createdAt: order.createdAt,
      },
      totalChanges: unifiedHistory.length,
    })
  } catch (error) {
    console.error('Error obteniendo historial de orden:', error)
    return NextResponse.json(
      { error: 'Error al obtener el historial' },
      { status: 500 }
    )
  }
}
