import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Determinar el rol del usuario
    const role = (sessionClaims?.metadata as any)?.role || 
                 (sessionClaims?.public_metadata as any)?.role ||
                 sessionClaims?.role

    let pendingCount = 0

    if (role === 'SELLER' || role === 'ADMIN') {
      // Para vendedores: contar órdenes pendientes
      pendingCount = await prisma.order.count({
        where: {
          sellerId: userId,
          status: 'PENDING'
        }
      })
    } else {
      // Para compradores: contar órdenes activas (no completadas ni canceladas)
      pendingCount = await prisma.order.count({
        where: {
          clientId: userId,
          status: {
            notIn: ['COMPLETED', 'CANCELED', 'CANCELLED']
          }
        }
      })
    }

    return NextResponse.json({ pendingCount })
  } catch (error) {
    console.error('Error fetching pending orders count:', error)
    return NextResponse.json(
      { error: 'Error al obtener conteo de órdenes pendientes', pendingCount: 0 },
      { status: 200 } // Return 200 with 0 count to prevent UI errors
    )
  }
}
