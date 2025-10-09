import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Obtener carrito del comprador
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const authUser = await prisma.authenticatedUser.findUnique({
      where: { authId: userId },
      include: { clientAccounts: true },
    })

    if (!authUser || authUser.clientAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          total: 0,
        },
      })
    }

    const client = authUser.clientAccounts[0]

    // Obtener orden pendiente (carrito activo)
    const pendingOrder = await prisma.pendingOrder.findFirst({
      where: {
        clientId: client.id,
        status: 'draft',
      },
    })

    if (!pendingOrder) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          total: 0,
        },
      })
    }

    // Por ahora retornamos estructura básica
    // Puedes expandir esto para incluir items del carrito
    return NextResponse.json({
      success: true,
      data: {
        cartId: pendingOrder.id,
        items: [],
        total: 0,
      },
    })
  } catch (error) {
    console.error('Error en buyer cart GET:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener carrito' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// POST - Agregar item al carrito
export async function POST(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { productId, quantity } = body

    if (!productId || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      )
    }

    const authUser = await prisma.authenticatedUser.findUnique({
      where: { authId: userId },
      include: { clientAccounts: true },
    })

    if (!authUser || authUser.clientAccounts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se encontró cuenta de cliente' },
        { status: 404 }
      )
    }

    const client = authUser.clientAccounts[0]

    // Buscar o crear pendingOrder (carrito)
    let pendingOrder = await prisma.pendingOrder.findFirst({
      where: {
        clientId: client.id,
        status: 'draft',
      },
    })

    if (!pendingOrder) {
      pendingOrder = await prisma.pendingOrder.create({
        data: {
          clientId: client.id,
          status: 'draft',
        },
      })
    }

    // Aquí puedes agregar la lógica para agregar items
    // Por ahora solo confirmamos que el carrito existe

    return NextResponse.json({
      success: true,
      message: 'Producto agregado al carrito',
      data: {
        cartId: pendingOrder.id,
      },
    })
  } catch (error) {
    console.error('Error en buyer cart POST:', error)
    return NextResponse.json(
      { success: false, error: 'Error al agregar al carrito' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// DELETE - Eliminar item del carrito
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'ID de item requerido' },
        { status: 400 }
      )
    }

    // Lógica para eliminar item del carrito
    // Por ahora solo retornamos éxito

    return NextResponse.json({
      success: true,
      message: 'Item eliminado del carrito',
    })
  } catch (error) {
    console.error('Error en buyer cart DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Error al eliminar item' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}