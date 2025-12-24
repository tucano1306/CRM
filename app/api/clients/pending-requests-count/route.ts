import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Contar solicitudes de conexión pendientes
    const requestsCount = await prisma.connectionRequest.count({
      where: {
        sellerId: userId,
        status: 'PENDING'
      }
    })

    return NextResponse.json({ requestsCount })
  } catch (error) {
    console.error('Error fetching pending client requests count:', error)
    return NextResponse.json(
      { error: 'Error al obtener conteo de solicitudes pendientes', requestsCount: 0 },
      { status: 200 } // Return 200 with 0 count to prevent UI errors
    )
  }
}
