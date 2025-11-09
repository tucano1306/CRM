// Script para actualizar el rol de un usuario en Clerk
import { clerkClient } from '@clerk/clerk-sdk-node';

async function updateUserRole() {
  try {
    const email = 'tucano0109@gmail.com';
    
    console.log(`\n🔍 Buscando usuario: ${email}\n`);
    
    // Buscar usuario por email
    const users = await clerkClient.users.getUserList({
      emailAddress: [email]
    });
    
    if (users.data.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const user = users.data[0];
    console.log('✅ Usuario encontrado:');
    console.log('🆔 ID:', user.id);
    console.log('📧 Email:', user.emailAddresses[0]?.emailAddress);
    console.log('👤 Nombre:', user.firstName, user.lastName);
    console.log('\n📦 Public Metadata actual:', JSON.stringify(user.publicMetadata, null, 2));
    
    const currentRole = user.publicMetadata?.role;
    console.log('🎭 Rol actual:', currentRole || '❌ SIN ROL');
    
    if (!currentRole) {
      console.log('\n⚠️  El usuario NO tiene rol asignado');
      console.log('💡 Asignando rol SELLER...\n');
      
      // Actualizar el usuario con rol SELLER
      await clerkClient.users.updateUser(user.id, {
        publicMetadata: {
          ...user.publicMetadata,
          role: 'SELLER'
        }
      });
      
      console.log('✅ Rol SELLER asignado correctamente');
      console.log('\n🔄 Ahora cierra sesión y vuelve a iniciar sesión para que los cambios tomen efecto');
    } else {
      console.log('\n✅ El usuario ya tiene un rol asignado');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.errors) {
      console.error('Detalles:', error.errors);
    }
  }
}

updateUserRole();
