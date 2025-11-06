// Script para vincular tu usuario autenticado con un vendedor
// Uso: node link-me-to-seller.js

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function linkToSeller() {
  try {
    console.log('\n🔍 Buscando tu usuario...\n')

    // 1. Buscar tu authenticated_user (el más reciente)
    const authUsers = await prisma.authenticated_users.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        clients: true,
        sellers: true
      }
    })

    if (authUsers.length === 0) {
      console.error('❌ No se encontraron usuarios')
      process.exit(1)
    }

    console.log('📋 Usuarios encontrados:\n')
    authUsers.forEach((user, i) => {
      console.log(`[${i + 1}] ${user.name || 'Sin nombre'}`)
      console.log(`    Email: ${user.email}`)
      console.log(`    Role: ${user.role}`)
      console.log(`    Clients: ${user.clients.length}`)
      console.log(`    Sellers: ${user.sellers.length}`)
      console.log(`    Created: ${user.createdAt}`)
      console.log('')
    })

    // Usar el más reciente (probablemente tú)
    const myUser = authUsers[0]
    console.log(`\n✅ Usando: ${myUser.email}`)

    // 2. Verificar si ya tienes cliente vinculado
    if (myUser.clients.length > 0) {
      console.log('\n✅ Ya tienes cliente(s) vinculado(s):')
      myUser.clients.forEach(client => {
        console.log(`   • ${client.name} (${client.email})`)
      })
      
      const client = myUser.clients[0]
      if (client.sellerId) {
        const seller = await prisma.seller.findUnique({
          where: { id: client.sellerId }
        })
        console.log(`\n✅ Ya tienes seller asignado: ${seller?.name}`)
        console.log(`   → Puedes ir a /buyer/catalog para ver productos`)
        return
      }
    }

    // 3. Buscar si existe cliente con tu email
    console.log(`\n🔍 Buscando cliente con email: ${myUser.email}...`)
    const existingClient = await prisma.client.findFirst({
      where: { email: myUser.email },
      include: { seller: true }
    })

    if (existingClient) {
      console.log(`\n🎯 ¡Encontré un cliente con tu email!`)
      console.log(`   • Nombre: ${existingClient.name}`)
      console.log(`   • Email: ${existingClient.email}`)
      console.log(`   • Seller: ${existingClient.seller?.name || 'Sin seller'}`)
      
      // Vincular
      console.log(`\n🔗 Vinculando tu usuario con este cliente...`)
      await prisma.client.update({
        where: { id: existingClient.id },
        data: {
          authenticated_users: {
            connect: { id: myUser.id }
          }
        }
      })
      
      console.log('✅ ¡Vinculación exitosa!')
      console.log(`\n🎉 Ahora puedes:`)
      console.log(`   1. Ir a /buyer/catalog`)
      console.log(`   2. Ver productos de: ${existingClient.seller?.name}`)
      console.log(`   3. Hacer órdenes`)
      return
    }

    // 4. No existe cliente, necesitamos crearlo
    console.log(`\n⚠️ No existe cliente con tu email: ${myUser.email}`)
    console.log('\n📋 Opciones:')
    console.log('\nOPCIÓN 1 - Asignarte al primer seller disponible:')
    
    const sellers = await prisma.seller.findMany({
      orderBy: { createdAt: 'asc' },
      take: 5
    })

    if (sellers.length === 0) {
      console.error('\n❌ No hay sellers en el sistema')
      console.log('💡 Necesitas que un admin cree un seller primero')
      process.exit(1)
    }

    console.log('\n🏢 Sellers disponibles:')
    sellers.forEach((seller, i) => {
      console.log(`   [${i + 1}] ${seller.name} (${seller.email})`)
    })

    // Usar el primer seller por defecto
    const seller = sellers[0]
    console.log(`\n✅ Asignándote a: ${seller.name}`)
    
    // Crear cliente
    const newClient = await prisma.client.create({
      data: {
        name: myUser.name || 'Cliente',
        businessName: myUser.name || 'Mi Negocio',
        email: myUser.email,
        phone: '000-000-0000',
        address: 'Dirección por definir',
        sellerId: seller.id,
        authenticated_users: {
          connect: { id: myUser.id }
        }
      }
    })

    console.log('\n✅ ¡Cliente creado y vinculado exitosamente!')
    console.log('\n📋 Tu información:')
    console.log(`   • Cliente ID: ${newClient.id}`)
    console.log(`   • Nombre: ${newClient.name}`)
    console.log(`   • Email: ${newClient.email}`)
    console.log(`   • Seller: ${seller.name}`)
    
    console.log(`\n🎉 ¡Todo listo!`)
    console.log(`   1. Recarga la página`)
    console.log(`   2. Ve a /buyer/catalog`)
    console.log(`   3. Verás los productos de ${seller.name}`)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('\n💡 OPCIÓN 2 - Esperar a que un vendedor te agregue:')
    console.log('   • Un vendedor puede ir a /clients')
    console.log('   • Crear un cliente con tu email')
    console.log('   • Automáticamente se vinculará contigo')

  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

linkToSeller()
