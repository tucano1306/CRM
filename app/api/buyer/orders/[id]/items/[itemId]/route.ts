import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notifySeller } from '@/lib/notifications-multicanal'
import { sendRealtimeEvent, getSellerChannel } from '@/lib/supabase-server'

// DELETE /api/buyer/orders/[id]/items/[itemId] - Buyer elimina un producto de su orden
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
    try {
      const body = await request.json()
      reason = body.reason || 'Sin motivo especificado'
    } catch {
      reason = 'Sin motivo especificado'
    }

    // Verificar que el buyer sea dueño de la orden
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: { clients: true }
    })

    if (!authUser || authUser.clients.length === 0) {
      return NextResponse.json({ error: 'Usuario no es un comprador' }, { status: 403 })
    }

    const clientId = authUser.clients[0].id

    // Obtener la orden y verificar propiedad
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        clientId: clientId
      },
      include: {
        orderItems: true,
        client: true,
        seller: {
          include: {
            authenticated_users: true
          }
        },
        issues: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Permitir modificar si la orden está en ISSUE_REPORTED o PENDING o REVIEWING
    const allowedStatuses = ['ISSUE_REPORTED', 'PENDING', 'REVIEWING']
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
        deletedReason: reason,
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
          buyerResponse: 'REMOVED_BY_BUYER',
          buyerAccepted: false
        }
      })
    }

    // Crear mensaje en el chat notificando al vendedor CON EL MOTIVO
    const sellerUserId = order.seller.authenticated_users[0]?.id
    if (sellerUserId) {
      await prisma.chatMessage.create({
        data: {
          senderId: authUser.id,
          receiverId: sellerUserId,
          message: `📦 He decidido ELIMINAR "${itemToRemove.productName}" de mi orden #${order.orderNumber}.\n\n📝 Motivo: ${reason}`,
          userId: authUser.id,
          orderId: orderId,
          sellerId: order.sellerId
        }
      })
    }

    // Notificar al vendedor
    const sellerAuthUser = order.seller.authenticated_users[0]
    if (sellerAuthUser) {
      // Enviar notificación multicanal
      await notifySeller(
        order.sellerId,
        'ORDER_STATUS_CHANGED',
        {
          orderNumber: order.orderNumber,
          orderId: order.id,
          buyerName: order.client.name,
          message: `${order.client.name} eliminó "${itemToRemove.productName}" de la orden #${order.orderNumber}. Motivo: ${reason}`
        }
      )

      // Enviar evento en tiempo real
      await sendRealtimeEvent(
        getSellerChannel(sellerAuthUser.authId),
        'order:item_removed',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          itemName: itemToRemove.productName,
          buyerName: order.client.name,
          reason: reason,
          newTotal: newTotal
        }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado de la orden',
      newTotal: newTotal,
      removedItem: itemToRemove.productName,
      reason: reason
    })

  } catch (error) {
    console.error('Error removing order item:', error)
    return NextResponse.json(
      { error: 'Error al eliminar el producto: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

// PATCH /api/buyer/orders/[id]/items/[itemId] - Buyer ajusta la cantidad de un producto
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId, itemId } = await params
    const body = await request.json()
    const { quantity } = body

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
    }

    // Verificar que el buyer sea dueño de la orden
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: { clients: true }
    })

    if (!authUser || authUser.clients.length === 0) {
      return NextResponse.json({ error: 'Usuario no es un comprador' }, { status: 403 })
    }

    const clientId = authUser.clients[0].id

    // Obtener la orden
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        clientId: clientId
      },
      include: {
        orderItems: {
          include: { product: true }
        },
        client: true,
        seller: {
          include: {
            authenticated_users: true
          }
        },
        issues: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Solo permitir modificar si la orden está en ISSUE_REPORTED
    if (order.status !== 'ISSUE_REPORTED') {
      return NextResponse.json({ 
        error: 'Solo puedes modificar productos cuando hay issues reportados' 
      }, { status: 400 })
    }

    // Encontrar el item a modificar
    const itemToUpdate = order.orderItems.find(item => item.id === itemId)
    if (!itemToUpdate) {
      return NextResponse.json({ error: 'Producto no encontrado en la orden' }, { status: 404 })
    }

    const oldQuantity = itemToUpdate.quantity
    const pricePerUnit = Number(itemToUpdate.pricePerUnit)
    const newSubtotalItem = quantity * pricePerUnit

    // Actualizar el item
    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: quantity,
        subtotal: newSubtotalItem
      }
    })

    // Recalcular el total de la orden
    const otherItems = order.orderItems.filter(item => item.id !== itemId)
    const otherSubtotal = otherItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
    const newTotal = (otherSubtotal + newSubtotalItem) * 1.10

    // Actualizar el total de la orden
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal }
    })

    // Resolver el issue relacionado
    const relatedIssue = order.issues.find(issue => issue.productName === itemToUpdate.productName)
    if (relatedIssue) {
      await prisma.orderIssue.update({
        where: { id: relatedIssue.id },
        data: { 
          status: 'RESOLVED',
          buyerResponse: 'PARTIAL_ACCEPTED',
          buyerAccepted: true
        }
      })
    }

    // Crear mensaje en el chat notificando al vendedor
    const sellerUserId = order.seller.authenticated_users[0]?.id
    if (sellerUserId) {
      await prisma.chatMessage.create({
        data: {
          senderId: authUser.id,
          receiverId: sellerUserId,
          message: `📦 He aceptado recibir ${quantity} unidades de "${itemToUpdate.productName}" (antes eran ${oldQuantity}) en mi orden #${order.orderNumber}.`,
          userId: authUser.id,
          orderId: orderId,
          sellerId: order.sellerId
        }
      })
    }

    // Notificar al vendedor
    const sellerAuthUser = order.seller.authenticated_users[0]
    if (sellerAuthUser) {
      await notifySeller(
        order.sellerId,
        'ORDER_STATUS_CHANGED',
        {
          orderNumber: order.orderNumber,
          orderId: order.id,
          buyerName: order.client.name,
          message: `${order.client.name} aceptó ${quantity} unidades de "${itemToUpdate.productName}" (antes: ${oldQuantity}) en orden #${order.orderNumber}`
        }
      )

      await sendRealtimeEvent(
        getSellerChannel(sellerAuthUser.authId),
        'order:item_updated',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          itemName: itemToUpdate.productName,
          oldQuantity,
          newQuantity: quantity,
          buyerName: order.client.name,
          newTotal
        }
      )
    }

    // Obtener la orden actualizada
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: { product: true }
        },
        client: true,
        seller: true,
        issues: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Cantidad actualizada',
      newTotal,
      order: updatedOrder
    })

  } catch (error) {
    console.error('Error updating order item:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el producto: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
