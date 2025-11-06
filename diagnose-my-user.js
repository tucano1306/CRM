// Script para diagnosticar y arreglar vinculación de usuario
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function diagnoseUser() {
  try {
    console.log('\n🔍 DIAGNÓSTICO DE USUARIO\n')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // 1. Buscar TODOS los usuarios con tu email
    const email = 'tucano0109@gmail.com'
    
    console.log(`📧 Buscando registros con email: ${email}\n`)
    
    // Buscar en authenticated_users
    const authUsers = await prisma.authenticated_users.findMany({
      where: { 
        OR: [
          { email: email },
          { email: { contains: email } }
        ]
      },
      include: {
        clients: {
          include: {
            seller: true
          }
        },
        sellers: true
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`📊 Authenticated Users encontrados: ${authUsers.length}\n`)
    authUsers.forEach((user, i) => {
      console.log(`[${i + 1}] AuthUser:`)
      console.log(`    ID: ${user.id}`)
      console.log(`    AuthID (Clerk): ${user.authId}`)
      console.log(`    Email: ${user.email}`)
      console.log(`    Nombre: ${user.name}`)
      console.log(`    Role: ${user.role}`)
      console.log(`    Creado: ${user.createdAt}`)
      console.log(`    Clients vinculados: ${user.clients.length}`)
      if (user.clients.length > 0) {
        user.clients.forEach(c => {
          console.log(`      → ${c.name} (Seller: ${c.seller?.name || 'Sin seller'})`)
        })
      }
      console.log(`    Sellers vinculados: ${user.sellers.length}`)
      console.log('')
    })

    // Buscar en clients
    const clients = await prisma.client.findMany({
      where: { 
        OR: [
          { email: email },
          { email: { contains: email } }
        ]
      },
      include: {
        seller: true,
        authenticated_users: true
      }
    })

    console.log(`📊 Clients encontrados: ${clients.length}\n`)
    clients.forEach((client, i) => {
      console.log(`[${i + 1}] Client:`)
      console.log(`    ID: ${client.id}`)
      console.log(`    Email: ${client.email}`)
      console.log(`    Nombre: ${client.name}`)
      console.log(`    Seller: ${client.seller?.name || 'SIN SELLER ❌'}`)
      console.log(`    SellerId: ${client.sellerId || 'NULL ❌'}`)
      console.log(`    Authenticated Users vinculados: ${client.authenticated_users.length}`)
      if (client.authenticated_users.length > 0) {
        client.authenticated_users.forEach(au => {
          console.log(`      → ${au.name} (${au.authId})`)
        })
      } else {
        console.log(`      ❌ NO HAY USUARIOS VINCULADOS`)
      }
      console.log('')
    })

    // DIAGNÓSTICO
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔍 ANÁLISIS:\n')

    if (authUsers.length === 0) {
      console.log('❌ No existe authenticated_user con tu email')
      console.log('   → ¿Usaste otro email al registrarte en Clerk?')
      return
    }

    if (clients.length === 0) {
      console.log('❌ No existe Client con tu email')
      console.log('   → El webhook NO creó el cliente automáticamente')
      console.log('   → Voy a crearlo ahora...\n')
      
      const authUser = authUsers[0]
      const seller = await prisma.seller.findFirst({
        orderBy: { createdAt: 'asc' }
      })

      if (!seller) {
        console.log('❌ No hay sellers en el sistema')
        return
      }

      const newClient = await prisma.client.create({
        data: {
          name: authUser.name || 'Cliente',
          businessName: authUser.name || 'Mi Negocio',
          email: authUser.email,
          phone: '000-000-0000',
          address: 'Por definir',
          sellerId: seller.id,
          authenticated_users: {
            connect: { id: authUser.id }
          }
        }
      })

      console.log('✅ Cliente creado:')
      console.log(`   • ID: ${newClient.id}`)
      console.log(`   • Seller: ${seller.name}`)
      console.log(`   • Vinculado con: ${authUser.name}`)
      console.log('\n🎉 Recarga la página y ve a /buyer/catalog')
      return
    }

    // Caso: Existe authUser y Client pero NO están vinculados
    const authUser = authUsers[0]
    const client = clients[0]

    if (client.authenticated_users.length === 0) {
      console.log('⚠️ Problema encontrado:')
      console.log(`   • AuthUser existe: ${authUser.email}`)
      console.log(`   • Client existe: ${client.email}`)
      console.log(`   • Pero NO están vinculados ❌\n`)
      console.log('🔧 Vinculando ahora...\n')

      await prisma.client.update({
        where: { id: client.id },
        data: {
          authenticated_users: {
            connect: { id: authUser.id }
          }
        }
      })

      console.log('✅ ¡Vinculados exitosamente!')
      console.log(`   • ${authUser.name} ↔ ${client.name}`)
      console.log(`   • Seller: ${client.seller?.name}`)
      console.log('\n🎉 Recarga la página y ve a /buyer/catalog')
      return
    }

    // Caso: Todo está vinculado pero sin seller
    if (!client.sellerId) {
      console.log('⚠️ Problema encontrado:')
      console.log(`   • AuthUser y Client están vinculados ✅`)
      console.log(`   • Pero Client NO tiene seller asignado ❌\n`)
      console.log('🔧 Asignando seller...\n')

      const seller = await prisma.seller.findFirst({
        orderBy: { createdAt: 'asc' }
      })

      await prisma.client.update({
        where: { id: client.id },
        data: { sellerId: seller.id }
      })

      console.log(`✅ Seller asignado: ${seller.name}`)
      console.log('\n🎉 Recarga la página y ve a /buyer/catalog')
      return
    }

    // Todo está bien
    console.log('✅ Todo está correctamente configurado:')
    console.log(`   • AuthUser: ${authUser.email}`)
    console.log(`   • Client: ${client.name}`)
    console.log(`   • Seller: ${client.seller?.name}`)
    console.log(`   • Vinculados correctamente`)
    console.log('\n💡 Si no ves productos:')
    console.log(`   1. Verifica que el seller ${client.seller?.name} tenga productos`)
    console.log(`   2. Recarga la página (Ctrl+R)`)
    console.log(`   3. Ve a /buyer/catalog`)

  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseUser()
