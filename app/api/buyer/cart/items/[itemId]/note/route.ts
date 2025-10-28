import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { validateSchema } from '@/lib/validations'
import DOMPurify from 'isomorphic-dompurify'

/**
 * PATCH /api/buyer/cart/items/[itemId]/note
 * Actualiza la nota de un item específico del carrito
 * Solo el dueño del carrito puede actualizar sus items
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    // 1. Autenticación
    const authResult = await auth()
    const userId = authResult.userId

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    // 2. Validar parámetros
    const resolvedParams = await params
    const itemId = resolvedParams.itemId

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'ID de item requerido' },
        { status: 400 }
      )
    }

    // 3. Validar datos del body
    const body = await request.json()

    // ✅ Validar schema
    const updateNoteSchema = z.object({
      note: z.string().max(500).nullable()
    })

    const validation = validateSchema(updateNoteSchema, body)
    if (!validation.success) {
      return NextResponse.json({ success: false, error: 'Datos inválidos', details: validation.errors }, { status: 400 })
    }

    const { note } = validation.data

    // ✅ Sanitizar nota
    const sanitizedNote = note ? DOMPurify.sanitize(note.trim()) : null

    // 4. Verificar que el item existe y obtener el cart
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!cartItem) {
      return NextResponse.json(
        { success: false, error: 'Item del carrito no encontrado' },
        { status: 404 }
      )
    }

    // 5. Verificar permisos - el cart debe pertenecer al usuario autenticado
    if (cartItem.cart.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para editar este item' },
        { status: 403 }
      )
    }

    // 6. Actualizar la nota del item
    const updatedItem = await (prisma.cartItem as any).update({
      where: { id: itemId },
      data: { 
        itemNote: sanitizedNote,
        updatedAt: new Date()
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            unit: true,
            price: true
          }
        }
      }
    })

    // 7. Log de éxito
    console.log(`✅ CartItem note updated by user ${userId}: item ${itemId}, product ${cartItem.product.name}`)

    return NextResponse.json({
      success: true,
      message: note ? 'Nota guardada exitosamente' : 'Nota eliminada exitosamente',
      data: updatedItem
    })

  } catch (error) {
    console.error('❌ Error updating cart item note:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error al guardar la nota del producto',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
