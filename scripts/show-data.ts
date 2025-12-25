import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function showData() {
  try {
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, email: true, sellerId: true }
    })
    
    const products = await prisma.product.findMany({
      select: { id: true, name: true, price: true, isActive: true, sellerId: true }
    })
    
    console.log(`\n📋 CLIENTES (${clients.length}):`)
    clients.forEach(c => console.log(`  ${c.name} - ${c.email} (sellerId: ${c.sellerId})`))
    
    console.log(`\n📦 PRODUCTOS (${products.length}):`)
    products.forEach(p => console.log(`  ${p.name} - $${p.price} (activo: ${p.isActive}, sellerId: ${p.sellerId})`))
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

showData()
