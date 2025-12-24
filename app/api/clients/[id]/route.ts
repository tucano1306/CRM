import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateClientSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'
import { OrderStatus } from '@prisma/client'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        seller: true,        
        orders: {
          include: {
            orderItems: true  // ✅
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    })
    
    if (!client) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cliente no encontrado' 
        },
        { status: 404 }
      )
    }

    // Calcular estadísticas
    // Calcular estadísticas de órdenes completadas/entregadas
    const completedStatuses: OrderStatus[] = ['COMPLETED', 'DELIVERED', 'PARTIALLY_DELIVERED', 'PAID']
    const stats = await prisma.order.aggregate({
      where: { 
        clientId: clientId,
        status: { in: completedStatuses }
      },
      _sum: { totalAmount: true },
      _count: true
    })

    const totalOrders = await prisma.order.count({
      where: { clientId: clientId }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...client,
        stats: {
          totalOrders,
          completedOrders: stats._count,
          totalSpent: stats._sum?.totalAmount || 0
        }
      }
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener cliente' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const body = await request.json()

    // ✅ VALIDACIÓN CON ZOD
    const validation = validateSchema(updateClientSchema, body)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Datos inválidos',
          details: validation.errors
        },
        { status: 400 }
      )
    }

    // ✅ SANITIZACIÓN
    const sanitizedData: any = {}
    
    if (validation.data.name) {
      sanitizedData.name = sanitizeText(validation.data.name)
    }
    if (validation.data.businessName) {
      sanitizedData.businessName = sanitizeText(validation.data.businessName)
    }
    if (validation.data.address) {
      sanitizedData.address = sanitizeText(validation.data.address)
    }
    if (validation.data.zipCode) {
      sanitizedData.zipCode = validation.data.zipCode.trim()
    }
    if (validation.data.phone) {
      sanitizedData.phone = validation.data.phone.trim()
    }
    if (validation.data.email) {
      sanitizedData.email = validation.data.email.toLowerCase().trim()
    }
    if (validation.data.sellerId !== undefined) {
      sanitizedData.sellerId = validation.data.sellerId
    }
    if (validation.data.orderConfirmationEnabled !== undefined) {
      sanitizedData.orderConfirmationEnabled = validation.data.orderConfirmationEnabled
    }
    if (validation.data.orderConfirmationMethod !== undefined) {
      sanitizedData.orderConfirmationMethod = validation.data.orderConfirmationMethod
    }
    if (validation.data.notificationsEnabled !== undefined) {
      sanitizedData.notificationsEnabled = validation.data.notificationsEnabled
    }

    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: sanitizedData,
      include: { seller: true }
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: updatedClient
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al actualizar cliente' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    
    // Verificar que el cliente existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        authenticated_users: true
      }
    })

    if (!client) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Cliente no encontrado' 
        },
        { status: 404 }
      )
    }

    // Eliminar en orden para respetar foreign keys
    // 1. Eliminar items de órdenes
    await prisma.orderItem.deleteMany({
      where: {
        order: {
          clientId
        }
      }
    })

    // 2. Eliminar órdenes
    await prisma.order.deleteMany({
      where: { clientId }
    })

    // 3. Eliminar mensajes de chat
    await prisma.chatMessage.deleteMany({
      where: {
        OR: [
          { senderId: clientId },
          { receiverId: clientId }
        ]
      }
    })

    // 4. Eliminar solicitudes de conexión relacionadas
    await prisma.connectionRequest.deleteMany({
      where: { buyerClerkId: client.authenticated_users[0]?.authId || '' }
    })

    // 5. Eliminar el cliente
    await prisma.client.delete({
      where: { id: clientId }
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente y todos sus datos eliminados exitosamente'
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al eliminar cliente' 
      },
      { status: 500 }
    )
  }
}