import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserStatusChanges } from '@/lib/orderStatusAudit'

/**
 * GET /api/audit/user-activity - Obtener actividad de cambios de estado de un usuario
 * 
 * Query params:
 * - userId: ID del usuario (opcional, por defecto el usuario actual)
 * - limit: límite de resultados (default: 50, max: 200)
 * - includeOrder: incluir detalles de la orden (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: currentUserId, sessionClaims } = await auth()

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const targetUserId = searchParams.get('userId') || currentUserId
    const limit = Math.min(
      Number.parseInt(searchParams.get('limit') || '50', 10),
      200
    )
    const includeOrder = searchParams.get('includeOrder') !== 'false'

    // Verificar permisos: solo puede ver su propia actividad o ser ADMIN
    const userRole = (sessionClaims?.metadata as any)?.role || 
                     (sessionClaims?.publicMetadata as any)?.role || 
                     'CLIENT'

    if (targetUserId !== currentUserId && userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado para ver actividad de otros usuarios' },
        { status: 403 }
      )
    }

    // Obtener historial de cambios del usuario
    const changes = await getUserStatusChanges(targetUserId, {
      limit,
      includeOrder,
    })

    // Calcular estadísticas
    const statusCounts: Record<string, number> = {}
    changes.forEach((change: any) => {
      const key = `${change.previousStatus || 'NULL'} -> ${change.newStatus}`
      statusCounts[key] = (statusCounts[key] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      userId: targetUserId,
      totalChanges: changes.length,
      changes,
      statistics: {
        transitionCounts: statusCounts,
        mostCommonTransition: Object.entries(statusCounts)
          .sort(([, a], [, b]) => b - a)[0],
      },
    })
  } catch (error) {
    console.error('Error obteniendo actividad de usuario:', error)
    return NextResponse.json(
      { error: 'Error al obtener la actividad' },
      { status: 500 }
    )
  }
}
