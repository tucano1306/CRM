const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function findClient() {
  const client = await prisma.client.findFirst({
    where: {
      email: 'l3oyucon1978@gmail.com'
    },
    include: {
      authenticated_users: true
    }
  })
  
  console.log('Client:', JSON.stringify(client, null, 2))
  await prisma.$disconnect()
}

findClient()
