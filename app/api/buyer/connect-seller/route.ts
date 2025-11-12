// app/api/buyer/connect-seller/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/buyer/connect-seller
 * Conecta un comprador (cliente) con un vendedor usando un token de invitación
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
    const { token, sellerId } = body

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

    // Verificar que el vendedor existe y obtener su authenticated_user
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        authenticated_users: true
      }
    })

    if (!seller) {
      return NextResponse.json(
        { error: 'Vendedor no encontrado' },
        { status: 404 }
      )
    }

    // Obtener el authId del vendedor para las notificaciones
    const sellerAuthId = seller.authenticated_users?.[0]?.authId

    // Buscar si el usuario ya tiene un authenticated_user
    const authUser = await prisma.authenticated_users.findFirst({
      where: { id: userId },
      include: {
        clients: true
      }
    })

    let client

    if (authUser && authUser.clients.length > 0) {
      // El usuario ya tiene un client, actualizar el sellerId
      client = authUser.clients[0]
      
      // Verificar si ya está conectado a este vendedor
      if (client.sellerId === sellerId) {
        return NextResponse.json({
          success: true,
          message: 'Ya estás conectado con este vendedor',
          data: {
            clientId: client.id,
            sellerId: seller.id
          }
        })
      }

      // Actualizar la conexión con el nuevo vendedor
      client = await prisma.client.update({
        where: { id: client.id },
        data: { sellerId }
      })

    } else {
      // El usuario no tiene cliente, obtener info de Clerk
      const clerkUser = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`
        }
      }).then(res => res.json())

      const email = clerkUser.email_addresses?.[0]?.email_address || 'sin-email@example.com'
      const firstName = clerkUser.first_name || ''
      const lastName = clerkUser.last_name || ''
      const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0]
      const phone = clerkUser.phone_numbers?.[0]?.phone_number || ''

      // Crear o actualizar authenticated_user usando upsert
      const authUserData = await prisma.authenticated_users.upsert({
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

      // Crear el client conectado al vendedor
      client = await prisma.client.create({
        data: {
          name: fullName,
          email,
          phone: phone || null,
          address: 'Por definir',
          sellerId,
          authenticated_users: {
            connect: { id: authUserData.id }
          }
        }
      })

      // Crear notificación para el vendedor
      await prisma.notification.create({
        data: {
          sellerId: seller.id,
          type: 'NEW_ORDER', // Reutilizamos este tipo para notificaciones de clientes
          title: '🎉 Nuevo cliente conectado',
          message: `${fullName} aceptó tu invitación y se conectó como cliente`,
          metadata: {
            clientId: client.id,
            clientName: fullName,
            clientEmail: email,
            action: 'CLIENT_CONNECTED'
          }
        }
      })
    }

    // Si actualizó la conexión (cambió de vendedor), también notificar
    if (authUser && authUser.clients.length > 0 && authUser.clients[0].sellerId !== sellerId) {
      await prisma.notification.create({
        data: {
          sellerId: seller.id,
          type: 'NEW_ORDER',
          title: '🎉 Nuevo cliente conectado',
          message: `${client.name} aceptó tu invitación y se conectó como cliente`,
          metadata: {
            clientId: client.id,
            clientName: client.name,
            clientEmail: client.email,
            action: 'CLIENT_CONNECTED'
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Conectado exitosamente con el vendedor',
      data: {
        clientId: client.id,
        sellerId: seller.id,
        sellerName: seller.name
      }
    })

  } catch (error) {
    console.error('❌ Error conectando buyer con seller:', error)
    return NextResponse.json(
      { error: 'Error al conectar con el vendedor' },
      { status: 500 }
    )
  }
}
