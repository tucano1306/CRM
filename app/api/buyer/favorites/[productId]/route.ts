import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// POST - Agregar a favoritos
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { productId } = await params

    // Buscar usuario autenticado
    const user = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // Crear favorito (si ya existe, Prisma lanzará error por el unique constraint)
    const favorite = await prisma.favorite.create({
      data: {
        userId: user.id,
        productId: productId,
      },
      include: {
        product: true
      }
    })

    return NextResponse.json({
      success: true,
      data: favorite,
      message: 'Producto agregado a favoritos'
    })
  } catch (error: any) {
    console.error('Error adding to favorites:', error)
    
    // Si ya existe, retornar mensaje específico
    if (error.code === 'P2002') {
      return NextResponse.json({
        error: 'Este producto ya está en favoritos'
      }, { status: 400 })
    }

    return NextResponse.json(
      { error: 'Error al agregar a favoritos' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar de favoritos
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { productId } = await params

    // Buscar usuario autenticado
    const user = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Eliminar favorito
    await prisma.favorite.deleteMany({
      where: {
        userId: user.id,
        productId: productId,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado de favoritos'
    })
  } catch (error) {
    console.error('Error removing from favorites:', error)
    return NextResponse.json(
      { error: 'Error al eliminar de favoritos' },
      { status: 500 }
    )
  }
}
