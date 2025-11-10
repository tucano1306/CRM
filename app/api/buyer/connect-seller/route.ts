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

      // Crear o actualizar authenticated_user
      const authUserData = authUser ? authUser : await prisma.authenticated_users.create({
        data: {
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
