// app/api/orders/[id]/complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { sanitizeText } from '@/lib/sanitize'
import { z } from 'zod'

// Usar singleton de Prisma

// UUID regex pattern for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ✅ SCHEMA DE VALIDACIÓN
const completeOrderSchema = z.object({
  idempotencyKey: z.string().regex(uuidRegex, 'Idempotency key debe ser UUID válido').optional(),
  notes: z.string().max(500, 'Notas no pueden exceder 500 caracteres').optional()
})

/**
 * PUT /api/orders/[id]/complete
 * Completar orden (CONFIRMED → COMPLETED)
 * Solo el vendedor asignado puede completar
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

    // ✅ VALIDACIÓN
    const validation = completeOrderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Datos inválidos',
          details: validation.error.issues.map(i => i.message)
        },
        { status: 400 }
      )
    }

    const { idempotencyKey, notes } = validation.data
    
    // ✅ SANITIZACIÓN
    const sanitizedNotes = notes ? sanitizeText(notes) : undefined

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
      const updateData: any = {
        status: 'COMPLETED',
        completedAt: new Date()
      }
      
      // ✅ AGREGAR NOTAS SANITIZADAS SI EXISTEN
      if (sanitizedNotes) {
        updateData.notes = sanitizedNotes
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: updateData,
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