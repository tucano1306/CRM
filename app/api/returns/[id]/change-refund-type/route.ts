import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ SCHEMA INLINE
const changeRefundTypeSchema = z.object({
  refundType: z.enum(['CREDIT', 'REFUND', 'REPLACEMENT'], {
    message: 'Tipo de reembolso debe ser: CREDIT, REFUND, o REPLACEMENT'
  })
})

// Helper: Get authenticated client ID
async function getAuthenticatedClientId(userId: string): Promise<string | null> {
  const authUser = await prisma.authenticated_users.findUnique({
    where: { authId: userId },
    include: { clients: true }
  })

  console.log('🔍 [CHANGE-REFUND-TYPE] Auth user:', authUser?.id, 'Clients:', authUser?.clients.length)

  if (!authUser || authUser.clients.length === 0) {
    console.log('❌ [CHANGE-REFUND-TYPE] User not authorized - no client found')
    return null
  }

  return authUser.clients[0].id
}

// Helper: Handle credit note deletion when switching to REFUND
async function handleCreditNoteDeletion(creditNote: { id: string; balance: any; amount: any }): Promise<{ success: boolean; error?: string }> {
  const creditUsed = Number(creditNote.balance) < Number(creditNote.amount)
  if (creditUsed) {
    return { success: false, error: 'No se puede cambiar a reembolso porque el crédito ya fue usado parcialmente' }
  }

  await prisma.creditNote.delete({ where: { id: creditNote.id } })
  return { success: true }
}

// Helper: Create credit note for return
async function createCreditNoteForReturn(returnRecord: {
  id: string
  returnNumber: string
  clientId: string
  sellerId: string
  finalRefundAmount: any
}) {
  const randomString = Math.random().toString(36).substring(2, 9).toUpperCase()
  const creditNoteNumber = `CN-${Date.now()}-${randomString}`

  await prisma.creditNote.create({
    data: {
      creditNoteNumber,
      returnId: returnRecord.id,
      clientId: returnRecord.clientId,
      sellerId: returnRecord.sellerId,
      amount: Number(returnRecord.finalRefundAmount),
      balance: Number(returnRecord.finalRefundAmount),
      usedAmount: 0,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true
    }
  })

  await prisma.notification.create({
    data: {
      type: 'CREDIT_NOTE_ISSUED',
      title: '💳 Crédito Generado',
      message: `Has cambiado tu devolución ${returnRecord.returnNumber} a crédito. El crédito de $${Number(returnRecord.finalRefundAmount).toFixed(2)} está disponible para tus próximas compras.`,
      clientId: returnRecord.clientId,
      relatedId: returnRecord.id,
      isRead: false
    }
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    console.log('🔍 [CHANGE-REFUND-TYPE] User ID:', userId)
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const validation = changeRefundTypeSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        success: false,
        error: 'Datos inválidos',
        details: validation.error.issues.map(i => i.message)
      }, { status: 400 })
    }

    const { refundType } = validation.data
    console.log('🔍 [CHANGE-REFUND-TYPE] Return ID:', id, 'New Type:', refundType)

    const clientId = await getAuthenticatedClientId(userId)
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Usuario no autorizado' }, { status: 403 })
    }
    console.log('🔍 [CHANGE-REFUND-TYPE] Client ID:', clientId)

    const returnRecord = await prisma.return.findFirst({
      where: { id, clientId, status: 'APPROVED' },
      include: { creditNote: true }
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
      return NextResponse.json({ success: false, error: 'Devolución no encontrada o no se puede modificar' }, { status: 404 })
    }

    // Handle no-op case
    if (refundType === 'CREDIT' && returnRecord.creditNote) {
      return NextResponse.json({
        success: true,
        message: 'La devolución ya está configurada como crédito',
        data: returnRecord
      })
    }

    // Handle CREDIT -> REFUND transition
    if (refundType === 'REFUND' && returnRecord.creditNote) {
      const result = await handleCreditNoteDeletion(returnRecord.creditNote)
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 })
      }
    }

    // Handle REFUND -> CREDIT transition
    if (refundType === 'CREDIT' && !returnRecord.creditNote) {
      await createCreditNoteForReturn(returnRecord)
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
