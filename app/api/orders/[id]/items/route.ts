import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { notifyBuyer } from '@/lib/notifications-multicanal'
import { sendRealtimeEvent, getBuyerChannel, getSellerChannel } from '@/lib/supabase-server'

// POST /api/orders/[id]/items - Seller agrega un producto a una orden
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId } = await params
    const body = await request.json()
    const { productId, quantity, note } = body

    if (!productId || !quantity || quantity <= 0) {
      return NextResponse.json({ 
        error: 'productId y quantity son requeridos' 
      }, { status: 400 })
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
        seller: true
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Permitir agregar productos en ciertos estados
    const allowedStatuses = ['PENDING', 'REVIEWING', 'ISSUE_REPORTED', 'CONFIRMED', 'LOCKED']
    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json({ 
        error: `No se pueden agregar productos en estado ${order.status}` 
      }, { status: 400 })
    }

    // Obtener el producto
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Verificar si el producto ya existe en la orden (y no está eliminado)
    const existingItem = order.orderItems.find(
      item => item.productId === productId && !item.isDeleted
    )

    let newItem
    let updatedQuantity = quantity

    if (existingItem) {
      // Actualizar cantidad del item existente
      updatedQuantity = existingItem.quantity + quantity
      newItem = await prisma.orderItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: updatedQuantity,
          subtotal: updatedQuantity * product.price,
          itemNote: note || existingItem.itemNote
        }
      })
    } else {
      // Crear nuevo item
      newItem = await prisma.orderItem.create({
        data: {
          orderId: orderId,
          productId: productId,
          productName: product.name,
          quantity: quantity,
          pricePerUnit: product.price,
          subtotal: quantity * product.price,
          itemNote: note || null
        }
      })
    }

    // Recalcular el total de la orden
    const allItems = await prisma.orderItem.findMany({
      where: { 
        orderId: orderId,
        isDeleted: false
      }
    })
    
    const newSubtotal = allItems.reduce((sum, item) => sum + Number(item.subtotal), 0)
    const newTotal = newSubtotal * 1.10 // Añadir impuesto

    // Actualizar el total de la orden
    await prisma.order.update({
      where: { id: orderId },
      data: { totalAmount: newTotal }
    })

    // Crear mensaje en el chat notificando al comprador
    const buyerAuthUser = order.client.authenticated_users[0]
    if (buyerAuthUser) {
      const actionText = existingItem 
        ? `actualizado la cantidad de "${product.name}" a ${updatedQuantity}` 
        : `agregado "${product.name}" (${quantity} ${product.unit || 'unid.'})`
      
      await prisma.chatMessage.create({
        data: {
          senderId: authUser.id,
          receiverId: buyerAuthUser.id,
          message: `📦 He ${actionText} en tu orden #${order.orderNumber}.${note ? `\n📝 Nota: ${note}` : ''}`,
          userId: authUser.id,
          orderId: orderId,
          sellerId: sellerId
        }
      })

      // Enviar notificación multicanal con el tipo correcto
      await notifyBuyer(
        order.clientId,
        'PRODUCT_ADDED',
        {
          orderNumber: order.orderNumber,
          orderId: order.id,
          sellerName: order.seller.name,
          productName: product.name,
          quantity: existingItem ? updatedQuantity : quantity,
          note: note || undefined
        }
      )

      // Enviar evento en tiempo real al comprador
      await sendRealtimeEvent(
        getBuyerChannel(buyerAuthUser.authId),
        'order:item_added',
        {
          orderId: order.id,
          orderNumber: order.orderNumber,
          productName: product.name,
          quantity: existingItem ? updatedQuantity : quantity,
          sellerName: order.seller.name,
          isUpdate: !!existingItem
        }
      )
    }

    // Enviar evento en tiempo real al vendedor para actualizar su UI
    await sendRealtimeEvent(
      getSellerChannel(userId),
      'order:item_added',
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        productName: product.name,
        quantity: existingItem ? updatedQuantity : quantity,
        clientName: order.client.name,
        isUpdate: !!existingItem
      }
    )

    return NextResponse.json({
      success: true,
      message: existingItem 
        ? `Cantidad de "${product.name}" actualizada a ${updatedQuantity}`
        : `Producto "${product.name}" agregado a la orden`,
      item: newItem,
      newTotal,
      order: {
        id: order.id,
        totalAmount: newTotal,
        itemCount: allItems.length
      }
    })
  } catch (error) {
    console.error('Error adding item to order:', error)
    return NextResponse.json({ error: 'Error al agregar producto' }, { status: 500 })
  }
}

// GET /api/orders/[id]/items - Obtener items de una orden
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: orderId } = await params

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      items: order.orderItems,
      total: order.totalAmount
    })
  } catch (error) {
    console.error('Error fetching order items:', error)
    return NextResponse.json({ error: 'Error al obtener items' }, { status: 500 })
  }
}
