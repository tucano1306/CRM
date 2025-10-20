import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    console.log('🔍 Buscando cliente para userId:', userId)

    // Buscar authenticated_user
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId }
    })

    if (!authUser) {
      console.log('❌ No se encontró authenticated_user')
      return NextResponse.json({ 
        success: false, 
        error: 'Usuario no encontrado en el sistema' 
      })
    }

    console.log('✅ AuthUser encontrado:', authUser.id)

    // Buscar cliente y su vendedor
    const client = await prisma.client.findFirst({
      where: {
        authenticated_users: {
          some: { id: authUser.id }
        }
      },
      include: {
        seller: {
          include: {
            authenticated_users: true
          }
        }
      }
    })

    console.log('Cliente encontrado:', client?.id)
    console.log('Seller encontrado:', client?.seller?.id)

    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'No estás registrado como cliente' 
      })
    }

    if (!client.seller) {
      return NextResponse.json({ 
        success: false, 
        error: 'No tienes vendedor asignado' 
      })
    }

    const sellerAuth = client.seller.authenticated_users[0]

    if (!sellerAuth) {
      return NextResponse.json({ 
        success: false, 
        error: 'El vendedor no tiene usuario autenticado' 
      })
    }

    console.log('✅ Seller authId:', sellerAuth.authId)

    return NextResponse.json({
      success: true,
      seller: {
        id: client.seller.id,
        name: client.seller.name,
        email: client.seller.email,
        phone: client.seller.phone,
        clerkUserId: sellerAuth.authId // ✅ Este es el receiverId
      }
    })
  } catch (error) {
    console.error('❌ Error en GET /api/buyer/seller:', error)
    return NextResponse.json({ 
      error: 'Error interno',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
