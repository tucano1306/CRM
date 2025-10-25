const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function changeRoleToClient() {
  try {
    console.log('🔍 Buscando usuario SELLER...\n')

    // Buscar el AuthUser del seller
    const authUser = await prisma.authUser.findFirst({
      where: {
        sellers: {
          some: {}
        }
      },
      include: {
        sellers: true,
        clients: true,
      }
    })

    if (!authUser) {
      console.log('❌ No se encontró ningún usuario SELLER')
      return
    }

    console.log('✅ Usuario encontrado:')
    console.log(`   - Clerk ID: ${authUser.clerkUserId}`)
    console.log(`   - Email: ${authUser.email}`)
    console.log(`   - Sellers: ${authUser.sellers.length}`)
    console.log(`   - Clients: ${authUser.clients.length}\n`)

    // Crear un Client para este AuthUser
    console.log('🔧 Creando registro Client...')
    
    const client = await prisma.client.create({
      data: {
        authUserId: authUser.id,
        businessName: 'Mi Negocio',
        contactName: authUser.email.split('@')[0],
        email: authUser.email,
        phone: '1234567890',
        address: 'Dirección de prueba'
      }
    })

    console.log('✅ Cliente creado:')
    console.log(`   - ID: ${client.id}`)
    console.log(`   - Email: ${client.email}\n`)

    console.log('📝 IMPORTANTE:')
    console.log('   1. Cierra sesión en la aplicación')
    console.log('   2. Vuelve a iniciar sesión')
    console.log('   3. Ve a Clerk Dashboard y cambia el rol a CLIENT en public_metadata')
    console.log(`   4. O usa este usuario como SELLER y crea una cuenta nueva para CLIENT\n`)

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

changeRoleToClient()
