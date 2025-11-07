import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/auth/check-roles
 * Verifica qué roles tiene el usuario autenticado en la base de datos
 * Retorna: { isSeller: boolean, isClient: boolean, roles: string[] }
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Buscar el usuario en la BD con sus relaciones
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
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

    if (!authUser) {
      // Usuario no existe en BD - necesita registro
      return NextResponse.json({
        exists: false,
        isSeller: false,
        isClient: false,
        roles: [],
        needsRegistration: true
      })
    }

    // Verificar roles basados en relaciones reales
    const hasSeller = authUser.sellers.length > 0 && authUser.sellers.some(s => s.isActive)
    const hasClient = authUser.clients.length > 0

    const roles: string[] = []
    if (hasSeller) roles.push('SELLER')
    if (hasClient) roles.push('CLIENT')

    return NextResponse.json({
      exists: true,
      isSeller: hasSeller,
      isClient: hasClient,
      roles,
      needsRegistration: roles.length === 0,
      userData: {
        name: authUser.name,
        email: authUser.email,
        roleInDB: authUser.role, // Rol almacenado (puede ser diferente)
      }
    })

  } catch (error) {
    console.error('❌ [CHECK-ROLES] Error:', error)
    return NextResponse.json(
      { 
        error: 'Error al verificar roles',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}
