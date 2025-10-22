/**
 * Script de ejemplo para probar la funcionalidad de auditoría de estados
 * Ejecutar con: npx tsx scripts/test-order-audit.ts
 */

import { prisma } from '../lib/prisma';
import {
  changeOrderStatus,
  getOrderHistory,
  getUserStatusChanges,
  getStatusTransitionStats,
  getStuckOrders,
  getStatusChangeActivitySummary,
  isStatusTransitionAllowed,
} from '../lib/orderStatusAudit';
import { OrderStatus } from '@prisma/client';

async function main() {
  console.log('🧪 Probando funcionalidad de auditoría de estados de órdenes\n');

  // 1. Obtener una orden existente para pruebas
  const testOrder = await prisma.order.findFirst({
    where: {
      status: 'PENDING',
    },
  });

  if (!testOrder) {
    console.log('❌ No se encontró ninguna orden PENDING para probar');
    console.log('Crea una orden primero antes de ejecutar este script');
    return;
  }

  console.log(`📦 Orden de prueba: ${testOrder.orderNumber}`);
  console.log(`   Estado actual: ${testOrder.status}\n`);

  // 2. Simular cambio de estado
  const mockUser = {
    id: 'test_user_123',
    name: 'Test Seller',
    role: 'SELLER',
  };

  // Validar transición
  console.log('🔍 Validando transición PENDING -> CONFIRMED...');
  const validation = isStatusTransitionAllowed(
    testOrder.status as OrderStatus,
    'CONFIRMED',
    mockUser.role
  );

  if (!validation.allowed) {
    console.log(`❌ Transición no permitida: ${validation.reason}\n`);
    return;
  }
  console.log('✅ Transición permitida\n');

  // Cambiar estado
  console.log('📝 Cambiando estado a CONFIRMED...');
  const result = await changeOrderStatus({
    orderId: testOrder.id,
    newStatus: 'CONFIRMED',
    changedBy: mockUser.id,
    changedByName: mockUser.name,
    changedByRole: mockUser.role,
    notes: 'Orden confirmada por el vendedor - Test automático',
  });

  if (result.updated) {
    console.log('✅ Estado actualizado exitosamente');
    console.log(`   Nuevo estado: ${result.order?.status}`);
    console.log(`   ID de auditoría: ${result.auditEntry?.id}\n`);
  } else {
    console.log(`ℹ️  ${result.message}\n`);
  }

  // 3. Consultar historial de la orden
  console.log('📜 Consultando historial de la orden...');
  const history = await getOrderHistory(testOrder.id);
  console.log(`   Encontrados ${history.length} cambios de estado:`);
  
  history.forEach((change, index) => {
    console.log(`   ${index + 1}. ${change.previousStatus || 'NULL'} -> ${change.newStatus}`);
    console.log(`      Por: ${change.changedByName} (${change.changedByRole})`);
    console.log(`      Fecha: ${change.createdAt.toLocaleString()}`);
    if (change.notes) {
      console.log(`      Notas: ${change.notes}`);
    }
    console.log('');
  });

  // 4. Consultar cambios del usuario
  console.log('👤 Consultando cambios realizados por el usuario...');
  const userChanges = await getUserStatusChanges(mockUser.id, {
    limit: 10,
    includeOrder: true,
  });
  console.log(`   El usuario ha realizado ${userChanges.length} cambios\n`);

  // 5. Estadísticas de transición
  console.log('📊 Estadísticas de tiempo de transición...');
  const stats = await getStatusTransitionStats('PENDING', 'CONFIRMED');
  console.log(`   Tiempo promedio PENDING -> CONFIRMED: ${stats.averageMinutes?.toFixed(2)} minutos\n`);

  // 6. Órdenes estancadas
  console.log('⏰ Buscando órdenes estancadas (más de 60 minutos en un estado)...');
  const stuckInPending = await getStuckOrders('PENDING', 60);
  console.log(`   Órdenes estancadas en PENDING: ${stuckInPending.length}`);
  
  if (stuckInPending.length > 0) {
    console.log('   Ejemplos:');
    stuckInPending.slice(0, 3).forEach((entry: any) => {
      const minutesStuck = Math.floor(
        (Date.now() - entry.createdAt.getTime()) / (1000 * 60)
      );
      console.log(`   - ${entry.order.orderNumber}: ${minutesStuck} minutos en ${entry.newStatus}`);
    });
  }
  console.log('');

  // 7. Resumen de actividad
  console.log('📈 Resumen de actividad de los últimos 7 días...');
  const activity = await getStatusChangeActivitySummary(7);
  console.log('   Cambios por rol y estado:');
  
  activity.forEach((item: any) => {
    console.log(`   - ${item.role} -> ${item.status}: ${item.count} cambios`);
  });
  console.log('');

  console.log('✅ Pruebas completadas exitosamente');
}

main()
  .catch((error) => {
    console.error('❌ Error durante las pruebas:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
