// Buscar usuario leonic26@hotmail.com
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findUser() {
  try {
    console.log('\n🔍 Buscando usuario: leonic26@hotmail.com\n')

    // Buscar en authenticated_users
    const authUser = await prisma.authenticated_users.findFirst({
      where: { 
        OR: [
          { email: 'leonic26@hotmail.com' },
          { email: { contains: 'leonic26' } }
        ]
      },
      include: {
        clients: {
          include: { seller: true }
        },
        sellers: true
      }
    })

    if (!authUser) {
      console.log('❌ NO SE ENCONTRÓ en authenticated_users')
      console.log('\n⚠️ Esto significa que el webhook de Clerk NO se ejecutó')
      console.log('\nPosibles causas:')
      console.log('1. El webhook de Clerk no está configurado')
      console.log('2. El webhook falló (revisar logs de Vercel)')
      console.log('3. El registro todavía está en proceso (espera 30 segundos)')
      console.log('\n💡 Soluciones:')
      console.log('a) Espera 30 segundos y vuelve a ejecutar este script')
      console.log('b) Revisa logs en Vercel: https://vercel.com → Logs → /api/webhooks/clerk')
      console.log('c) Crea el usuario manualmente con: node create-buyer-user.js')
      
      // Buscar TODOS los usuarios para debug
      const allUsers = await prisma.authenticated_users.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
      })
      
      console.log('\n📋 Últimos 5 usuarios en la BD:')
      allUsers.forEach((u, i) => {
        console.log(`${i + 1}. ${u.email} (${u.role}) - ${u.createdAt}`)
      })
      
      return
    }

    console.log('✅ USUARIO ENCONTRADO\n')
    console.log('📋 Información:')
    console.log(`   • ID: ${authUser.id}`)
    console.log(`   • AuthID (Clerk): ${authUser.authId}`)
    console.log(`   • Email: ${authUser.email}`)
    console.log(`   • Nombre: ${authUser.name}`)
    console.log(`   • Role: ${authUser.role}`)
    console.log(`   • Creado: ${authUser.createdAt}`)
    console.log(`   • Clients vinculados: ${authUser.clients.length}`)
    console.log(`   • Sellers vinculados: ${authUser.sellers.length}`)

    // Verificar si tiene client vinculado
    if (authUser.clients.length === 0) {
      console.log('\n⚠️ NO TIENE CLIENT VINCULADO')
      console.log('El webhook NO encontró cliente con ese email')
      console.log('\n🔧 Creando cliente ahora...')

      // Buscar primer seller disponible
      const seller = await prisma.seller.findFirst({
        orderBy: { createdAt: 'asc' }
      })

      if (!seller) {
        console.log('❌ No hay sellers en el sistema')
        return
      }

      // Crear client
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

      console.log('\n✅ Cliente creado:')
      console.log(`   • ID: ${newClient.id}`)
      console.log(`   • Nombre: ${newClient.name}`)
      console.log(`   • Seller: ${seller.name}`)
      console.log('\n🎉 ¡Listo! Ahora puedes:')
      console.log('   1. Iniciar sesión con: leonic26@hotmail.com')
      console.log('   2. Ir a: /buyer/catalog')
      console.log('   3. Ver productos de ' + seller.name)
      
    } else {
      const client = authUser.clients[0]
      console.log('\n✅ YA TIENE CLIENT VINCULADO:')
      console.log(`   • Nombre: ${client.name}`)
      console.log(`   • Email: ${client.email}`)
      console.log(`   • Seller: ${client.seller?.name || 'Sin seller ❌'}`)
      
      if (client.seller) {
        console.log('\n🎉 ¡Todo configurado correctamente!')
        console.log('   1. Inicia sesión con: leonic26@hotmail.com')
        console.log('   2. Ve a: /buyer/catalog')
        console.log('   3. Verás productos de ' + client.seller.name)
      } else {
        console.log('\n⚠️ Cliente sin seller asignado, asignando...')
        const seller = await prisma.seller.findFirst()
        await prisma.client.update({
          where: { id: client.id },
          data: { sellerId: seller.id }
        })
        console.log('✅ Seller asignado: ' + seller.name)
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findUser()
