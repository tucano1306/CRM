// app/api/returns/[id]/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Obtener devolución específica
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const returnRecord = await prisma.return.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            orderItems: true
          }
        },
        client: true,
        seller: true,
        items: {
          include: {
            product: true,
            orderItem: true
          }
        },
        creditNote: {
          include: {
            usage: {
              include: {
                order: true
              }
            }
          }
        }
      }
    })

    if (!returnRecord) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: returnRecord })
  } catch (error) {
    console.error('Error fetching return:', error)
    return NextResponse.json({ error: 'Error al obtener devolución' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// PATCH - Actualizar devolución
export async function PATCH(
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
    const existingReturn = await prisma.return.findUnique({
      where: { id }
    })

    if (!existingReturn) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 })
    }

    // Solo se puede editar si está PENDING
    if (existingReturn.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Solo se pueden editar devoluciones pendientes' },
        { status: 400 }
      )
    }

    // Actualizar
    const updatedReturn = await prisma.return.update({
      where: { id },
      data: {
        reason: body.reason || existingReturn.reason,
        reasonDescription: body.reasonDescription || existingReturn.reasonDescription,
        refundType: body.refundType || existingReturn.refundType,
        notes: body.notes || existingReturn.notes
      },
      include: {
        items: true,
        order: true
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedReturn,
      message: 'Devolución actualizada exitosamente'
    })
  } catch (error) {
    console.error('Error updating return:', error)
    return NextResponse.json({ error: 'Error al actualizar devolución' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE - Eliminar devolución
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar que existe
    const existingReturn = await prisma.return.findUnique({
      where: { id },
      include: {
        creditNote: true
      }
    })

    if (!existingReturn) {
      return NextResponse.json({ error: 'Devolución no encontrada' }, { status: 404 })
    }

    // Solo se puede eliminar si está PENDING o REJECTED
    if (!['PENDING', 'REJECTED'].includes(existingReturn.status)) {
      return NextResponse.json(
        { error: 'No se puede eliminar una devolución aprobada o completada' },
        { status: 400 }
      )
    }

    // Verificar que no tiene nota de crédito
    if (existingReturn.creditNote) {
      return NextResponse.json(
        { error: 'No se puede eliminar una devolución con nota de crédito asociada' },
        { status: 400 }
      )
    }

    // Eliminar (los items se eliminan en cascada)
    await prisma.return.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Devolución eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error deleting return:', error)
    return NextResponse.json({ error: 'Error al eliminar devolución' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
