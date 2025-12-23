const { PrismaClient } = require('@prisma/client');

// Conectar a la base de datos de PRODUCCIÓN
// IMPORTANTE: Usar variable de entorno DATABASE_URL
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('=== Creando solicitud de prueba en PRODUCCIÓN ===\n');
  
  const sellerId = '767e722c-4d1d-477f-b1dc-be0ad326bcaa'; // Tu seller ID
  
  // Crear solicitud de prueba
  const request = await prisma.connectionRequest.create({
    data: {
      buyerClerkId: 'test_buyer_prod_' + Date.now(),
      buyerName: 'Cliente de Prueba (Producción)',
      buyerEmail: 'cliente.prueba@ejemplo.com',
      buyerPhone: '+52 555 987 6543',
      sellerId: sellerId,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
  
  console.log('✅ Solicitud creada en PRODUCCIÓN!');
  console.log('   ID:', request.id);
  console.log('   Buyer:', request.buyerName);
  console.log('   Seller:', sellerId);
  console.log('');
  console.log('👉 Ahora ve a https://crm-food-order.vercel.app/clients');
  console.log('👉 Deberías ver el panel naranja con la solicitud!');
}

await main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
