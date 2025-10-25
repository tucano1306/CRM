import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// POST - Validar cupón
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { code, cartTotal } = body

    if (!code) {
      return NextResponse.json({ error: 'Código de cupón requerido' }, { status: 400 })
    }

    // Buscar cupón
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    })

    if (!coupon) {
      return NextResponse.json({
        success: false,
        error: 'Cupón no válido'
      }, { status: 404 })
    }

    // Validaciones
    const now = new Date()

    if (!coupon.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Este cupón ya no está activo'
      }, { status: 400 })
    }

    if (coupon.validFrom > now) {
      return NextResponse.json({
        success: false,
        error: 'Este cupón aún no es válido'
      }, { status: 400 })
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      return NextResponse.json({
        success: false,
        error: 'Este cupón ha expirado'
      }, { status: 400 })
    }

    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({
        success: false,
        error: 'Este cupón ha alcanzado su límite de usos'
      }, { status: 400 })
    }

    if (coupon.minPurchase && cartTotal < coupon.minPurchase) {
      return NextResponse.json({
        success: false,
        error: `Compra mínima de $${coupon.minPurchase.toFixed(2)} requerida`
      }, { status: 400 })
    }

    // Calcular descuento
    let discountAmount = 0
    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = cartTotal * coupon.discountValue
      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount
      }
    } else {
      // FIXED
      discountAmount = coupon.discountValue
    }

    return NextResponse.json({
      success: true,
      data: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: discountAmount,
        finalTotal: Math.max(0, cartTotal - discountAmount)
      },
      message: `Cupón ${coupon.code} aplicado correctamente`
    })
  } catch (error) {
    console.error('Error validating coupon:', error)
    return NextResponse.json(
      { error: 'Error al validar cupón' },
      { status: 500 }
    )
  }
}

// GET - Obtener cupones disponibles (opcional)
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const now = new Date()

    // Obtener cupones activos y vigentes
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        validFrom: { lte: now },
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } }
        ]
      },
      select: {
        code: true,
        description: true,
        discountType: true,
        discountValue: true,
        minPurchase: true,
        maxDiscount: true,
        validUntil: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: coupons
    })
  } catch (error) {
    console.error('Error getting coupons:', error)
    return NextResponse.json(
      { error: 'Error al obtener cupones' },
      { status: 500 }
    )
  }
}
