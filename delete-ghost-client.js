/**
 * Script para ELIMINAR PERMANENTEMENTE un cliente fantasma de la base de datos
 * 
 * USO: node delete-ghost-client.js
 * 
 * Este script elimina completamente el cliente l3oyucon1978@gmail.com
 * para que puedas crear uno nuevo con ese email.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const GHOST_EMAIL = 'l3oyucon1978@gmail.com';

async function deleteGhostClient() {
  console.log('🔍 Buscando cliente fantasma...\n');

  try {
    // 1. Buscar el cliente
    const client = await prisma.client.findFirst({
      where: { email: GHOST_EMAIL },
      include: {
        authenticated_users: true,
        orders: true,
        quotes: true,
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
      console.log('✅ No se encontró ningún cliente con ese email');
      console.log('   Puedes crear uno nuevo sin problemas\n');
      return;
    }

    console.log('📋 Cliente encontrado:');
    console.log('   ID:', client.id);
    console.log('   Email:', client.email);
    console.log('   Nombre:', client.name);
    console.log('   Seller:', client.sellerId || '❌ SIN SELLER');
    console.log('   Usuarios vinculados:', client.authenticated_users.length);
    console.log('   Órdenes:', client._count.orders);
    console.log('   Cotizaciones:', client._count.quotes);
    console.log('   Devoluciones:', client._count.returns);
    console.log('');

    // 2. Verificar si tiene datos importantes
    const hasOrders = client._count.orders > 0;
    const hasQuotes = client._count.quotes > 0;
    const hasReturns = client._count.returns > 0;

    if (hasOrders || hasQuotes || hasReturns) {
      console.log('⚠️  ADVERTENCIA: Este cliente tiene datos asociados:');
      if (hasOrders) console.log(`   - ${client._count.orders} órdenes`);
      if (hasQuotes) console.log(`   - ${client._count.quotes} cotizaciones`);
      if (hasReturns) console.log(`   - ${client._count.returns} devoluciones`);
      console.log('');
      console.log('❌ No se puede eliminar automáticamente');
      console.log('   Primero debes eliminar manualmente las órdenes/cotizaciones/devoluciones\n');
      return;
    }

    // 3. Desvincular usuarios autenticados (relación many-to-many)
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

    // 4. Eliminar el cliente
    console.log('🗑️  Eliminando cliente...');
    await prisma.client.delete({
      where: { id: client.id }
    });

    console.log('');
    console.log('✅ ¡CLIENTE ELIMINADO EXITOSAMENTE!');
    console.log('');
    console.log('🎉 Ahora puedes crear un nuevo cliente con el email:');
    console.log(`   ${GHOST_EMAIL}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'P2003') {
      console.log('\n⚠️  El cliente tiene relaciones que impiden su eliminación');
      console.log('   Revisa órdenes, cotizaciones o devoluciones asociadas\n');
    } else if (error.code === 'P2025') {
      console.log('\n✅ El cliente ya no existe');
      console.log('   Puedes crear uno nuevo sin problemas\n');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
console.log('═══════════════════════════════════════════════════');
console.log('  ELIMINAR CLIENTE FANTASMA');
console.log('  Email: l3oyucon1978@gmail.com');
console.log('═══════════════════════════════════════════════════\n');

deleteGhostClient();
