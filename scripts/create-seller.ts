import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createSeller() {
  try {
    // Buscar si ya existe un vendedor
    const existing = await prisma.seller.findFirst()
    if (existing) {
      console.log('✅ Ya existe un vendedor:', existing.name)
      return
    }

    // Crear vendedor
    const seller = await prisma.seller.create({
      data: {
        name: 'Factoria de Azucar',
        email: 'factoria@azucar.com',
        phone: '0000000000',
        address: 'Dirección pendiente',
        description: 'Vendedor principal'
      }
    })

    console.log('✅ Vendedor creado:', seller.name)
    console.log('ID:', seller.id)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSeller()
