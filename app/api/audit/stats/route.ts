import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  getStatusChangeActivitySummary,
  getStatusTransitionStats,
  getStuckOrders,
} from '@/lib/orderStatusAudit'

/**
 * GET /api/audit/stats - Obtener estadísticas de auditoría de estados
 * 
 * Query params:
 * - days: número de días para el resumen (default: 7)
 * - stuckMinutes: minutos para considerar una orden "estancada" (default: 120)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Solo ADMIN y SELLER pueden ver estadísticas
    const userRole = (sessionClaims?.metadata as any)?.role || 
                     (sessionClaims?.publicMetadata as any)?.role || 
                     'CLIENT'

    if (userRole !== 'ADMIN' && userRole !== 'SELLER') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo administradores y vendedores.' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '7')
    const stuckMinutes = parseInt(searchParams.get('stuckMinutes') || '120')

    // Obtener resumen de actividad
    const activitySummary = await getStatusChangeActivitySummary(days)

    // Obtener estadísticas de transiciones comunes
    const commonTransitions = await Promise.all([
      getStatusTransitionStats('PENDING', 'CONFIRMED'),
      getStatusTransitionStats('CONFIRMED', 'PREPARING'),
      getStatusTransitionStats('PREPARING', 'READY_FOR_PICKUP'),
      getStatusTransitionStats('READY_FOR_PICKUP', 'IN_DELIVERY'),
      getStatusTransitionStats('IN_DELIVERY', 'DELIVERED'),
      getStatusTransitionStats('DELIVERED', 'COMPLETED'),
    ])

    // Obtener órdenes estancadas
    const stuckInPending = await getStuckOrders('PENDING', stuckMinutes)
    const stuckInPreparing = await getStuckOrders('PREPARING', stuckMinutes)
    const stuckInDelivery = await getStuckOrders('IN_DELIVERY', stuckMinutes)

    return NextResponse.json({
      success: true,
      period: {
        days,
        startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      },
      activitySummary,
      transitionStats: commonTransitions,
      stuckOrders: {
        thresholdMinutes: stuckMinutes,
        pending: stuckInPending.length,
        preparing: stuckInPreparing.length,
        inDelivery: stuckInDelivery.length,
        total: stuckInPending.length + stuckInPreparing.length + stuckInDelivery.length,
        details: {
          pending: stuckInPending.slice(0, 5), // Primeros 5
          preparing: stuckInPreparing.slice(0, 5),
          inDelivery: stuckInDelivery.slice(0, 5),
        },
      },
    })
  } catch (error) {
    console.error('Error obteniendo estadísticas de auditoría:', error)
    return NextResponse.json(
      { error: 'Error al obtener las estadísticas' },
      { status: 500 }
    )
  }
}
