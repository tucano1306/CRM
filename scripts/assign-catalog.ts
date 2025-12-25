import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assignCatalogToClients() {
  try {
    console.log('🔍 Buscando clientes y productos...')
    
    // Obtener todos los clientes
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, email: true }
    })
    
    console.log(`📋 Clientes encontrados: ${clients.length}`)
    clients.forEach(c => console.log(`  - ${c.name} (${c.email})`))
    
    // Obtener todos los productos
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true }
    })
    
    console.log(`📦 Productos activos encontrados: ${products.length}`)
    
    if (clients.length === 0) {
      console.log('⚠️ No hay clientes registrados')
      return
    }
    
    if (products.length === 0) {
      console.log('⚠️ No hay productos activos')
      return
    }
    
    // Asignar todos los productos a todos los clientes
    let created = 0
    let existing = 0
    
    for (const client of clients) {
      console.log(`\n🔗 Asignando catálogo a: ${client.name}`)
      
      for (const product of products) {
        // Verificar si ya existe
        const exists = await prisma.clientProduct.findUnique({
          where: {
            clientId_productId: {
              clientId: client.id,
              productId: product.id
            }
          }
        })
        
        if (exists) {
          existing++
          continue
        }
        
        // Crear la relación
        await prisma.clientProduct.create({
          data: {
            clientId: client.id,
            productId: product.id,
            customPrice: product.price,
            isVisible: true
          }
        })
        
        created++
      }
    }
    
    console.log('\n✅ Catálogo asignado:')
    console.log(`   - Nuevas asignaciones: ${created}`)
    console.log(`   - Ya existían: ${existing}`)
    console.log(`   - Total: ${created + existing}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

assignCatalogToClients()
