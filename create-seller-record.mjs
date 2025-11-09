import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function createSellerRecord() {
  try {
    const clerkUserId = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM';
    const email = 'tucano0109@gmail.com';
    const name = 'Leo Leo';
    
    console.log('\n🔍 Verificando si existe en authenticated_users...');
    
    // Buscar o crear en authenticated_users
    let authUser = await prisma.authenticated_users.findUnique({
      where: { authId: clerkUserId }
    });
    
    if (!authUser) {
      console.log('⚠️  No existe en authenticated_users, creando...');
      authUser = await prisma.authenticated_users.create({
        data: {
          authId: clerkUserId,
          email: email,
          role: 'SELLER'
        }
      });
      console.log('✅ Creado en authenticated_users');
    } else {
      console.log('✅ Ya existe en authenticated_users');
    }
    
    console.log('\n🔍 Verificando si existe en sellers...');
    
    // Buscar o crear en sellers
    let seller = await prisma.sellers.findUnique({
      where: { authId: clerkUserId }
    });
    
    if (!seller) {
      console.log('⚠️  No existe en sellers, creando...');
      seller = await prisma.sellers.create({
        data: {
          authId: clerkUserId,
          name: name,
          email: email,
          phone: '',
          address: '',
          companyName: 'Mi Empresa',
          taxId: '',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Vendedor creado exitosamente!');
      console.log('📋 ID del vendedor:', seller.id);
    } else {
      console.log('✅ Ya existe en sellers');
      console.log('📋 ID del vendedor:', seller.id);
    }
    
    console.log('\n✅ Todo listo! Ahora intenta acceder al dashboard.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createSellerRecord();
