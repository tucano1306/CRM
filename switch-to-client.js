// Script para cambiar tu rol a CLIENT (comprador)
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function switchToClient() {
  try {
    console.log('\n🔄 Cambiando tu rol a CLIENT (Comprador)...\n')

    const email = 'tucano0109@gmail.com'

    // 1. Encontrar tu usuario
    const user = await prisma.authenticated_users.findFirst({
      where: { email },
      include: {
        clients: true,
        sellers: true
      }
    })

    if (!user) {
      console.log('❌ Usuario no encontrado')
      return
    }

    console.log('📋 Estado actual:')
    console.log(`   • Email: ${user.email}`)
    console.log(`   • Nombre: ${user.name}`)
    console.log(`   • Role actual: ${user.role}`)
    console.log(`   • Clients: ${user.clients.length}`)
    console.log(`   • Sellers: ${user.sellers.length}`)

    // 2. Cambiar rol a CLIENT
    await prisma.authenticated_users.update({
      where: { id: user.id },
      data: { role: 'CLIENT' }
    })

    console.log('\n✅ Rol actualizado a CLIENT en la base de datos')
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  PASOS IMPORTANTES:\n')
    console.log('1. Debes actualizar el rol en Clerk también:')
    console.log('   a. Ve a: https://dashboard.clerk.com')
    console.log('   b. Busca tu usuario: tucano0109@gmail.com')
    console.log('   c. En "Metadata" → "Public metadata"')
    console.log('   d. Cambia: { "role": "CLIENT" }')
    console.log('   e. Guarda cambios\n')
    console.log('2. Cierra sesión en la aplicación')
    console.log('3. Vuelve a iniciar sesión')
    console.log('4. Ahora podrás acceder a /buyer/catalog')
    console.log('\nO más rápido: usa el script automatizado:')
    console.log(`   node scripts/set-user-role-client.js ${user.authId}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

switchToClient()
