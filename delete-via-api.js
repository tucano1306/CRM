/**
 * Script para eliminar cliente usando la API de producción
 * Este SÍ funciona porque usa fetch a la API desplegada
 */

const API_URL = 'https://food-order-crm.vercel.app';
const GHOST_EMAIL = 'l3oyucon1978@gmail.com';

// Necesitarás tu cookie de sesión de Clerk
// La puedes obtener de las DevTools de Chrome (F12 > Application > Cookies)
const SESSION_COOKIE = '__session=YOUR_SESSION_COOKIE_HERE'; // Reemplazar con tu cookie

async function deleteClientViaAPI() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  🗑️  ELIMINAR CLIENTE VIA API');
  console.log(`  📧 Email: ${GHOST_EMAIL}`);
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Paso 1: Obtener información del cliente
    console.log('🔍 Buscando cliente...\n');
    
    const checkResponse = await fetch(
      `${API_URL}/api/debug/clients?email=${encodeURIComponent(GHOST_EMAIL)}`,
      {
        headers: {
          'Cookie': SESSION_COOKIE
        }
      }
    );

    const checkData = await checkResponse.json();

    if (!checkData.success) {
      if (checkData.canCreate) {
        console.log('✅ ÉXITO: El cliente ya no existe');
        console.log(`   Puedes crear ${GHOST_EMAIL} sin problemas\n`);
        return;
      }
      
      console.log('❌ Error:', checkData.message);
      if (checkResponse.status === 401) {
        console.log('\n⚠️  Necesitas estar autenticado');
        console.log('   Actualiza SESSION_COOKIE con tu cookie de sesión\n');
      }
      return;
    }

    const client = checkData.client;
    console.log('📋 Cliente encontrado:');
    console.log(`   ID: ${client.id}`);
    console.log(`   Email: ${client.email}`);
    console.log(`   Nombre: ${client.name || 'Sin nombre'}`);
    console.log(`   Seller: ${client.sellerName || '❌ SIN SELLER'}`);
    console.log(`   Órdenes: ${client.ordersCount || 0}`);
    console.log('');

    // Paso 2: Eliminar el cliente
    console.log('🗑️  Eliminando cliente...\n');
    
    const deleteResponse = await fetch(
      `${API_URL}/api/clients/${client.id}`,
      {
        method: 'DELETE',
        headers: {
          'Cookie': SESSION_COOKIE,
          'Content-Type': 'application/json'
        }
      }
    );

    const deleteData = await deleteResponse.json();

    if (deleteResponse.ok) {
      console.log('═══════════════════════════════════════════════════');
      console.log('  ✅ ¡CLIENTE ELIMINADO EXITOSAMENTE!');
      console.log('═══════════════════════════════════════════════════');
      console.log('');
      console.log(`🎉 Ahora puedes crear un nuevo cliente con:`);
      console.log(`   ${GHOST_EMAIL}`);
      console.log('');
    } else {
      console.log('❌ Error al eliminar:', deleteData.message || 'Error desconocido');
      console.log('\nRespuesta completa:', deleteData);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar
deleteClientViaAPI();
