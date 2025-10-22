/**
 * Utilidad para gestionar el historial de estados de órdenes
 * Proporciona funciones para registrar y consultar cambios de estado con auditoría completa
 */

import { prisma } from './prisma';
import { OrderStatus } from '@prisma/client';

// Type assertion para orderStatusHistory (generado por Prisma)
const db = prisma as any;

export interface ChangeOrderStatusParams {
  orderId: string;
  newStatus: OrderStatus;
  changedBy: string;
  changedByName: string;
  changedByRole: string;
  notes?: string;
}

export interface OrderStatusChange {
  id: string;
  orderId: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedBy: string;
  changedByName: string;
  changedByRole: string;
  notes: string | null;
  createdAt: Date;
}

/**
 * Cambia el estado de una orden y registra el cambio en el historial de auditoría
 * Usa una transacción para garantizar consistencia
 */
export async function changeOrderStatus({
  orderId,
  newStatus,
  changedBy,
  changedByName,
  changedByRole,
  notes,
}: ChangeOrderStatusParams) {
  // Obtener el estado actual
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true },
  });

  if (!order) {
    throw new Error(`Orden con ID ${orderId} no encontrada`);
  }

  // Si el estado no ha cambiado, no hacer nada
  if (order.status === newStatus) {
    return {
      updated: false,
      message: 'El estado ya es el mismo, no se realizó ningún cambio',
    };
  }

  // Actualizar el estado y crear el registro de auditoría en una transacción
  const [updatedOrder, auditEntry] = await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { 
        status: newStatus,
        // Actualizar fechas especiales según el estado
        ...(newStatus === 'CONFIRMED' && !order.status ? { confirmedAt: new Date() } : {}),
        ...(newStatus === 'CANCELED' ? { canceledAt: new Date() } : {}),
        ...(newStatus === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
    }),
    db.orderStatusHistory.create({
      data: {
        orderId,
        previousStatus: order.status,
        newStatus,
        changedBy,
        changedByName,
        changedByRole,
        notes,
      },
    }),
  ]);

  return {
    updated: true,
    order: updatedOrder,
    auditEntry,
  };
}

/**
 * Obtiene el historial completo de cambios de estado de una orden
 */
export async function getOrderHistory(orderId: string): Promise<OrderStatusChange[]> {
  const history = await db.orderStatusHistory.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });

  return history;
}

/**
 * Obtiene el historial de cambios realizados por un usuario específico
 */
export async function getUserStatusChanges(
  userId: string,
  options: {
    limit?: number;
    includeOrder?: boolean;
  } = {}
) {
  const { limit = 50, includeOrder = false } = options;

  const history = await db.orderStatusHistory.findMany({
    where: { changedBy: userId },
    include: includeOrder
      ? {
          order: {
            select: {
              orderNumber: true,
              totalAmount: true,
              client: {
                select: {
                  name: true,
                },
              },
            },
          },
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return history;
}

/**
 * Obtiene estadísticas de tiempo promedio entre estados
 */
export async function getStatusTransitionStats(
  fromStatus: OrderStatus,
  toStatus: OrderStatus
) {
  // Usar una consulta raw para calcular el tiempo promedio
  const result = await prisma.$queryRaw<{ avg_minutes: number | null }[]>`
    SELECT 
      AVG(EXTRACT(EPOCH FROM (h2."createdAt" - h1."createdAt")) / 60) as avg_minutes
    FROM order_status_history h1
    JOIN order_status_history h2 ON h1."orderId" = h2."orderId"
    WHERE h1."newStatus" = ${fromStatus}
      AND h2."newStatus" = ${toStatus}
      AND h2."createdAt" > h1."createdAt"
  `;

  return {
    fromStatus,
    toStatus,
    averageMinutes: result[0]?.avg_minutes || 0,
  };
}

/**
 * Obtiene las órdenes que han estado en un estado por más tiempo del esperado
 */
export async function getStuckOrders(
  status: OrderStatus,
  minutesThreshold: number
) {
  const thresholdDate = new Date(Date.now() - minutesThreshold * 60 * 1000);

  // Obtener la última entrada de historial para cada orden con el estado dado
  const stuckOrders = await db.orderStatusHistory.findMany({
    where: {
      newStatus: status,
      createdAt: {
        lte: thresholdDate,
      },
    },
    include: {
      order: {
        select: {
          id: true,
          orderNumber: true,
          status: true,
          client: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Filtrar solo las que todavía están en ese estado
  return stuckOrders.filter((entry: any) => entry.order.status === status);
}

/**
 * Obtiene un resumen de actividad de cambios de estado
 */
export async function getStatusChangeActivitySummary(days: number = 7) {
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const summary = await db.orderStatusHistory.groupBy({
    by: ['changedByRole', 'newStatus'],
    where: {
      createdAt: {
        gte: sinceDate,
      },
    },
    _count: {
      id: true,
    },
  });

  return summary.map((item: any) => ({
    role: item.changedByRole,
    status: item.newStatus,
    count: item._count.id,
  }));
}

/**
 * Valida si un cambio de estado es permitido según las reglas de negocio
 */
export function isStatusTransitionAllowed(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  userRole: string
): { allowed: boolean; reason?: string } {
  // Reglas de negocio para transiciones de estado
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELED'],
    CONFIRMED: ['PREPARING', 'CANCELED'],
    PREPARING: ['READY_FOR_PICKUP', 'CANCELED'],
    READY_FOR_PICKUP: ['IN_DELIVERY', 'DELIVERED', 'CANCELED'],
    IN_DELIVERY: ['DELIVERED', 'PARTIALLY_DELIVERED'],
    DELIVERED: ['COMPLETED'],
    PARTIALLY_DELIVERED: ['COMPLETED', 'IN_DELIVERY'],
    COMPLETED: [], // Estado final
    CANCELED: [], // Estado final
    PAYMENT_PENDING: ['PAID', 'CANCELED'],
    PAID: ['CONFIRMED'],
  };

  // Solo ADMIN y SELLER pueden cambiar estados
  if (userRole !== 'ADMIN' && userRole !== 'SELLER') {
    return {
      allowed: false,
      reason: 'Solo administradores y vendedores pueden cambiar estados de órdenes',
    };
  }

  // Verificar si la transición está permitida
  const allowedTransitions = transitions[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    return {
      allowed: false,
      reason: `No se puede cambiar de ${currentStatus} a ${newStatus}`,
    };
  }

  return { allowed: true };
}
