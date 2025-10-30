import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { role } = await request.json()

    if (!role || !['CLIENT', 'SELLER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ 
        error: 'Rol inválido. Debe ser CLIENT, SELLER o ADMIN' 
      }, { status: 400 })
    }

    // Actualizar rol en Clerk
    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

    if (!CLERK_SECRET_KEY) {
      return NextResponse.json({ 
        error: 'CLERK_SECRET_KEY no configurado' 
      }, { status: 500 })
    }

    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          role: role
        }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Clerk API error: ${response.status} - ${error}`)
    }

    const user = await response.json()

    return NextResponse.json({
      success: true,
      message: `Rol cambiado a ${role}`,
      user: {
        id: user.id,
        email: user.email_addresses?.[0]?.email_address,
        role: user.public_metadata?.role
      },
      redirect: role === 'CLIENT' ? '/buyer/dashboard' : '/dashboard'
    })

  } catch (error) {
    console.error('Error switching role:', error)
    return NextResponse.json({
      error: 'Error al cambiar rol',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
