import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Si se pide diagnóstico de rol, retornar info de autenticación
    const url = new URL(request.url)
    if (url.searchParams.get('debug') === 'role') {
      let userRole = 'CLIENT'
      let roleSource = 'default'
      
      try {
        if ((sessionClaims as any)?.role) {
          userRole = (sessionClaims as any).role
          roleSource = 'sessionClaims.role'
        } else if (sessionClaims?.public_metadata) {
          const metadata = sessionClaims.public_metadata as any
          userRole = metadata?.role || 'CLIENT'
          roleSource = metadata?.role ? 'sessionClaims.public_metadata.role' : 'default (CLIENT)'
        }
      } catch (error) {
        console.error('Error getting role:', error)
      }

      return NextResponse.json({
        authenticated: true,
        userId,
        detectedRole: userRole,
        roleSource,
        sessionClaims: {
          hasRole: !!(sessionClaims as any)?.role,
          hasPublicMetadata: !!sessionClaims?.public_metadata,
          publicMetadata: sessionClaims?.public_metadata || null,
        },
        message: `Your role is detected as: ${userRole} (from ${roleSource})`,
        recommendation: userRole === 'CLIENT' 
          ? '✅ Tienes el rol correcto para buyer routes'
          : '⚠️ Para acceder a rutas de buyer, necesitas rol CLIENT en Clerk public_metadata'
      })
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
    console.log('Seller authenticated_users count:', client?.seller?.authenticated_users?.length)
    console.log('Seller authenticated_users:', JSON.stringify(client?.seller?.authenticated_users, null, 2))

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

    if (!client.seller.authenticated_users || client.seller.authenticated_users.length === 0) {
      console.error('❌ El seller no tiene authenticated_users')
      return NextResponse.json({ 
        success: false, 
        error: 'El vendedor no tiene usuario autenticado configurado' 
      })
    }

    // Buscar el authenticated_user con role SELLER (no el de seed)
    // Priorizar los que NO empiezan con "auth_" (que son de Clerk real)
    let sellerAuth = client.seller.authenticated_users.find(
      auth => auth.authId.startsWith('user_')
    )
    
    // Si no hay ninguno con user_, tomar el primero con role SELLER
    if (!sellerAuth) {
      sellerAuth = client.seller.authenticated_users.find(
        auth => auth.role === 'SELLER'
      )
    }
    
    // Si aún no hay, tomar el primero
    if (!sellerAuth) {
      sellerAuth = client.seller.authenticated_users[0]
    }

    console.log('✅ Seller authId seleccionado:', sellerAuth.authId)
    console.log('   De un total de:', client.seller.authenticated_users.length, 'opciones')

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
