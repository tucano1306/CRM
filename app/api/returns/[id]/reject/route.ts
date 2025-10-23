// app/api/returns/[id]/reject/route.ts
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
        notes: body.rejectionReason 
          ? `RECHAZADA: ${body.rejectionReason}${returnRecord.notes ? `\n\nNotas originales: ${returnRecord.notes}` : ''}`
          : returnRecord.notes
      },
      include: {
        items: true,
        client: true,
        order: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedReturn,
      message: 'Devolución rechazada'
    })
  } catch (error) {
    console.error('Error rejecting return:', error)
    return NextResponse.json({ error: 'Error al rechazar devolución' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
