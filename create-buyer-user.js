// Crear usuario comprador manualmente para leonic26@hotmail.com
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createBuyerUser() {
  try {
    console.log('\n🔨 Creando usuario comprador: leonic26@hotmail.com\n')

    // 1. Crear authenticated_user
    const authUser = await prisma.authenticated_users.create({
      data: {
        id: 'manual_' + Date.now(),
        authId: 'manual_clerk_' + Date.now(), // Temporal, se actualizará con el real de Clerk
        email: 'leonic26@hotmail.com',
        name: 'Leo Buyer',
        role: 'CLIENT',
        updatedAt: new Date()
      }
    })

    console.log('✅ Authenticated User creado:')
    console.log(`   • ID: ${authUser.id}`)
    console.log(`   • Email: ${authUser.email}`)
    console.log(`   • Role: ${authUser.role}`)

    // 2. Buscar seller disponible
    const seller = await prisma.seller.findFirst({
      orderBy: { createdAt: 'asc' }
    })

    if (!seller) {
      console.log('\n❌ No hay sellers disponibles')
      return
    }

    console.log(`\n✅ Seller encontrado: ${seller.name}`)

    // 3. Crear client vinculado
    const client = await prisma.client.create({
      data: {
        name: 'Leo Buyer',
        businessName: 'Mi Negocio',
        email: 'leonic26@hotmail.com',
        phone: '000-000-0000',
        address: 'Por definir',
        sellerId: seller.id,
        authenticated_users: {
          connect: { id: authUser.id }
        }
      }
    })

    console.log('\n✅ Client creado:')
    console.log(`   • ID: ${client.id}`)
    console.log(`   • Nombre: ${client.name}`)
    console.log(`   • Seller: ${seller.name}`)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 ¡USUARIO CREADO EXITOSAMENTE!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log('📋 Resumen:')
    console.log(`   • Email: leonic26@hotmail.com`)
    console.log(`   • Role: CLIENT (Comprador)`)
    console.log(`   • Seller asignado: ${seller.name}`)
    console.log(`   • Productos disponibles: Ver en /buyer/catalog`)

    console.log('\n🎯 Próximos pasos:')
    console.log('   1. Ve a la aplicación')
    console.log('   2. Inicia sesión con: leonic26@hotmail.com')
    console.log('   3. Usa la contraseña que creaste en Clerk')
    console.log('   4. Serás redirigido automáticamente a /buyer/catalog')
    console.log('   5. Verás los productos de ' + seller.name)
    
    console.log('\n⚠️  NOTA IMPORTANTE:')
    console.log('   Si al iniciar sesión ves un error, necesitas sincronizar')
    console.log('   el authId real de Clerk. Por ahora el authId es temporal.')
    console.log('   El sistema debería sincronizarse automáticamente en el')
    console.log('   primer login.')

  } catch (error) {
    console.error('\n❌ Error:', error)
    
    if (error.code === 'P2002') {
      console.log('\n💡 El usuario ya existe. Ejecuta:')
      console.log('   node find-leonic-user.js')
      console.log('   Para verificar el estado actual')
    }
  } finally {
    await prisma.$disconnect()
  }
}

createBuyerUser()
