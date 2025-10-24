import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Obtener todas las etiquetas del producto
    const tags = await prisma.productTag.findMany({
      where: { productId: id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      tags,
      count: tags.length
    })

  } catch (error) {
    console.error('Error fetching product tags:', error)
    return NextResponse.json(
      { error: 'Error al obtener las etiquetas del producto' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { label, color } = body

    if (!label) {
      return NextResponse.json(
        { error: 'El campo label es requerido' },
        { status: 400 }
      )
    }

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si la etiqueta ya existe para este producto
    const existingTag = await prisma.productTag.findFirst({
      where: {
        productId: id,
        label: label
      }
    })

    if (existingTag) {
      return NextResponse.json(
        { error: 'Esta etiqueta ya existe para el producto' },
        { status: 400 }
      )
    }

    // Crear la etiqueta
    const tag = await prisma.productTag.create({
      data: {
        label,
        color: color || '#6B7280',
        productId: id
      }
    })

    return NextResponse.json({
      success: true,
      tag
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating product tag:', error)
    return NextResponse.json(
      { error: 'Error al crear la etiqueta' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')

    if (!tagId) {
      return NextResponse.json(
        { error: 'El parámetro tagId es requerido' },
        { status: 400 }
      )
    }

    // Verificar que la etiqueta existe y pertenece al producto
    const tag = await prisma.productTag.findFirst({
      where: {
        id: tagId,
        productId: id
      }
    })

    if (!tag) {
      return NextResponse.json(
        { error: 'Etiqueta no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la etiqueta
    await prisma.productTag.delete({
      where: { id: tagId }
    })

    return NextResponse.json({
      success: true,
      message: 'Etiqueta eliminada exitosamente'
    })

  } catch (error) {
    console.error('Error deleting product tag:', error)
    return NextResponse.json(
      { error: 'Error al eliminar la etiqueta' },
      { status: 500 }
    )
  }
}
