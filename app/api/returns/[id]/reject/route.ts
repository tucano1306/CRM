// app/api/returns/[id]/reject/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { notifyReturnRejected } from '@/lib/notifications'
import logger, { LogCategory } from '@/lib/logger'
import { rejectReturnSchema, validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'
import { prisma } from '@/lib/prisma'

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
    const validation = validateSchema(rejectReturnSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: validation.errors
      }, { status: 400 })
    }

    const { reason, notes } = validation.data

    // ✅ SANITIZACIÓN
    const sanitizedReason = reason ? sanitizeText(reason) : undefined
    const sanitizedNotes = notes ? sanitizeText(notes) : undefined

    // Verificar que existe
    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        client: true,
        order: true
      }
    })

    if (!returnRecord) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 })
    }

    // Solo se puede rechazar si está PENDING
    if (returnRecord.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Solo se pueden rechazar devoluciones pendientes' },
        { status: 400 }
      )
    }

    // Actualizar estado a REJECTED
    const updatedReturn = await prisma.return.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: userId,
        approvedAt: new Date(),
        notes: (() => {
          if (sanitizedReason) {
            const originalNotes = returnRecord.notes ? `\n\nNotas originales: ${returnRecord.notes}` : '';
            return `RECHAZADA: ${sanitizedReason}${originalNotes}`;
          }
          return sanitizedNotes || returnRecord.notes;
        })()
      },
      include: {
        items: true,
        client: true,
        order: true
      }
    })

    // 🔔 ENVIAR NOTIFICACIÓN AL COMPRADOR sobre rechazo de devolución
    try {
      await notifyReturnRejected(
        updatedReturn.clientId,
        updatedReturn.id,
        updatedReturn.returnNumber,
        sanitizedReason || 'No se especificó motivo'
      )
      
      logger.info(
        LogCategory.API,
        'Return rejection notification sent to client',
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
        'Error sending return rejection notification',
        notifError
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedReturn,
      message: 'Devolución rechazada'
    })
  } catch (error) {
    console.error('Error rejecting return:', error)
    return NextResponse.json({ error: 'Error al rechazar devolución' }, { status: 500 })
  } finally {
    // prisma singleton
  }
}
