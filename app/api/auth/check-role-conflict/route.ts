import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/check-role-conflict
 * Verifica si el usuario autenticado tiene un rol diferente en la base de datos
 * Retorna: { hasConflict: boolean, existingRole: string, attemptedRole: string, message: string }
 * 
 * Este endpoint se usa para prevenir que un usuario con rol de vendedor
 * intente registrarse como comprador y viceversa.
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth()
    const user = await currentUser()

    if (!userId || !user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Obtener el email del usuario autenticado
    const userEmail = user.emailAddresses[0]?.emailAddress
    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email no encontrado' },
        { status: 400 }
      )
    }

    // Obtener el rol que el usuario está intentando usar (desde query param o header)
    const url = new URL(req.url)
    const attemptedRole = url.searchParams.get('role')?.toUpperCase() || 'CLIENT'

    // Buscar el usuario en la BD con sus relaciones
    const authUser = await prisma.authenticated_users.findUnique({
      where: { email: userEmail },
      include: {
        sellers: {
          select: {
            id: true,
            name: true,
            isActive: true,
          }
        },
        clients: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    // Si el usuario no existe en la BD, no hay conflicto
    if (!authUser) {
      return NextResponse.json({
        hasConflict: false,
        existingRole: null,
        attemptedRole,
        message: 'Usuario nuevo, puede registrarse con cualquier rol'
      })
    }

    // Verificar roles basados en relaciones reales
    const hasSeller = authUser.sellers.some(s => s.isActive)
    const hasClient = authUser.clients.length > 0

    // Determinar el rol existente del usuario
    let existingRole: string | null = null
    if (hasSeller) {
      existingRole = 'SELLER'
    } else if (hasClient) {
      existingRole = 'CLIENT'
    }

    // Si no tiene ningún rol, no hay conflicto
    if (!existingRole) {
      return NextResponse.json({
        hasConflict: false,
        existingRole: null,
        attemptedRole,
        message: 'Usuario sin rol asignado, puede usar cualquier rol'
      })
    }

    // Verificar si hay conflicto
    // Un vendedor no puede ser comprador y viceversa
    const hasConflict = (
      (existingRole === 'SELLER' && attemptedRole === 'CLIENT') ||
      (existingRole === 'CLIENT' && attemptedRole === 'SELLER')
    )

    if (hasConflict) {
      const roleNames: Record<string, string> = {
        SELLER: 'Vendedor',
        CLIENT: 'Comprador'
      }
      
      return NextResponse.json({
        hasConflict: true,
        existingRole,
        attemptedRole,
        userEmail,
        userName: authUser.name,
        message: `Tu cuenta (${userEmail}) ya está registrada como ${roleNames[existingRole]}. No puedes acceder como ${roleNames[attemptedRole]}. Por favor, inicia sesión con tu rol de ${roleNames[existingRole]}.`
      })
    }

    return NextResponse.json({
      hasConflict: false,
      existingRole,
      attemptedRole,
      message: 'No hay conflicto de roles'
    })

  } catch (error) {
    console.error('❌ [CHECK-ROLE-CONFLICT] Error:', error)
    return NextResponse.json(
      { 
        error: 'Error al verificar conflicto de roles',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}
