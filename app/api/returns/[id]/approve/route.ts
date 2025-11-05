// app/api/returns/[id]/approve/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { notifyReturnApproved } from '@/lib/notifications'
import logger, { LogCategory } from '@/lib/logger'
import { approveReturnSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // ✅ VALIDACIÓN CON ZOD
    const validation = validateSchema(approveReturnSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: validation.errors
      }, { status: 400 })
    }

    const { refundMethod, notes } = validation.data

    // ✅ SANITIZACIÓN
    const sanitizedNotes = notes ? sanitizeText(notes) : undefined

    // Verificar que existe
    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: { items: true }
    })

    if (!returnRecord) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 })
    }

    if (returnRecord.status !== 'PENDING') {
      return NextResponse.json({ error: 'Solo se pueden aprobar devoluciones pendientes' }, { status: 400 })
    }

    // Actualizar estado y crear nota de crédito si el tipo de reembolso es CREDIT
    const updatedReturn = await prisma.return.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
        refundType: refundMethod, // Actualizar con el método elegido
        notes: sanitizedNotes || returnRecord.notes
      },
      include: {
        items: true,
        client: true,
        order: true
      }
    })

    // Crear nota de crédito si el tipo de devolución es CREDIT
    let creditNote = null
    if (refundMethod === 'CREDIT') {
      console.log('💳 [RETURN APPROVED] Creando nota de crédito para cliente:', returnRecord.clientId)
      
      const creditNoteNumber = `CN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      
      creditNote = await prisma.creditNote.create({
        data: {
          creditNoteNumber,
          returnId: id,
          clientId: returnRecord.clientId,
          sellerId: returnRecord.sellerId,
          amount: Number(returnRecord.finalRefundAmount),
          balance: Number(returnRecord.finalRefundAmount),
          usedAmount: 0,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
          isActive: true,
          notes: `Crédito por devolución ${returnRecord.returnNumber}`
        }
      })
      
      console.log('✅ [RETURN APPROVED] Nota de crédito creada:', creditNote.creditNoteNumber)
      
      // Crear notificación de crédito emitido
      await prisma.notification.create({
        data: {
          type: 'CREDIT_NOTE_ISSUED',
          title: '💳 Crédito a tu Favor',
          message: `Se ha emitido un crédito de $${Number(returnRecord.finalRefundAmount).toFixed(2)} por tu devolución ${returnRecord.returnNumber}. Puedes usarlo en tu próxima compra.`,
          clientId: returnRecord.clientId,
          relatedId: creditNote.id,
          orderId: returnRecord.orderId,
          isRead: false
        }
      })
      
      console.log('🔔 [RETURN APPROVED] Notificación de crédito enviada al cliente')
    }

    // 🔔 ENVIAR NOTIFICACIÓN AL COMPRADOR sobre aprobación de devolución
    try {
      await notifyReturnApproved(
        updatedReturn.clientId,
        updatedReturn.id,
        updatedReturn.returnNumber,
        Number(updatedReturn.finalRefundAmount || 0)
      )
      
      logger.info(
        LogCategory.API,
        'Return approval notification sent to client',
        {
          clientId: updatedReturn.clientId,
          returnId: id,
          returnNumber: updatedReturn.returnNumber
        }
      )
    } catch (notifError) {
      // No bloquear la respuesta si falla la notificación
      logger.error(
        LogCategory.API,
        'Error sending return approval notification',
        notifError
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedReturn,
      creditNote: creditNote,
      message: creditNote 
        ? `Devolución aprobada y crédito de $${Number(returnRecord.finalRefundAmount).toFixed(2)} emitido exitosamente`
        : 'Devolución aprobada exitosamente'
    })
  } catch (error) {
    console.error('Error approving return:', error)
    return NextResponse.json({ error: 'Error al aprobar devolución' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
