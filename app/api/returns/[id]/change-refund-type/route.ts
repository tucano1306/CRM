import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    console.log('🔍 [CHANGE-REFUND-TYPE] User ID:', userId)
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = params
    const { refundType } = await request.json()
    console.log('🔍 [CHANGE-REFUND-TYPE] Return ID:', id, 'New Type:', refundType)

    // Validar tipo de reembolso
    if (!['CREDIT', 'REFUND'].includes(refundType)) {
      console.log('❌ [CHANGE-REFUND-TYPE] Invalid refund type:', refundType)
      return NextResponse.json(
        { success: false, error: 'Tipo de reembolso inválido' },
        { status: 400 }
      )
    }

    // Verificar que el usuario sea el cliente
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { clients: true }
    })

    console.log('🔍 [CHANGE-REFUND-TYPE] Auth user:', authUser?.id, 'Clients:', authUser?.clients.length)

    if (!authUser || authUser.clients.length === 0) {
      console.log('❌ [CHANGE-REFUND-TYPE] User not authorized - no client found')
      return NextResponse.json(
        { success: false, error: 'Usuario no autorizado' },
        { status: 403 }
      )
    }

    const clientId = authUser.clients[0].id
    console.log('🔍 [CHANGE-REFUND-TYPE] Client ID:', clientId)

    // Buscar la devolución aprobada del cliente
    const returnRecord = await prisma.return.findFirst({
      where: {
        id: id,
        clientId: clientId,
        status: 'APPROVED'
      },
      include: {
        creditNote: true
      }
    })

    console.log('🔍 [CHANGE-REFUND-TYPE] Return found:', returnRecord ? 'YES' : 'NO')
    if (returnRecord) {
      console.log('📋 Return details:', {
        id: returnRecord.id,
        returnNumber: returnRecord.returnNumber,
        status: returnRecord.status,
        refundType: returnRecord.refundType,
        clientId: returnRecord.clientId,
        hasCreditNote: !!returnRecord.creditNote
      })
    }

    if (!returnRecord) {
      console.log('❌ [CHANGE-REFUND-TYPE] Return not found or not approved')
      return NextResponse.json(
        { success: false, error: 'Devolución no encontrada o no se puede modificar' },
        { status: 404 }
      )
    }

    // Si ya existe una nota de crédito y el cambio es a CREDIT, no hacer nada
    if (refundType === 'CREDIT' && returnRecord.creditNote) {
      return NextResponse.json({
        success: true,
        message: 'La devolución ya está configurada como crédito',
        data: returnRecord
      })
    }

    // Si cambia de CREDIT a REFUND y existe nota de crédito, eliminarla si no se ha usado
    if (refundType === 'REFUND' && returnRecord.creditNote) {
      if (returnRecord.creditNote.balance < returnRecord.creditNote.amount) {
        return NextResponse.json(
          { success: false, error: 'No se puede cambiar a reembolso porque el crédito ya fue usado parcialmente' },
          { status: 400 }
        )
      }

      // Eliminar la nota de crédito
      await prisma.creditNote.delete({
        where: { id: returnRecord.creditNote.id }
      })
    }

    // Si cambia de REFUND a CREDIT, crear nota de crédito
    if (refundType === 'CREDIT' && !returnRecord.creditNote) {
      const randomString = Math.random().toString(36).substring(2, 9).toUpperCase()
      const creditNoteNumber = `CN-${Date.now()}-${randomString}`

      await prisma.creditNote.create({
        data: {
          creditNoteNumber: creditNoteNumber,
          returnId: returnRecord.id,
          clientId: returnRecord.clientId,
          sellerId: returnRecord.sellerId,
          amount: Number(returnRecord.finalRefundAmount),
          balance: Number(returnRecord.finalRefundAmount),
          usedAmount: 0,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
          isActive: true
        }
      })

      // Notificar al cliente
      await prisma.notification.create({
        data: {
          type: 'CREDIT_NOTE_ISSUED',
          title: '💳 Crédito Generado',
          message: `Has cambiado tu devolución ${returnRecord.returnNumber} a crédito. El crédito de $${returnRecord.finalRefundAmount.toFixed(2)} está disponible para tus próximas compras.`,
          clientId: returnRecord.clientId,
          relatedId: returnRecord.id,
          isRead: false
        }
      })
    }

    // Actualizar el tipo de reembolso en la devolución
    const updatedReturn = await prisma.return.update({
      where: { id: id },
      data: { refundType: refundType },
      include: {
        creditNote: true,
        order: true,
        client: true,
        seller: true,
        items: true
      }
    })

    return NextResponse.json({
      success: true,
      message: refundType === 'CREDIT' 
        ? 'Devolución cambiada a crédito exitosamente' 
        : 'Devolución cambiada a reembolso exitosamente',
      data: updatedReturn
    })

  } catch (error) {
    console.error('Error changing refund type:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error al cambiar tipo de reembolso' 
      },
      { status: 500 }
    )
  }
}
