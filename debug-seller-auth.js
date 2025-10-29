const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const sellerId = '9de9276b-e8b7-4daf-9a94-e4a198875c49'
  
  console.log('🔍 Buscando usuarios vinculados al vendedor:', sellerId)
  
  const users = await prisma.authenticated_users.findMany({
    where: {
      sellers: {
        some: {
          id: sellerId
        }
      }
    }
  })
  
  console.log('\n✅ Usuarios encontrados:', users.length)
  users.forEach((user, i) => {
    console.log(`\n[${i + 1}]`, {
      id: user.id,
      authId: user.authId,
      email: user.email,
      name: user.name,
      role: user.role
    })
  })
  
  await prisma.$disconnect()
}

main().catch(console.error)
