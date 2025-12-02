import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/connection-requests
 * Obtener solicitudes de conexión pendientes para el vendedor
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Buscar el seller asociado al usuario
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

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || 'PENDING'

    // Obtener solicitudes
    const requests = await (prisma as any).connectionRequest.findMany({
      where: {
        sellerId: seller.id,
        status: status
      },
      orderBy: { createdAt: 'desc' }
    })

    // Contar pendientes
    const pendingCount = await (prisma as any).connectionRequest.count({
      where: {
        sellerId: seller.id,
        status: 'PENDING'
      }
    })

    return NextResponse.json({
      success: true,
      data: requests,
      pendingCount
    })

  } catch (error) {
    console.error('Error obteniendo solicitudes:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/connection-requests
 * Crear nueva solicitud de conexión (cuando buyer se registra con link)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { 
      buyerClerkId, 
      buyerName, 
      buyerEmail, 
      buyerPhone,
      buyerAddress,
      sellerId, 
      invitationToken 
    } = body

    if (!buyerClerkId || !buyerName || !buyerEmail || !sellerId) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el seller existe
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId }
    })

    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'Vendedor no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si ya existe una solicitud pendiente
    const existingRequest = await (prisma as any).connectionRequest.findFirst({
      where: {
        buyerClerkId,
        sellerId,
        status: 'PENDING'
      }
    })

    if (existingRequest) {
      return NextResponse.json({
        success: true,
        data: existingRequest,
        message: 'Ya tienes una solicitud pendiente con este vendedor'
      })
    }

    // Verificar si ya está conectado como cliente
    const existingClient = await prisma.client.findFirst({
      where: {
        sellerId,
        authenticated_users: {
          some: { authId: buyerClerkId }
        }
      }
    })

    if (existingClient) {
      return NextResponse.json({
        success: true,
        alreadyConnected: true,
        message: 'Ya estás conectado con este vendedor'
      })
    }

    // Crear la solicitud
    const connectionRequest = await (prisma as any).connectionRequest.create({
      data: {
        buyerClerkId,
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerAddress,
        sellerId,
        invitationToken,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expira en 7 días
      }
    })

    // Crear notificación para el vendedor
    await prisma.notification.create({
      data: {
        sellerId,
        type: 'NEW_ORDER', // Usamos NEW_ORDER temporalmente ya que CONNECTION_REQUEST necesita migración
        title: '🔔 Nueva solicitud de conexión',
        message: `${buyerName} (${buyerEmail}) quiere conectarse contigo como cliente`,
        relatedId: connectionRequest.id,
        metadata: {
          requestId: connectionRequest.id,
          buyerName,
          buyerEmail,
          buyerPhone,
          isConnectionRequest: true
        }
      }
    })

    console.log('✅ Solicitud de conexión creada:', connectionRequest.id)
    console.log('📧 Notificación enviada al vendedor:', sellerId)

    return NextResponse.json({
      success: true,
      data: connectionRequest,
      message: 'Solicitud enviada. El vendedor será notificado.'
    })

  } catch (error) {
    console.error('Error creando solicitud:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
