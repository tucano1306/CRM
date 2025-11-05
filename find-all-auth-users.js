/**
 * Encontrar TODOS los authenticated_users con el authId
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
})

async function findAllAuthUsers() {
  try {
    const targetAuthId = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM'
    
    console.log('🔍 Buscando TODOS los authenticated_users con authId:', targetAuthId, '\n')
    
    const users = await prisma.authenticated_users.findMany({
      where: { authId: targetAuthId },
      include: { sellers: true }
    })
    
    console.log(`📊 Encontrados: ${users.length} registros\n`)
    
    users.forEach((user, i) => {
      console.log(`${i+1}. authenticated_user:`)
      console.log(`   ID: ${user.id}`)
      console.log(`   authId: ${user.authId}`)
      console.log(`   Email: ${user.email}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Role: ${user.role}`)
      console.log(`   Sellers: ${user.sellers.length}`)
      if (user.sellers.length > 0) {
        user.sellers.forEach(s => {
          console.log(`      → ${s.name} (${s.id})`)
        })
      }
      console.log('')
    })
    
    // Ahora buscar el registro con ID 5d8f8f5d-43d1-435d-978b-39f254fb9846
    console.log('🔍 Buscando el registro que aparece en los logs...\n')
    
    const logUser = await prisma.authenticated_users.findUnique({
      where: { id: '5d8f8f5d-43d1-435d-978b-39f254fb9846' },
      include: { sellers: true }
    })
    
    if (logUser) {
      console.log('✅ Registro de los logs encontrado:')
      console.log(`   ID: ${logUser.id}`)
      console.log(`   authId: ${logUser.authId}`)
      console.log(`   Email: ${logUser.email}`)
      console.log(`   Name: ${logUser.name}`)
      console.log(`   Role: ${logUser.role}`)
      console.log(`   Sellers: ${logUser.sellers.length}\n`)
      
      if (logUser.sellers.length === 0) {
        console.log('❌ Este registro NO tiene sellers vinculados')
        console.log('📝 Vamos a vincular el seller existente...\n')
        
        // Buscar el seller que creamos
        const seller = await prisma.seller.findFirst({
          where: { email: 'tucano0109@gmail.com' }
        })
        
        if (seller) {
          console.log(`✅ Seller encontrado: ${seller.id}`)
          console.log('🔗 Vinculando...\n')
          
          await prisma.$executeRaw`
            INSERT INTO "_SellerUsers" ("A", "B")
            VALUES (${seller.id}, ${logUser.id})
            ON CONFLICT DO NOTHING
          `
          
          console.log('✅ Vinculación completada!')
          
          // Verificar
          const verified = await prisma.authenticated_users.findUnique({
            where: { id: logUser.id },
            include: { sellers: true }
          })
          
          console.log(`\n🎉 Verificación: Sellers vinculados = ${verified.sellers.length}`)
        }
      } else {
        console.log('✅ Este registro YA TIENE sellers vinculados')
      }
    } else {
      console.log('❌ No se encontró el registro con ID de los logs')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

findAllAuthUsers()
