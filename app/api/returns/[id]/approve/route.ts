// app/api/returns/[id]/approve/route.ts
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
      include: { items: true }
    })

    if (!returnRecord) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 })
    }

    if (returnRecord.status !== 'PENDING') {
      return NextResponse.json({ error: 'Solo se pueden aprobar devoluciones pendientes' }, { status: 400 })
    }

    // Actualizar estado
    const updatedReturn = await prisma.return.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
        notes: body.notes || returnRecord.notes
      },
      include: {
        items: true,
        client: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedReturn,
      message: 'Devolución aprobada exitosamente'
    })
  } catch (error) {
    console.error('Error approving return:', error)
    return NextResponse.json({ error: 'Error al aprobar devolución' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
