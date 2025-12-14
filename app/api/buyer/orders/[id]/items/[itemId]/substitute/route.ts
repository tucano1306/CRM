import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notifySeller } from '@/lib/notifications-multicanal'
import { sendRealtimeEvent, getSellerChannel } from '@/lib/supabase-server'

// POST /api/buyer/orders/[id]/items/[itemId]/substitute - Buyer sustituye un producto por otro
export async function POST(
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
    const { newProductId, newProductName, reason, quantity } = body

    if (!newProductId || !newProductName) {
      return NextResponse.json({ error: 'Producto de sustitución requerido' }, { status: 400 })
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

    // Permitir sustitución en ciertos estados
    const allowedStatuses = ['ISSUE_REPORTED', 'PENDING', 'REVIEWING']
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json({ 
        error: 'No puedes sustituir productos en este estado de la orden' 
      }, { status: 400 })
    }

    // Encontrar el item a sustituir
    const itemToSubstitute = order.orderItems.find(item => item.id === itemId)
    if (!itemToSubstitute) {
      return NextResponse.json({ error: 'Producto no encontrado en la orden' }, { status: 404 })
    }

    // Obtener el nuevo producto
    const newProduct = await prisma.product.findUnique({
      where: { id: newProductId }
    })

    if (!newProduct) {
      return NextResponse.json({ error: 'Producto de sustitución no encontrado' }, { status: 404 })
    }

    // Determinar la cantidad a usar (la proporcionada o la original del item)
    const newQuantity = quantity && quantity > 0 ? quantity : itemToSubstitute.quantity

    // Verificar que haya suficiente stock
    if (newProduct.stock !== null && newProduct.stock < newQuantity) {
      return NextResponse.json({ 
        error: `Stock insuficiente. Disponible: ${newProduct.stock} ${newProduct.unit || 'unidades'}` 
      }, { status: 400 })
    }

    // Marcar el item original como eliminado/sustituido
    await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        isDeleted: true,
        deletedReason: reason || `Sustituido por: ${newProductName}`,
        deletedAt: new Date(),
        substitutedWith: newProductId,
        substituteName: newProductName,
        subtotal: 0
      }
    })

    // Crear el nuevo item con el producto sustituto
    const newSubtotal = newQuantity * Number(newProduct.price)
    const newOrderItem = await prisma.orderItem.create({
      data: {
        orderId: orderId,
        productId: newProductId,
        productName: newProduct.name,
        quantity: newQuantity,
        pricePerUnit: newProduct.price,
        subtotal: newSubtotal,
        confirmed: false,
        itemNote: `Sustitución de: ${itemToSubstitute.productName} (${itemToSubstitute.quantity} → ${newQuantity})`
      }
    })

    // Recalcular el total de la orden
    const allItems = await prisma.orderItem.findMany({
      where: { 
        orderId: orderId,
        isDeleted: false
      }
    })
    const newTotalSubtotal = allItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
    const newTotal = newTotalSubtotal * 1.10

    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal }
    })

    // Resolver el issue relacionado si existe
    const relatedIssue = order.issues.find(issue => issue.productName === itemToSubstitute.productName)
    if (relatedIssue) {
      await prisma.orderIssue.update({
        where: { id: relatedIssue.id },
        data: { 
          status: 'RESOLVED',
          buyerResponse: 'SUBSTITUTED_BY_BUYER',
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
          message: `🔄 He sustituido "${itemToSubstitute.productName}" por "${newProductName}" en mi orden #${order.orderNumber}.\n\n📝 Motivo: ${reason || 'Producto alternativo seleccionado'}`,
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
          message: `${order.client.name} sustituyó "${itemToSubstitute.productName}" por "${newProductName}" en orden #${order.orderNumber}`
        }
      )

      await sendRealtimeEvent(
        getSellerChannel(sellerAuthUser.authId),
        'order:item_substituted',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          oldItemName: itemToSubstitute.productName,
          newItemName: newProductName,
          buyerName: order.client.name,
          newTotal: newTotal
        }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Producto sustituido exitosamente',
      newTotal: newTotal,
      substitutedItem: itemToSubstitute.productName,
      newItem: newProductName
    })

  } catch (error) {
    console.error('Error substituting order item:', error)
    return NextResponse.json(
      { error: 'Error al sustituir el producto: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
