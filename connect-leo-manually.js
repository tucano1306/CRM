const { PrismaClient } = require('@prisma/client');

const DATABASE_URL = "postgresql://neondb_owner:npg_0dqOPGfJ7CVx@ep-spring-night-adj6vmii-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function main() {
  const leoAuthUserId = '06346258-5a60-4eb5-bdec-2bc20eea0a0d';
  const sellerId = '767e722c-4d1d-477f-b1dc-be0ad326bcaa';

  console.log('🔧 Conectando manualmente a Leo con el vendedor...\n');

  // Crear el cliente para Leo
  const client = await prisma.client.create({
    data: {
      name: 'Leo',
      email: 'l3oyucon1978@gmail.com',
      phone: '',
      address: 'Por definir',
      sellerId: sellerId,
      authenticated_users: {
        connect: { id: leoAuthUserId }
      }
    }
  });

  console.log('✅ Cliente creado:', client.id);

  // Crear notificación para el vendedor
  const notification = await prisma.notification.create({
    data: {
      sellerId: sellerId,
      type: 'NEW_ORDER',
      title: '🎉 Nuevo cliente conectado',
      message: `Leo aceptó tu invitación y se conectó como cliente`,
      metadata: {
        clientId: client.id,
        clientName: 'Leo',
        clientEmail: 'l3oyucon1978@gmail.com',
        action: 'CLIENT_CONNECTED'
      }
    }
  });

  console.log('✅ Notificación creada:', notification.id);
  console.log('\n🎉 ¡Conexión completada exitosamente!');
  console.log('   - Cliente ID:', client.id);
  console.log('   - Vendedor ID:', sellerId);
  console.log('   - Notificación ID:', notification.id);

  await prisma.$disconnect();
}

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
