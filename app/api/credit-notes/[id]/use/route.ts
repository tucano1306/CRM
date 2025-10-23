// app/api/credit-notes/[id]/use/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

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

    // Validar
    if (!body.orderId || !body.amountToUse) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Verificar que la nota de crédito existe y está activa
    const creditNote = await prisma.creditNote.findUnique({
      where: { id }
    })

    if (!creditNote) {
      return NextResponse.json({ error: 'Nota de crédito no encontrada' }, { status: 404 })
    }

    if (!creditNote.isActive) {
      return NextResponse.json({ error: 'Nota de crédito inactiva' }, { status: 400 })
    }

    if (creditNote.balance < body.amountToUse) {
      return NextResponse.json({ error: 'Saldo insuficiente en la nota de crédito' }, { status: 400 })
    }

    // Verificar que la nota no ha expirado
    if (creditNote.expiresAt && new Date() > creditNote.expiresAt) {
      return NextResponse.json({ error: 'Nota de crédito expirada' }, { status: 400 })
    }

    // Verificar que la orden existe
    const order = await prisma.order.findUnique({
      where: { id: body.orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Verificar que la orden pertenece al mismo cliente
    if (order.clientId !== creditNote.clientId) {
      return NextResponse.json({ error: 'La nota de crédito no pertenece a este cliente' }, { status: 403 })
    }

    // Crear registro de uso
    const usage = await prisma.creditNoteUsage.create({
      data: {
        creditNoteId: id,
        orderId: body.orderId,
        amountUsed: body.amountToUse,
        notes: body.notes
      }
    })

    // Actualizar balance de la nota de crédito
    const updatedCreditNote = await prisma.creditNote.update({
      where: { id },
      data: {
        balance: {
          decrement: body.amountToUse
        },
        usedAmount: {
          increment: body.amountToUse
        },
        // Si el balance llega a 0, desactivar
        isActive: creditNote.balance - body.amountToUse > 0
      }
    })

    // Actualizar el total de la orden (descontar el crédito usado)
    const updatedOrder = await prisma.order.update({
      where: { id: body.orderId },
      data: {
        totalAmount: {
          decrement: body.amountToUse
        },
        notes: order.notes 
          ? `${order.notes}\n\nCrédito aplicado: $${body.amountToUse} (${creditNote.creditNoteNumber})`
          : `Crédito aplicado: $${body.amountToUse} (${creditNote.creditNoteNumber})`
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        usage,
        creditNote: updatedCreditNote,
        order: updatedOrder
      },
      message: 'Crédito aplicado exitosamente'
    })
  } catch (error) {
    console.error('Error using credit note:', error)
    return NextResponse.json({ error: 'Error al usar nota de crédito' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
