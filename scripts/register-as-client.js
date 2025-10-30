// Script para registrar un usuario existente como CLIENT
// Uso: node scripts/register-as-client.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function registerAsClient() {
  try {
    console.log('\n🔍 Buscando tu usuario autenticado...\n')

    // Buscar el authenticated_user más reciente (probablemente el tuyo)
    const authUsers = await prisma.authenticated_users.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    if (authUsers.length === 0) {
      console.error('❌ No se encontraron usuarios en authenticated_users')
      process.exit(1)
    }

    console.log('📋 Usuarios encontrados:\n')
    authUsers.forEach((user, i) => {
      console.log(`[${i + 1}] ${user.name || 'Sin nombre'}`)
      console.log(`    Email: ${user.email}`)
      console.log(`    Role: ${user.role}`)
      console.log(`    AuthID: ${user.authId}`)
      console.log(`    Created: ${user.createdAt}`)
      console.log('')
    })

    // Tomar el primero (más reciente) como el usuario actual
    const currentUser = authUsers[0]
    
    console.log(`\n✅ Usando usuario: ${currentUser.email} (${currentUser.name})`)
    console.log(`   Role actual: ${currentUser.role}`)
    console.log(`   AuthID: ${currentUser.authId}\n`)

    // Verificar si ya existe como cliente
    const existingClient = await prisma.client.findFirst({
      where: {
        authenticated_users: {
          some: { id: currentUser.id }
        }
      }
    })

    if (existingClient) {
      console.log('⚠️  Ya estás registrado como cliente!')
      console.log(`   Client ID: ${existingClient.id}`)
      console.log(`   Nombre de negocio: ${existingClient.businessName || 'N/A'}`)
      
      // Actualizar rol a CLIENT si no lo es
      if (currentUser.role !== 'CLIENT') {
        console.log(`\n🔄 Actualizando rol de ${currentUser.role} a CLIENT...`)
        await prisma.authenticated_users.update({
          where: { id: currentUser.id },
          data: { role: 'CLIENT' }
        })
        console.log('✅ Rol actualizado en la base de datos')
        console.log('\n⚠️  También necesitas actualizar el rol en Clerk:')
        console.log(`   node scripts/set-user-role-client.js ${currentUser.authId}\n`)
      }
      
      return
    }

    // Buscar un seller disponible
    const seller = await prisma.seller.findFirst({
      orderBy: { createdAt: 'asc' }
    })

    if (!seller) {
      console.error('❌ No hay sellers disponibles en el sistema')
      console.log('\n💡 Primero crea un seller o ejecuta el seed:')
      console.log('   npm run prisma:seed\n')
      process.exit(1)
    }

    console.log(`📦 Seller asignado: ${seller.name}`)
    console.log(`   Email: ${seller.email}\n`)

    // Crear el registro de cliente
    console.log('🔄 Creando registro de cliente...\n')
    
    const newClient = await prisma.client.create({
      data: {
        name: currentUser.name || 'Cliente',
        businessName: currentUser.name || 'Mi Negocio',
        email: currentUser.email,
        phone: '000-000-0000',
        address: 'Dirección por definir',
        sellerId: seller.id,
        authenticated_users: {
          connect: { id: currentUser.id }
        }
      }
    })

    console.log('✅ Cliente creado exitosamente!\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n📋 Información del cliente:')
    console.log(`   • ID: ${newClient.id}`)
    console.log(`   • Nombre: ${newClient.name}`)
    console.log(`   • Negocio: ${newClient.businessName}`)
    console.log(`   • Email: ${newClient.email}`)
    console.log(`   • Seller: ${seller.name}`)
    
    // Actualizar rol a CLIENT si no lo es
    if (currentUser.role !== 'CLIENT') {
      console.log(`\n🔄 Actualizando rol en BD de ${currentUser.role} a CLIENT...`)
      await prisma.authenticated_users.update({
        where: { id: currentUser.id },
        data: { role: 'CLIENT' }
      })
      console.log('✅ Rol actualizado en la base de datos')
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n⚠️  PASOS FINALES:\n')
    console.log('1. Actualiza el rol en Clerk (si no es CLIENT):')
    console.log(`   node scripts/set-user-role-client.js ${currentUser.authId}`)
    console.log('\n2. Cierra sesión en la aplicación')
    console.log('3. Vuelve a iniciar sesión')
    console.log('4. Ahora podrás acceder a /buyer/*\n')

  } catch (error) {
    console.error('\n❌ Error:', error)
    if (error.code === 'P2002') {
      console.log('\n💡 Este email ya está registrado como cliente')
    }
  } finally {
    await prisma.$disconnect()
  }
}

registerAsClient()
