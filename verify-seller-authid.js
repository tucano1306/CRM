const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifySellerAuthId() {
  try {
    console.log('🔍 Buscando vendedor con email: tucano0109@gmail.com')
    
    // Buscar seller
    const seller = await prisma.seller.findFirst({
      where: {
        email: 'tucano0109@gmail.com'
      },
      include: {
        authenticated_users: true,
        clients: {
          include: {
            authenticated_users: true
          }
        }
      }
    })

    if (!seller) {
      console.log('❌ No se encontró vendedor con ese email')
      return
    }

    console.log('\n✅ Vendedor encontrado:')
    console.log('ID:', seller.id)
    console.log('Nombre:', seller.name)
    console.log('Email:', seller.email)
    
    console.log('\n📋 Usuarios autenticados del vendedor:')
    seller.authenticated_users.forEach((auth, idx) => {
      console.log(`  ${idx + 1}. ID: ${auth.id}, AuthID (Clerk): ${auth.authId}`)
    })

    console.log('\n👥 Clientes asignados:', seller.clients.length)
    seller.clients.forEach((client, idx) => {
      console.log(`\n  Cliente ${idx + 1}:`)
      console.log(`    ID: ${client.id}`)
      console.log(`    Nombre: ${client.name}`)
      console.log(`    Email: ${client.email}`)
      console.log(`    AuthUsers:`)
      client.authenticated_users.forEach((auth, authIdx) => {
        console.log(`      ${authIdx + 1}. ID: ${auth.id}, AuthID: ${auth.authId}`)
      })
    })

    // Buscar mensajes de chat
    console.log('\n💬 Mensajes de chat recientes:')
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: seller.authenticated_users[0]?.authId },
          { receiverId: seller.authenticated_users[0]?.authId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    if (messages.length === 0) {
      console.log('  No hay mensajes')
    } else {
      messages.forEach((msg, idx) => {
        console.log(`  ${idx + 1}. De: ${msg.senderId.substring(0, 15)}... Para: ${msg.receiverId.substring(0, 15)}...`)
        console.log(`     Mensaje: ${msg.message.substring(0, 50)}...`)
        console.log(`     Fecha: ${msg.createdAt}`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifySellerAuthId()
