import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * PATCH /api/orders/items/[itemId]/note
 * Actualiza la nota de un item de orden
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    // Autenticación
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Extraer parámetros
    const { itemId } = await params
    
    // Validar itemId
    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'ID de item requerido' },
        { status: 400 }
      )
    }

    // Obtener body
    const body = await request.json()
    const { note } = body

    // Validar que note sea string o null
    if (note !== null && typeof note !== 'string') {
      return NextResponse.json(
        { success: false, error: 'La nota debe ser un texto' },
        { status: 400 }
      )
    }

    // Verificar que el item existe
    const item = await prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            sellerId: true,
            seller: {
              select: {
                id: true,
                authenticated_users: {
                  select: { authId: true }
                }
              }
            }
          }
        }
      }
    })

    if (!item) {
      return NextResponse.json(
        { success: false, error: 'Item no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el usuario es el vendedor de la orden
    const sellerAuthId = item.order.seller.authenticated_users[0]?.authId
    if (!sellerAuthId || sellerAuthId !== userId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para editar este item' },
        { status: 403 }
      )
    }

    // Actualizar la nota del item
    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        itemNote: note || null
      }
    })

    console.log(`✅ Nota actualizada para item ${itemId} de orden ${item.order.orderNumber}`)

    return NextResponse.json({
      success: true,
      data: updatedItem,
      message: 'Nota actualizada correctamente'
    })

  } catch (error) {
    console.error('❌ Error actualizando nota de item:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
