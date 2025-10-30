import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
      return NextResponse.json({
        authenticated: false,
        message: 'No user session found'
      })
    }

    // Intentar obtener el rol de diferentes formas
    let userRole = 'CLIENT'
    let roleSource = 'default'
    
    try {
      // Método 1: Desde sessionClaims directamente
      if ((sessionClaims as any)?.role) {
        userRole = (sessionClaims as any).role
        roleSource = 'sessionClaims.role'
      }
      // Método 2: Desde public_metadata
      else if (sessionClaims?.public_metadata) {
        const metadata = sessionClaims.public_metadata as any
        userRole = metadata?.role || 'CLIENT'
        roleSource = metadata?.role ? 'sessionClaims.public_metadata.role' : 'default (CLIENT)'
      }
    } catch (error) {
      console.error('Error getting role:', error)
    }

    return NextResponse.json({
      authenticated: true,
      userId,
      detectedRole: userRole,
      roleSource,
      sessionClaims: {
        hasRole: !!(sessionClaims as any)?.role,
        hasPublicMetadata: !!sessionClaims?.public_metadata,
        publicMetadata: sessionClaims?.public_metadata || null,
      },
      message: `Your role is detected as: ${userRole} (from ${roleSource})`,
      recommendation: userRole !== 'CLIENT' 
        ? '⚠️ Para acceder a rutas de buyer, necesitas rol CLIENT en Clerk public_metadata'
        : '✅ Tienes el rol correcto para buyer routes'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get user info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
