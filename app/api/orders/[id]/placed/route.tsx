// app/api/orders/[id]/placed/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'

const prisma = new PrismaClient()

/**
 * PUT /api/orders/[id]/placed
 * Confirmar orden manualmente (solo para método MANUAL)
 * Solo el buyer dueño puede confirmar
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verificar autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id: orderId } = params
    const body = await request.json()
    const { idempotencyKey } = body

    // 2. Validar idempotencyKey (opcional)
    if (idempotencyKey) {
      const existingUpdate = await prisma.orderStatusUpdate.findUnique({
        where: { idempotencyKey },
        include: { order: true }
      })

      if (existingUpdate) {
        return NextResponse.json({
          success: true,
          message: 'Orden ya confirmada previamente (idempotent)',
          order: existingUpdate.order
        })
      }
    }

    // 3. Obtener la orden y verificar permisos
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        seller: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // 4. Verificar que el usuario autenticado sea el cliente de la orden
    const userClient = await prisma.client.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!userClient || userClient.id !== order.clientId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para confirmar esta orden' },
        { status: 403 }
      )
    }

    // 5. Verificar que el cliente tenga método MANUAL
    if (userClient.orderConfirmationMethod !== 'MANUAL') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Tu método de confirmación no es MANUAL. Contacta al vendedor.' 
        },
        { status: 400 }
      )
    }

    // 6. Verificar que la orden esté en estado PENDING
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede confirmar. Estado actual: ${order.status}` 
        },
        { status: 400 }
      )
    }

    // 7. Actualizar orden a CONFIRMED usando transacción
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Actualizar orden
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date()
        },
        include: {
          client: true,
          seller: true,
          orderItems: {
            include: {
              product: true
            }
          }
        }
      })

      // Registrar el cambio de estado si hay idempotencyKey
      if (idempotencyKey) {
        await tx.orderStatusUpdate.create({
          data: {
            idempotencyKey,
            orderId,
            oldStatus: 'PENDING',
            newStatus: 'CONFIRMED'
          }
        })
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      message: 'Orden confirmada exitosamente',
      order: updatedOrder
    })

  } catch (error) {
    console.error('Error en PUT /api/orders/[id]/placed:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}