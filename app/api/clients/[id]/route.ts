import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { updateClientSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'

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
    const completedStatuses = ['COMPLETED', 'DELIVERED', 'PARTIALLY_DELIVERED', 'PAID']
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
          totalSpent: stats._sum.totalAmount || 0
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
    // Verificar si tiene órdenes
    const ordersCount = await prisma.order.count({
      where: { clientId: clientId }
    })

   if (ordersCount > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No se puede eliminar un cliente con órdenes existentes' 
        },
        { status: 400 }
      )
    }

    await prisma.client.delete({
      where: { id: clientId }
    })

    return NextResponse.json({
      success: true,
      message: 'Cliente eliminado exitosamente'
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