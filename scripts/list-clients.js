const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const clients = await prisma.client.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      whatsappNumber: true
    }
  })
  console.log('=== Todos los clientes ===')
  console.log(JSON.stringify(clients, null, 2))
  await prisma.$disconnect()
}

await main().catch(console.error)
