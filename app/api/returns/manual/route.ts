import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Verificar que sea un vendedor
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { sellers: true }
    })

    if (!authUser || authUser.sellers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Solo vendedores pueden crear devoluciones manuales' },
        { status: 403 }
      )
    }

    const sellerId = authUser.sellers[0].id

    // Obtener datos del body
    const body = await request.json()
    const { orderId, reason, reasonDescription, amount, notes } = body

    // Validaciones
    if (!orderId || !reason || !amount) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    const returnAmount = parseFloat(amount)
    if (isNaN(returnAmount) || returnAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Monto inválido' },
        { status: 400 }
      )
    }

    // Verificar que la orden existe y pertenece al vendedor
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        sellerId: sellerId,
        status: { in: ['DELIVERED', 'COMPLETED'] }
      },
      include: {
        client: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada o no válida para devolución' },
        { status: 404 }
      )
    }

    if (returnAmount > Number(order.totalAmount)) {
      return NextResponse.json(
        { success: false, error: 'El monto excede el total de la orden' },
        { status: 400 }
      )
    }

    // Crear devolución manual (directamente aprobada)
    const returnNumber = `RET-${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`
    
    const manualReturn = await prisma.$transaction(async (tx) => {
      // Crear la devolución con status APPROVED
      const newReturn = await tx.return.create({
        data: {
          returnNumber: returnNumber,
          orderId: orderId,
          clientId: order.clientId,
          sellerId: sellerId,
          reason: reason,
          reasonDescription: reasonDescription,
          status: 'APPROVED', // Pre-aprobada
          refundType: 'CREDIT', // Siempre como crédito
          totalReturnAmount: returnAmount,
          finalRefundAmount: returnAmount,
          approvedAt: new Date(),
          notes: notes,
          isManual: true // Marcador de devolución manual
        }
      })

      // Crear la nota de crédito automáticamente
      const randomString = Math.random().toString(36).substring(2, 9).toUpperCase()
      const creditNoteNumber = `CN-${Date.now()}-${randomString}`

      const creditNote = await tx.creditNote.create({
        data: {
          creditNoteNumber: creditNoteNumber,
          returnId: newReturn.id,
          clientId: order.clientId,
          sellerId: sellerId,
          amount: returnAmount,
          balance: returnAmount,
          usedAmount: 0,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
          isActive: true
        }
      })

      // Crear notificación para el comprador
      await tx.notification.create({
        data: {
          type: 'CREDIT_NOTE_ISSUED',
          title: '💳 Crédito a tu Favor',
          message: `Se ha emitido un crédito de $${returnAmount.toFixed(2)} por devolución manual. Razón: ${reasonDescription}. Este crédito está disponible para tus próximas compras.`,
          clientId: order.clientId,
          relatedId: creditNote.id,
          isRead: false
        }
      })

      return {
        return: newReturn,
        creditNote: creditNote
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        return: manualReturn.return,
        creditNote: manualReturn.creditNote,
        message: 'Devolución manual creada exitosamente. El cliente ha recibido el crédito.'
      }
    })

  } catch (error) {
    console.error('Error creating manual return:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al crear la devolución manual' 
      },
      { status: 500 }
    )
  }
}
