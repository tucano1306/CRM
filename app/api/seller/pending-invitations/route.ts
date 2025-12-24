import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { contactValue, contactName, channel, invitationToken, invitationLink } = body

    if (!contactValue || !channel || !invitationToken || !invitationLink) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    // Buscar el seller
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'Vendedor no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si ya existe una invitación pendiente para este contacto
    const existingInvitation = await prisma.pendingInvitation.findFirst({
      where: {
        sellerId: seller.id,
        contactValue,
        status: 'PENDING'
      }
    })

    if (existingInvitation) {
      // Actualizar la invitación existente
      const updated = await prisma.pendingInvitation.update({
        where: { id: existingInvitation.id },
        data: {
          invitationToken,
          invitationLink,
          contactName: contactName || existingInvitation.contactName,
          updatedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        data: updated,
        message: 'Invitación actualizada'
      })
    }

    // Crear nueva invitación
    const invitation = await prisma.pendingInvitation.create({
      data: {
        sellerId: seller.id,
        contactValue,
        contactName,
        channel,
        invitationToken,
        invitationLink,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      data: invitation,
      message: 'Invitación guardada'
    })

  } catch (error) {
    console.error('Error guardando invitación:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Obtener invitaciones pendientes del vendedor
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'Vendedor no encontrado' },
        { status: 404 }
      )
    }

    const invitations = await prisma.pendingInvitation.findMany({
      where: {
        sellerId: seller.id,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: invitations
    })

  } catch (error) {
    console.error('Error obteniendo invitaciones:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
