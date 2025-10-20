// app/api/orders/[id]/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { auth } from '@clerk/nextjs/server'

const prisma = new PrismaClient()

/**
 * PUT /api/orders/[id]/complete
 * Completar orden (CONFIRMED → COMPLETED)
 * Solo el vendedor asignado puede completar
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
          message: 'Orden ya completada previamente (idempotent)',
          order: existingUpdate.order
        })
      }
    }

    // 3. Obtener la orden
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

    // 4. Verificar que el usuario autenticado sea el vendedor de la orden
    const userSeller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!userSeller || userSeller.id !== order.sellerId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para completar esta orden' },
        { status: 403 }
      )
    }

    // 5. Verificar que la orden esté en estado CONFIRMED
    if (order.status !== 'CONFIRMED') {
      return NextResponse.json(
        { 
          success: false, 
          error: `No se puede completar. Estado actual: ${order.status}. Debe estar en CONFIRMED.` 
        },
        { status: 400 }
      )
    }

    // 6. Actualizar orden a COMPLETED usando transacción
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Actualizar orden
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date()
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
            oldStatus: 'CONFIRMED',
            newStatus: 'COMPLETED'
          }
        })
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      message: 'Orden completada exitosamente',
      order: updatedOrder
    })

  } catch (error) {
    console.error('Error en PUT /api/orders/[id]/complete:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}