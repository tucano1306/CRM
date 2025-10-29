import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/buyer/cart/count
 * Obtener la cantidad total de items en el carrito del comprador
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await auth()
    const userId = authResult.userId

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Buscar el usuario autenticado
    const user = await prisma.authenticated_users.findUnique({
      where: { authId: userId }
    })

    if (!user) {
      return NextResponse.json({ count: 0 })
    }

    // Buscar el carrito guardado del usuario
    const cart = await prisma.savedCart.findUnique({
      where: { userId: user.id }
    })

    console.log('🛒 Cart count request:', {
      userAuthId: userId,
      userId: user.id,
      cartFound: !!cart,
      cartId: cart?.id
    })

    if (!cart) {
      console.log('⚠️ No cart found for user')
      return NextResponse.json({ count: 0 })
    }

    // Los items están en JSON, contar cuántos productos hay
    const items = cart.items as any[]
    const totalItems = Array.isArray(items) 
      ? items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      : 0

    console.log('✅ Cart count calculated:', {
      itemsInCart: Array.isArray(items) ? items.length : 0,
      totalQuantity: totalItems
    })

    return NextResponse.json({ 
      count: totalItems,
      success: true 
    })

  } catch (error) {
    console.error('Error obteniendo contador del carrito:', error)
    return NextResponse.json({ 
      count: 0,
      error: 'Error interno del servidor' 
    }, { status: 500 })
  }
}
