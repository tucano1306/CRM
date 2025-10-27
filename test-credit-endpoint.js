// Test endpoint credit-notes
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testCreditNotesEndpoint() {
  try {
    // Simular lo que hace el endpoint
    console.log('\n🔍 SIMULANDO ENDPOINT /api/credit-notes?role=client\n')
    
    // 1. Obtener un usuario autenticado (Leo)
    const authUser = await prisma.authenticated_users.findFirst({
      where: {
        clients: {
          some: {
            name: 'Leo'
          }
        }
      },
      include: {
        clients: true,
        sellers: true
      }
    })
    
    if (!authUser) {
      console.log('❌ No se encontró usuario Leo')
      return
    }
    
    console.log('✅ Usuario encontrado:', authUser.email)
    console.log('   Clientes:', authUser.clients.length)
    if (authUser.clients.length > 0) {
      console.log('   Cliente ID:', authUser.clients[0].id)
      console.log('   Cliente nombre:', authUser.clients[0].name)
    }
    
    // 2. Buscar créditos como lo hace el endpoint
    if (authUser.clients.length > 0) {
      const clientId = authUser.clients[0].id
      
      console.log('\n📋 BUSCANDO CRÉDITOS PARA CLIENTE:', clientId)
      
      const creditNotes = await prisma.creditNote.findMany({
        where: { 
          clientId: clientId,
          isActive: true,
          balance: { gt: 0 }
        },
        include: {
          return: {
            include: {
              order: true
            }
          },
          usage: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log('\n💳 RESULTADO:')
      console.log('   Total créditos encontrados:', creditNotes.length)
      
      if (creditNotes.length > 0) {
        creditNotes.forEach((cn, i) => {
          console.log(`\n   ${i + 1}. ${cn.creditNoteNumber}`)
          console.log(`      Balance: $${cn.balance}`)
          console.log(`      Activa: ${cn.isActive}`)
          console.log(`      Cliente ID: ${cn.clientId}`)
        })
      } else {
        console.log('   ❌ No se encontraron créditos')
      }
      
      // Respuesta que devolvería el endpoint
      const response = { success: true, data: creditNotes }
      console.log('\n📤 RESPUESTA DEL ENDPOINT:')
      console.log(JSON.stringify(response, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCreditNotesEndpoint()
