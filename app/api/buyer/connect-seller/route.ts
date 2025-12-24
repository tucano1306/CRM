// app/api/buyer/connect-seller/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/buyer/connect-seller
 * Conecta directamente al buyer con el vendedor usando un token de invitación
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
    const authUser = await prisma.authenticated_users.upsert({
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

    // Verificar si ya existe un cliente con este email y vendedor
    const existingClient = await prisma.client.findFirst({
      where: {
        email: email,
        sellerId: seller.id
      }
    })

    if (existingClient) {
      // Conectar el cliente existente al authenticated_user si no lo está
      await prisma.authenticated_users.update({
        where: { id: authUser.id },
        data: {
          clients: {
            connect: { id: existingClient.id }
          }
        }
      })
      
      return NextResponse.json({
        success: true,
        status: 'ALREADY_CONNECTED',
        message: 'Ya estás conectado con este vendedor',
        data: {
          clientId: existingClient.id,
          sellerId: seller.id,
          sellerName: seller.name
        }
      })
    }

    // CREAR CLIENTE Y CONECTARLO AL AUTHENTICATED_USER
    const client = await prisma.client.create({
      data: {
        name: fullName,
        email,
        phone: phone || '',
        address: '',
        sellerId: seller.id,
        authenticated_users: {
          connect: { id: authUser.id }
        }
      }
    })

    console.log('✅ Cliente creado:', client.id, 'para vendedor:', seller.name)

    // Notificación informativa
    try {
      await prisma.notification.create({
        data: {
          sellerId: seller.id,
          type: 'CONNECTION_ACCEPTED',
          title: '🎉 Nuevo cliente',
          message: `${fullName} se ha conectado como tu cliente`,
          relatedId: client.id
        }
      })
    } catch (notifError) {
      console.log('No se pudo crear notificación:', notifError)
    }

    return NextResponse.json({
      success: true,
      status: 'CONNECTED',
      message: `¡Conectado con ${seller.name}!`,
      data: {
        clientId: client.id,
        sellerId: seller.id,
        sellerName: seller.name
      }
    })

  } catch (error: any) {
    console.error('Error:', error.message)
    return NextResponse.json(
      { error: 'Error al conectar' },
      { status: 500 }
    )
  }
}
