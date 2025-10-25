import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// GET - Obtener favoritos del usuario
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Buscar usuario autenticado
    const user = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Obtener favoritos con información del producto
    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            price: true,
            imageUrl: true,
            stock: true,
            unit: true,
            category: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: favorites
    })
  } catch (error) {
    console.error('Error getting favorites:', error)
    return NextResponse.json(
      { error: 'Error al obtener favoritos' },
      { status: 500 }
    )
  }
}
