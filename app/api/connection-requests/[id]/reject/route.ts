import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/connection-requests/[id]/reject
 * Rechazar solicitud de conexión
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    const { id } = await params
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Buscar el seller
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { sellers: true }
    })

    const seller = authUser?.sellers?.[0]

    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos de vendedor' },
        { status: 403 }
      )
    }

    // Buscar la solicitud
    const request = await (prisma as any).connectionRequest.findUnique({
      where: { id }
    })

    if (!request) {
      return NextResponse.json(
        { success: false, error: 'Solicitud no encontrada' },
        { status: 404 }
      )
    }

    if (request.sellerId !== seller.id) {
      return NextResponse.json(
        { success: false, error: 'Esta solicitud no te pertenece' },
        { status: 403 }
      )
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Esta solicitud ya fue procesada' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { responseNote } = body

    // Actualizar la solicitud a REJECTED
    const updatedRequest = await (prisma as any).connectionRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        responseNote: responseNote || 'Solicitud rechazada por el vendedor',
        respondedAt: new Date()
      }
    })

    console.log('❌ Solicitud rechazada:', id)

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: 'Solicitud rechazada'
    })

  } catch (error) {
    console.error('Error rechazando solicitud:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
