import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/connection-requests/[id]/accept
 * Aceptar solicitud de conexión y crear cliente automáticamente
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

    // Iniciar transacción para crear cliente y actualizar solicitud
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar la solicitud a ACCEPTED
      const updatedRequest = await (tx as any).connectionRequest.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          responseNote,
          respondedAt: new Date()
        }
      })

      // 2. Crear el cliente
      const newClient = await tx.client.create({
        data: {
          name: request.buyerName,
          email: request.buyerEmail,
          phone: request.buyerPhone || '',
          address: request.buyerAddress || 'Por definir',
          sellerId: seller.id
        }
      })

      // 3. Conectar el authenticated_user con el cliente
      const buyerAuthUser = await tx.authenticated_users.findUnique({
        where: { authId: request.buyerClerkId }
      })

      if (buyerAuthUser) {
        await tx.authenticated_users.update({
          where: { id: buyerAuthUser.id },
          data: {
            clients: {
              connect: { id: newClient.id }
            }
          }
        })
      }

      // 4. Crear notificación para el comprador
      await tx.notification.create({
        data: {
          clientId: newClient.id,
          type: 'ORDER_CONFIRMED', // Usamos tipo existente
          title: '🎉 ¡Conexión aceptada!',
          message: `${seller.name} ha aceptado tu solicitud. Ya puedes hacer pedidos.`,
          relatedId: updatedRequest.id,
          metadata: {
            sellerName: seller.name,
            sellerId: seller.id,
            isConnectionAccepted: true
          }
        }
      })

      return { request: updatedRequest, client: newClient }
    })

    console.log('✅ Solicitud aceptada:', id)
    console.log('👤 Cliente creado:', result.client.id, result.client.name)

    return NextResponse.json({
      success: true,
      data: {
        request: result.request,
        client: result.client
      },
      message: `Cliente "${result.client.name}" creado exitosamente`
    })

  } catch (error) {
    console.error('Error aceptando solicitud:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
