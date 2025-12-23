const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  try {
    // Mostrar todos los clientes primero
    console.log('=== Todos los clientes ===')
    const allClients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        updatedAt: true
      }
    })
    
    allClients.forEach(c => {
      console.log(`Nombre: ${c.name}`)
      console.log(`Teléfono: ${c.phone}`)
      console.log(`Email: ${c.email}`)
      console.log(`Actualizado: ${c.updatedAt}`)
      console.log('---')
    })
    
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

await main()
