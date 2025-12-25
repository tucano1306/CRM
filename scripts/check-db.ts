import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkData() {
  try {
    const sellers = await prisma.seller.findMany()
    const clients = await prisma.client.findMany()
    const products = await prisma.product.findMany()
    
    console.log('\n📊 ESTADO DE LA BASE DE DATOS:\n')
    console.log(`🏪 VENDEDORES: ${sellers.length}`)
    sellers.forEach(s => console.log(`   - ${s.name} (${s.email})`))
    
    console.log(`\n👥 CLIENTES: ${clients.length}`)
    clients.forEach(c => console.log(`   - ${c.name} (${c.email}) - Vendedor: ${c.sellerId}`))
    
    console.log(`\n📦 PRODUCTOS: ${products.length}`)
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()
