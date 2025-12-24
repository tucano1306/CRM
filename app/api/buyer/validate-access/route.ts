import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ hasAccess: false, reason: 'No autenticado' })
    }

    // Buscar el usuario autenticado con sus clientes
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: {
        clients: {
          include: {
            seller: true
          }
        }
      }
    })

    if (!authUser) {
      // Verificar si hay una solicitud de conexión pendiente
      const pendingRequest = await prisma.connectionRequest.findFirst({
        where: { 
          buyerClerkId: userId,
          status: 'PENDING'
        },
        include: {
          seller: true
        }
      })

      if (pendingRequest) {
        return NextResponse.json({ 
          hasAccess: false, 
          reason: `Tu solicitud de conexión con ${pendingRequest.seller?.name || 'el vendedor'} está pendiente de aprobación. Te notificaremos cuando sea aceptada.`,
          pendingRequest: {
            sellerName: pendingRequest.seller?.name,
            createdAt: pendingRequest.createdAt
          }
        })
      }

      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'Usuario no encontrado en el sistema. Necesitas un link de invitación de un vendedor.' 
      })
    }

    // Verificar si el usuario tiene un cliente asociado
    const client = authUser.clients[0]
    
    if (!client) {
      // Verificar si hay una solicitud de conexión pendiente
      const pendingRequest = await prisma.connectionRequest.findFirst({
        where: { 
          buyerClerkId: userId,
          status: 'PENDING'
        },
        include: {
          seller: true
        }
      })

      if (pendingRequest) {
        return NextResponse.json({ 
          hasAccess: false, 
          reason: `Tu solicitud de conexión con ${pendingRequest.seller?.name || 'el vendedor'} está pendiente de aprobación. Te notificaremos cuando sea aceptada.`,
          pendingRequest: {
            sellerName: pendingRequest.seller?.name,
            createdAt: pendingRequest.createdAt
          }
        })
      }

      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'Tu cuenta de cliente no existe en el sistema. Necesitas un link de invitación de un vendedor.' 
      })
    }

    // Verificar si tiene vendedor asignado
    if (!client.sellerId || !client.seller) {
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'No estás conectado con ningún vendedor activo' 
      })
    }

    // Cliente válido con vendedor
    return NextResponse.json({ 
      hasAccess: true,
      client: {
        id: client.id,
        name: client.name,
        sellerName: client.seller.name
      }
    })

  } catch (error) {
    console.error('Error validando acceso de cliente:', error)
    return NextResponse.json(
      { hasAccess: false, reason: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
