import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ hasAccess: false, reason: 'No autenticado' })
    }

    // Buscar el cliente en la base de datos
    const client = await prisma.client.findUnique({
      where: { clerkUserId: userId },
      include: {
        connections: {
          where: { status: 'ACCEPTED' },
          include: {
            seller: true
          }
        }
      }
    })

    // Verificar si el cliente existe
    if (!client) {
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'Tu cuenta de cliente no existe en el sistema' 
      })
    }

    // Verificar si tiene al menos una conexión activa con un vendedor
    if (client.connections.length === 0) {
      return NextResponse.json({ 
        hasAccess: false, 
        reason: 'No estás conectado con ningún vendedor activo' 
      })
    }

    // Cliente válido con conexión activa
    return NextResponse.json({ 
      hasAccess: true,
      client: {
        id: client.id,
        name: client.name,
        connections: client.connections.length
      }
    })

  } catch (error) {
    console.error('Error validando acceso de cliente:', error)
    return NextResponse.json(
      { hasAccess: false, reason: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
