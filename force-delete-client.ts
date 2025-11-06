/**
 * Script para eliminar cliente directamente de la base de datos de producción
 * Usa la conexión a Vercel Postgres
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GHOST_EMAIL = 'l3oyucon1978@gmail.com';

async function deleteClientFromProduction() {
  console.log('🔍 Conectando a base de datos de producción...\n');

  try {
    // 1. Buscar el cliente
    const client = await prisma.client.findFirst({
      where: { email: GHOST_EMAIL },
      include: {
        authenticated_users: true,
        orders: {
          include: {
            items: true
          }
        },
        quotes: true,
        returns: true,
        _count: {
          select: {
            orders: true,
            quotes: true,
            returns: true
          }
        }
      }
    });

    if (!client) {
      console.log('✅ ÉXITO: No existe cliente con ese email');
      console.log(`   Ya puedes crear ${GHOST_EMAIL} sin problemas\n`);
      return;
    }

    console.log('📋 Cliente encontrado:');
    console.log(`   ID: ${client.id}`);
    console.log(`   Email: ${client.email}`);
    console.log(`   Nombre: ${client.name || 'Sin nombre'}`);
    console.log(`   Seller: ${client.sellerId || '❌ SIN SELLER'}`);
    console.log(`   Usuarios vinculados: ${client.authenticated_users.length}`);
    console.log(`   Órdenes: ${client._count.orders}`);
    console.log(`   Cotizaciones: ${client._count.quotes}`);
    console.log(`   Devoluciones: ${client._count.returns}`);
    console.log('');

    // 2. Eliminar órdenes asociadas primero
    if (client.orders.length > 0) {
      console.log(`🗑️  Eliminando ${client.orders.length} orden(es)...`);
      
      for (const order of client.orders) {
        // Eliminar items de la orden
        if (order.items && order.items.length > 0) {
          await prisma.orderItem.deleteMany({
            where: { orderId: order.id }
          });
        }
        
        // Eliminar la orden
        await prisma.order.delete({
          where: { id: order.id }
        });
      }
      console.log('   ✅ Órdenes eliminadas\n');
    }

    // 3. Eliminar cotizaciones
    if (client.quotes.length > 0) {
      console.log(`🗑️  Eliminando ${client.quotes.length} cotización(es)...`);
      await prisma.quote.deleteMany({
        where: { clientId: client.id }
      });
      console.log('   ✅ Cotizaciones eliminadas\n');
    }

    // 4. Eliminar devoluciones
    if (client._count.returns > 0) {
      console.log(`🗑️  Eliminando ${client._count.returns} devolución(es)...`);
      await prisma.return.deleteMany({
        where: { clientId: client.id }
      });
      console.log('   ✅ Devoluciones eliminadas\n');
    }

    // 5. Desvincular usuarios autenticados
    if (client.authenticated_users.length > 0) {
      console.log('🔗 Desvinculando usuarios autenticados...');
      await prisma.client.update({
        where: { id: client.id },
        data: {
          authenticated_users: {
            disconnect: client.authenticated_users.map(user => ({ id: user.id }))
          }
        }
      });
      console.log('   ✅ Usuarios desvinculados\n');
    }

    // 6. ELIMINAR EL CLIENTE
    console.log('🗑️  Eliminando cliente...');
    await prisma.client.delete({
      where: { id: client.id }
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  ✅ ¡CLIENTE ELIMINADO EXITOSAMENTE!');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
    console.log(`🎉 Ahora puedes crear un nuevo cliente con:`);
    console.log(`   ${GHOST_EMAIL}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nDetalles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
console.log('═══════════════════════════════════════════════════');
console.log('  🗑️  ELIMINAR CLIENTE DE PRODUCCIÓN');
console.log(`  📧 Email: ${GHOST_EMAIL}`);
console.log('═══════════════════════════════════════════════════\n');

deleteClientFromProduction()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
