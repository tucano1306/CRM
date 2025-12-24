import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { token, sellerId, phone } = await request.json()

    if (!token || !sellerId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Verificar vendedor
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId }
    })

    if (!seller) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    // Obtener datos de Clerk
    const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` }
    })
    const clerkUser = await clerkRes.json()

    const email = clerkUser.email_addresses?.[0]?.email_address || ''
    const name = `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || email.split('@')[0]
    const phoneNumber = phone || clerkUser.phone_numbers?.[0]?.phone_number || ''

    // Crear authenticated_user si no existe
    let authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId }
    })

    if (!authUser) {
      authUser = await prisma.authenticated_users.create({
        data: {
          id: userId,
          authId: userId,
          email,
          name,
          role: 'CLIENT',
          updatedAt: new Date()
        }
      })
    }

    // Verificar si ya existe cliente con este vendedor
    let client = await prisma.client.findFirst({
      where: {
        authenticated_users: { some: { id: authUser.id } },
        sellerId: seller.id
      }
    })

    if (client) {
      return NextResponse.json({
        success: true,
        status: 'ALREADY_CONNECTED',
        data: { clientId: client.id, sellerName: seller.name }
      })
    }

    // Crear cliente nuevo
    client = await prisma.client.create({
      data: {
        name,
        email,
        phone: phoneNumber,
        address: '',
        sellerId: seller.id,
        authenticated_users: { connect: { id: authUser.id } }
      }
    })

    // Notificar al vendedor
    await prisma.notification.create({
      data: {
        sellerId: seller.id,
        type: 'CONNECTION_ACCEPTED',
        title: '🎉 Nuevo cliente conectado',
        message: `${name} (${email}) se ha registrado como tu cliente`,
        relatedId: client.id
      }
    })

    console.log('✅ Cliente conectado:', client.id, '-> Vendedor:', seller.name)

    return NextResponse.json({
      success: true,
      status: 'CONNECTED',
      data: { clientId: client.id, sellerName: seller.name }
    })

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    return NextResponse.json({ error: 'Error al conectar' }, { status: 500 })
  }
}
