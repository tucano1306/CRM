// app/api/orders/[id]/cancel/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { cancelOrderSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'
import { prisma } from '@/lib/prisma'

/**
 * PUT /api/orders/[id]/cancel
 * Cancelar orden
 * Puede ser cancelada por el cliente (owner) o el vendedor asignado
 * ✅ CON VALIDACIÓN ZOD
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: orderId } = await params
    const body = await request.json()

    // ✅ VALIDACIÓN CON ZOD
    const validation = validateSchema(cancelOrderSchema, body)
    
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

    const { reason } = validation.data
    const idempotencyKey = body.idempotencyKey // opcional
    
    // ✅ SANITIZACIÓN
    const sanitizedReason = sanitizeText(reason)

    // 2. Validar idempotencyKey (opcional)
    if (idempotencyKey) {
      const existingUpdate = await prisma.orderStatusUpdate.findUnique({
        where: { idempotencyKey },
        include: { order: true }
      })

      if (existingUpdate) {
        return NextResponse.json({
          success: true,
          message: 'Orden ya cancelada previamente (idempotent)',
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

    // 4. Verificar permisos: cliente o vendedor de la orden
    const userClient = await prisma.client.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    const userSeller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    const isClientOwner = userClient && userClient.id === order.clientId
    const isSellerAssigned = userSeller && userSeller.id === order.sellerId

    if (!isClientOwner && !isSellerAssigned) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para cancelar esta orden' },
        { status: 403 }
      )
    }

    // 5. Verificar que la orden no esté ya COMPLETED o CANCELED
    if (order.status === 'COMPLETED') {
      return NextResponse.json(
        { success: false, error: 'No se puede cancelar una orden completada' },
        { status: 400 }
      )
    }

    if (order.status === 'CANCELED') {
      return NextResponse.json(
        { success: false, error: 'La orden ya está cancelada' },
        { status: 400 }
      )
    }

    // 6. Actualizar orden a CANCELED usando transacción
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Actualizar orden
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          notes: reason ? `${order.notes || ''}\nMotivo de cancelación: ${reason}`.trim() : order.notes
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
            oldStatus: order.status,
            newStatus: 'CANCELED'
          }
        })
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      message: 'Orden cancelada exitosamente',
      order: updatedOrder
    })

  } catch (error) {
    console.error('Error en PUT /api/orders/[id]/cancel:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  } finally {
    // prisma singleton
  }
}