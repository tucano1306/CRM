import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notifyBuyer } from '@/lib/notifications-multicanal'
import { sendRealtimeEvent, getBuyerChannel } from '@/lib/supabase-server'

// DELETE /api/orders/[id]/items/[itemId] - Seller elimina un producto de una orden
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId, itemId } = await params
    
    // Obtener el motivo de eliminación del body
    let reason = ''
    let bySeller = false
    try {
      const body = await request.json()
      reason = body.reason || 'Sin motivo especificado'
      bySeller = body.bySeller || false
    } catch {
      reason = 'Sin motivo especificado'
    }

    // Verificar que el usuario sea un vendedor
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: { sellers: true }
    })

    if (!authUser || authUser.sellers.length === 0) {
      return NextResponse.json({ error: 'Usuario no es un vendedor' }, { status: 403 })
    }

    const sellerId = authUser.sellers[0].id

    // Obtener la orden y verificar que pertenece al vendedor
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: sellerId
      },
      include: {
        orderItems: true,
        client: {
          include: {
            authenticated_users: true
          }
        },
        seller: true,
        issues: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Permitir modificar si la orden está en ciertos estados
    const allowedStatuses = ['ISSUE_REPORTED', 'PENDING', 'REVIEWING', 'CONFIRMED']
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json({ 
        error: 'No puedes modificar productos en este estado de la orden' 
      }, { status: 400 })
    }

    // Encontrar el item a eliminar
    const itemToRemove = order.orderItems.find(item => item.id === itemId)
    if (!itemToRemove) {
      return NextResponse.json({ error: 'Producto no encontrado en la orden' }, { status: 404 })
    }

    // Marcar como eliminado en vez de borrar físicamente
    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        isDeleted: true,
        deletedReason: `[VENDEDOR] ${reason}`,
        deletedAt: new Date(),
        subtotal: 0 // El subtotal pasa a 0 para no contar en el total
      }
    })

    // Recalcular el total excluyendo items eliminados
    const activeItems = order.orderItems.filter(item => item.id !== itemId && !item.isDeleted)
    const newSubtotal = activeItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
    const newTotal = newSubtotal * 1.10 // Añadir impuesto

    // Actualizar el total de la orden
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal }
    })

    // Resolver el issue relacionado si existe
    const relatedIssue = order.issues.find(issue => issue.productName === itemToRemove.productName)
    if (relatedIssue) {
      await prisma.orderIssue.update({
        where: { id: relatedIssue.id },
        data: { 
          status: 'RESOLVED',
          buyerResponse: 'REMOVED_BY_SELLER',
          buyerAccepted: false
        }
      })
    }

    // Crear mensaje en el chat notificando al comprador CON EL MOTIVO
    const buyerAuthUser = order.client.authenticated_users[0]
    if (buyerAuthUser) {
      await prisma.chatMessage.create({
        data: {
          senderId: authUser.id,
          receiverId: buyerAuthUser.id,
          message: `📦 He decidido ELIMINAR "${itemToRemove.productName}" de tu orden #${order.orderNumber}.\n\n📝 Motivo: ${reason}`,
          userId: authUser.id,
          orderId: orderId,
          sellerId: sellerId
        }
      })
    }

    // Notificar al comprador
    if (buyerAuthUser) {
      // Enviar notificación multicanal
      await notifyBuyer(
        order.clientId,
        'ORDER_STATUS_CHANGED',
        {
          orderNumber: order.orderNumber,
          orderId: order.id,
          sellerName: order.seller.name,
          message: `${order.seller.name} eliminó "${itemToRemove.productName}" de tu orden #${order.orderNumber}. Motivo: ${reason}`
        }
      )

      // Enviar evento en tiempo real
      await sendRealtimeEvent(
        getBuyerChannel(buyerAuthUser.authId),
        'order:item_removed_by_seller',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          itemName: itemToRemove.productName,
          sellerName: order.seller.name,
          reason: reason
        }
      )
    }

    // Verificar si quedan items activos
    const remainingItems = activeItems.length
    if (remainingItems === 0) {
      // Si no quedan items, marcar la orden como cancelada
      await prisma.order.update({
        where: { id: orderId },
        data: { 
          status: 'CANCELED'
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: `Producto "${itemToRemove.productName}" eliminado`,
      newTotal,
      remainingItems,
      order: {
        id: order.id,
        totalAmount: newTotal,
        itemCount: remainingItems
      }
    })
  } catch (error) {
    console.error('Error deleting order item:', error)
    return NextResponse.json({ error: 'Error al eliminar producto' }, { status: 500 })
  }
}
