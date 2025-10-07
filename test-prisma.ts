import { prisma } from './lib/prisma.js'

async function main() {
  // Test: Obtener todos los usuarios
  const users = await prisma.authenticatedUser.findMany({
    take: 5,
  })
  console.log('👤 Usuarios:', users)

  // Test: Obtener clientes con sus sellers
  const clients = await prisma.client.findMany({
    include: {
      seller: true,
    },
    take: 3,
  })
  console.log('🏢 Clientes:', clients)

  // Test: Obtener productos con sellers
  const products = await prisma.product.findMany({
    include: {
      sellers: {
        include: {
          seller: true,
        },
      },
    },
    take: 3,
  })
  console.log('📦 Productos:', products)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })