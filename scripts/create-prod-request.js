const { PrismaClient } = require('@prisma/client');

// Conectar a la base de datos de PRODUCCIÓN
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:npg_0dqOPGfJ7CVx@ep-spring-night-adj6vmii-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'
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

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
