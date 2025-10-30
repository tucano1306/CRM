import { auth, clerkClient } from '@clerk/nextjs/server'
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

    // Actualizar rol en Clerk usando el cliente oficial
    const client = await clerkClient()
    await client.users.updateUser(userId, {
      publicMetadata: {
        role: role
      }
    })

    // Crear respuesta con redirección
    const redirect = role === 'CLIENT' ? '/buyer/dashboard' : '/dashboard'
    const response = NextResponse.json({
      success: true,
      message: `Rol cambiado a ${role}`,
      redirect,
      // Indicar que se necesita recargar la sesión
      requireSessionRefresh: true
    })

    // Agregar headers para forzar revalidación de la sesión
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    // Header personalizado para indicar cambio de rol
    response.headers.set('X-Role-Changed', role)

    return response

  } catch (error) {
    console.error('Error switching role:', error)
    return NextResponse.json({
      error: 'Error al cambiar rol',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
