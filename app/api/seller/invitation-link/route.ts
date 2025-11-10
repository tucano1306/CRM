// app/api/seller/invitation-link/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getSeller } from '@/lib/auth-helpers'

/**
 * POST /api/seller/invitation-link
 * Genera un link de invitación para que un comprador se conecte con el vendedor
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario es vendedor
    const seller = await getSeller(userId)
    if (!seller) {
      return NextResponse.json(
        { error: 'Solo vendedores pueden generar links de invitación' },
        { status: 403 }
      )
    }

    // Generar token único (válido por 7 días por defecto)
    const token = `inv_${seller.id}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // Válido por 7 días

    // Guardar el token en la base de datos
    await prisma.seller.update({
      where: { id: seller.id },
      data: {
        // Aquí guardaríamos el token si tuviéramos un campo para ello
        // Por ahora, el token se genera on-the-fly y se valida por su estructura
      }
    })

    // Construir la URL completa
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   request.headers.get('origin') || 
                   'http://localhost:3000'
    
    const invitationLink = `${baseUrl}/buyer/connect?token=${token}&seller=${seller.id}`

    return NextResponse.json({
      success: true,
      data: {
        link: invitationLink,
        token,
        sellerId: seller.id,
        sellerName: seller.name,
        expiresAt: expiresAt.toISOString(),
        validDays: 7
      }
    })

  } catch (error) {
    console.error('❌ Error generando link de invitación:', error)
    return NextResponse.json(
      { error: 'Error al generar link de invitación' },
      { status: 500 }
    )
  }
}
