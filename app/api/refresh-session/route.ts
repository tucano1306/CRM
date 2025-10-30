import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Endpoint para forzar la actualización de la sesión de Clerk
 * Útil después de cambios en publicMetadata
 */
export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Crear respuesta que indica que la sesión debe recargarse
    const response = NextResponse.json({
      success: true,
      message: 'Sesión lista para actualizar',
      userId
    })

    // Headers para forzar revalidación
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')

    return response

  } catch (error) {
    console.error('Error refreshing session:', error)
    return NextResponse.json({
      error: 'Error al refrescar sesión',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
