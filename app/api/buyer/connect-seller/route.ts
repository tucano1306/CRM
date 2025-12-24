// app/api/buyer/connect-seller/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/buyer/connect-seller
 * Crea una solicitud de conexión con un vendedor usando un token de invitación
 * El vendedor debe aprobar la solicitud para que el cliente sea creado
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { token, sellerId, phone: phoneFromForm } = body

    if (!token || !sellerId) {
      return NextResponse.json(
        { error: 'Token y sellerId son requeridos' },
        { status: 400 }
      )
    }

    // Validar formato del token
    if (!token.startsWith('inv_') || !token.includes(sellerId)) {
      return NextResponse.json(
        { error: 'Token de invitación inválido' },
        { status: 400 }
      )
    }

    // Verificar que el vendedor existe
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId }
    })

    if (!seller) {
      return NextResponse.json(
        { error: 'Vendedor no encontrado' },
        { status: 404 }
      )
    }

    // Buscar si el usuario ya tiene un authenticated_user y un client con este vendedor
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: {
        clients: {
          where: { sellerId }
        }
      }
    })

    // Si ya está conectado con este vendedor, devolver éxito
    if (authUser && authUser.clients.length > 0) {
      return NextResponse.json({
        success: true,
        status: 'ALREADY_CONNECTED',
        message: 'Ya estás conectado con este vendedor',
        data: {
          clientId: authUser.clients[0].id,
          sellerId: seller.id,
          sellerName: seller.name
        }
      })
    }

    // Verificar si ya tiene una solicitud pendiente
    const existingRequest = await prisma.connectionRequest.findFirst({
      where: {
        buyerClerkId: userId,
        sellerId,
        status: 'PENDING'
      }
    })

    if (existingRequest) {
      return NextResponse.json({
        success: true,
        status: 'PENDING',
        message: 'Ya tienes una solicitud pendiente con este vendedor. Espera a que la apruebe.',
        data: {
          requestId: existingRequest.id,
          sellerId: seller.id,
          sellerName: seller.name,
          createdAt: existingRequest.createdAt
        }
      })
    }

    // Obtener info del usuario de Clerk
    const clerkUser = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`
      }
    }).then(res => res.json())

    const email = clerkUser.email_addresses?.[0]?.email_address || 'sin-email@example.com'
    const firstName = clerkUser.first_name || ''
    const lastName = clerkUser.last_name || ''
    const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0]
    const phone = phoneFromForm || clerkUser.phone_numbers?.[0]?.phone_number || ''

    // Crear o actualizar authenticated_user
    await prisma.authenticated_users.upsert({
      where: { authId: userId },
      update: {
        email,
        name: fullName,
        updatedAt: new Date()
      },
      create: {
        id: userId,
        authId: userId,
        email,
        name: fullName,
        role: 'CLIENT',
        updatedAt: new Date()
      }
    })

    // Crear la solicitud de conexión
    console.log('📝 [connect-seller] Creando solicitud de conexión...')
    console.log('📝 [connect-seller] Datos:', { buyerClerkId: userId, buyerName: fullName, buyerEmail: email, sellerId })
    
    const connectionRequest = await prisma.connectionRequest.create({
      data: {
        buyerClerkId: userId,
        buyerName: fullName,
        buyerEmail: email,
        buyerPhone: phone || null,
        sellerId,
        invitationToken: token,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })
    console.log('✅ [connect-seller] Solicitud creada:', connectionRequest.id)

    // Crear notificación para el vendedor
    console.log('📧 [connect-seller] Creando notificación para vendedor:', seller.id)
    try {
      const notification = await prisma.notification.create({
        data: {
          sellerId: seller.id,
          type: 'CONNECTION_REQUEST',
          title: '🔔 Nueva solicitud de conexión',
          message: `${fullName} (${email}) quiere conectarse contigo como cliente`,
          relatedId: connectionRequest.id,
          metadata: {
            requestId: connectionRequest.id,
            buyerName: fullName,
            buyerEmail: email,
            buyerPhone: phone
          }
        }
      })
      console.log('✅ [connect-seller] Notificación creada:', notification.id)
    } catch (notifError: any) {
      console.error('❌ [connect-seller] Error creando notificación:', notifError.message)
    }

    return NextResponse.json({
      success: true,
      status: 'REQUEST_SENT',
      message: `Solicitud enviada a ${seller.name}. Te notificaremos cuando la apruebe.`,
      data: {
        requestId: connectionRequest.id,
        sellerId: seller.id,
        sellerName: seller.name
      }
    })

  } catch (error) {
    console.error('❌ Error creando solicitud de conexión:', error)
    return NextResponse.json(
      { error: 'Error al enviar solicitud de conexión' },
      { status: 500 }
    )
  }
}
