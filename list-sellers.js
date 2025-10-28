const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function listAllSellers() {
  try {
    const sellers = await prisma.seller.findMany({
      include: { 
        authenticated_users: true,
        clients: true
      }
    })

    console.log(`\n📊 Total de sellers: ${sellers.length}\n`)

    sellers.forEach((seller, idx) => {
      console.log(`${idx + 1}. Seller:`)
      console.log(`   ID: ${seller.id}`)
      console.log(`   Nombre: ${seller.name}`)
      console.log(`   Email: ${seller.email}`)
      console.log(`   Authenticated users: ${seller.authenticated_users.length}`)
      if (seller.authenticated_users.length > 0) {
        seller.authenticated_users.forEach((auth, authIdx) => {
          console.log(`     ${authIdx + 1}. AuthID: ${auth.authId}, Email: ${auth.email}`)
        })
      }
      console.log(`   Clientes asignados: ${seller.clients.length}`)
      console.log('')
    })

    // Buscar authenticated_users con role SELLER
    console.log('\n📋 Authenticated users con role SELLER:')
    const authSellers = await prisma.authenticated_users.findMany({
      where: { role: 'SELLER' },
      include: { sellers: true }
    })

    authSellers.forEach((auth, idx) => {
      console.log(`${idx + 1}. AuthUser:`)
      console.log(`   ID: ${auth.id}`)
      console.log(`   AuthID: ${auth.authId}`)
      console.log(`   Email: ${auth.email}`)
      console.log(`   Nombre: ${auth.name}`)
      console.log(`   Sellers vinculados: ${auth.sellers.length}`)
      if (auth.sellers.length > 0) {
        auth.sellers.forEach((s, sIdx) => {
          console.log(`     ${sIdx + 1}. Seller: ${s.name} (${s.email})`)
        })
      }
      console.log('')
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listAllSellers()
