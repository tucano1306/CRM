import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()

    console.log('🔍 [validate-access] userId:', userId)

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

    console.log('🔍 [validate-access] authUser:', authUser?.id, 'clients:', authUser?.clients?.length)

    if (!authUser) {
      // Verificar si hay una solicitud de conexión pendiente
      try {
        const pendingRequest = await (prisma as any).connectionRequest.findFirst({
          where: { 
            buyerClerkId: userId,
            status: 'PENDING'
          }
        })

        console.log('🔍 [validate-access] pendingRequest:', pendingRequest?.id)

        if (pendingRequest) {
          return NextResponse.json({ 
            hasAccess: false, 
            reason: 'Tu solicitud de conexión está pendiente de aprobación. Te notificaremos cuando sea aceptada.',
            pendingRequest: {
              createdAt: pendingRequest.createdAt
            }
          })
        }
      } catch (reqError: any) {
        console.log('⚠️ [validate-access] Error verificando solicitudes:', reqError.message)
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
      try {
        const pendingRequest = await (prisma as any).connectionRequest.findFirst({
          where: { 
            buyerClerkId: userId,
            status: 'PENDING'
          }
        })

        console.log('🔍 [validate-access] pendingRequest (no client):', pendingRequest?.id)

        if (pendingRequest) {
          return NextResponse.json({ 
            hasAccess: false, 
            reason: 'Tu solicitud de conexión está pendiente de aprobación. Te notificaremos cuando sea aceptada.',
            pendingRequest: {
              createdAt: pendingRequest.createdAt
            }
          })
        }
      } catch (reqError: any) {
        console.log('⚠️ [validate-access] Error verificando solicitudes:', reqError.message)
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

    console.log('✅ [validate-access] Acceso concedido para cliente:', client.id)

    // Cliente válido con vendedor
    return NextResponse.json({ 
      hasAccess: true,
      client: {
        id: client.id,
        name: client.name,
        sellerName: client.seller.name
      }
    })

  } catch (error: any) {
    console.error('❌ [validate-access] Error:', error.message)
    return NextResponse.json(
      { hasAccess: false, reason: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
