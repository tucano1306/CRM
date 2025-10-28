const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixSellerAuth() {
  try {
    console.log('🔍 Buscando vendedor tucano0109@gmail.com...')
    
    // 1. Buscar el seller
    const seller = await prisma.seller.findFirst({
      where: { email: 'tucano0109@gmail.com' },
      include: { authenticated_users: true }
    })

    if (!seller) {
      console.log('❌ No se encontró seller con ese email')
      return
    }

    console.log('\n✅ Seller encontrado:')
    console.log('  ID:', seller.id)
    console.log('  Nombre:', seller.name)
    console.log('  Email:', seller.email)
    console.log('  Authenticated users:', seller.authenticated_users.length)

    if (seller.authenticated_users.length > 0) {
      console.log('\n📋 Usuarios autenticados vinculados:')
      seller.authenticated_users.forEach((auth, idx) => {
        console.log(`  ${idx + 1}. AuthID: ${auth.authId}`)
        console.log(`     Email: ${auth.email}`)
        console.log(`     Nombre: ${auth.name}`)
        console.log(`     Role: ${auth.role}`)
      })
    } else {
      console.log('\n⚠️  El seller NO tiene authenticated_users vinculados')
      
      // Buscar authenticated_user con el mismo email
      console.log('\n🔍 Buscando authenticated_user con email', seller.email)
      const authUser = await prisma.authenticated_users.findFirst({
        where: { email: seller.email },
        include: { sellers: true }
      })

      if (authUser) {
        console.log('\n✅ Authenticated user encontrado:')
        console.log('  ID:', authUser.id)
        console.log('  AuthID:', authUser.authId)
        console.log('  Email:', authUser.email)
        console.log('  Nombre:', authUser.name)
        console.log('  Role:', authUser.role)
        console.log('  Sellers vinculados:', authUser.sellers.length)

        // Verificar si ya está vinculado
        const isLinked = authUser.sellers.some(s => s.id === seller.id)
        
        if (!isLinked) {
          console.log('\n🔧 Vinculando authenticated_user con seller...')
          await prisma.seller.update({
            where: { id: seller.id },
            data: {
              authenticated_users: {
                connect: { id: authUser.id }
              }
            }
          })
          console.log('✅ Vinculación exitosa!')
        } else {
          console.log('\n✅ Ya están vinculados')
        }
      } else {
        console.log('\n❌ No se encontró authenticated_user con ese email')
        console.log('ℹ️  El usuario debe iniciar sesión al menos una vez en Clerk')
      }
    }

    // 2. Verificar el cliente vinculado
    console.log('\n\n🔍 Buscando clientes asignados a este vendedor...')
    const clients = await prisma.client.findMany({
      where: { sellerId: seller.id },
      include: { authenticated_users: true }
    })

    console.log(`\n📊 Clientes encontrados: ${clients.length}`)
    clients.forEach((client, idx) => {
      console.log(`\n  Cliente ${idx + 1}:`)
      console.log(`    ID: ${client.id}`)
      console.log(`    Nombre: ${client.name}`)
      console.log(`    Email: ${client.email}`)
      console.log(`    Authenticated users: ${client.authenticated_users.length}`)
      if (client.authenticated_users.length > 0) {
        client.authenticated_users.forEach((auth, authIdx) => {
          console.log(`      ${authIdx + 1}. AuthID: ${auth.authId}`)
        })
      }
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSellerAuth()
