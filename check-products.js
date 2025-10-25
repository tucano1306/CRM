const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkProducts() {
  try {
    console.log('🔍 Verificando productos en la base de datos...\n')

    // Total de productos
    const totalProducts = await prisma.product.count()
    console.log(`📊 Total de productos: ${totalProducts}`)

    // Productos activos
    const activeProducts = await prisma.product.count({
      where: { isActive: true }
    })
    console.log(`✅ Productos activos (isActive=true): ${activeProducts}`)

    // Productos con stock
    const productsWithStock = await prisma.product.count({
      where: { stock: { gt: 0 } }
    })
    console.log(`📦 Productos con stock > 0: ${productsWithStock}`)

    // Productos activos CON stock (lo que debería mostrar el catálogo)
    const catalogProducts = await prisma.product.count({
      where: {
        isActive: true,
        stock: { gt: 0 }
      }
    })
    console.log(`🎯 Productos para catálogo (activos + stock): ${catalogProducts}\n`)

    // Listar TODOS los productos
    const allProducts = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        isActive: true,
        category: true,
        sku: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log('📋 Lista de todos los productos:')
    console.log('─'.repeat(100))
    allProducts.forEach((p, i) => {
      const status = p.isActive ? '✅' : '❌'
      const stockStatus = p.stock > 0 ? `📦 ${p.stock}` : '⚠️ SIN STOCK'
      console.log(`${i + 1}. ${status} ${p.name}`)
      console.log(`   SKU: ${p.sku || 'N/A'} | Precio: $${p.price} | Stock: ${stockStatus}`)
      console.log(`   isActive: ${p.isActive} | Categoría: ${p.category || 'N/A'}`)
      console.log('')
    })

    if (allProducts.length === 0) {
      console.log('⚠️ NO HAY PRODUCTOS EN LA BASE DE DATOS')
      console.log('💡 Necesitas crear productos como vendedor primero.')
    } else if (catalogProducts === 0) {
      console.log('⚠️ HAY PRODUCTOS PERO NINGUNO CUMPLE LOS REQUISITOS PARA EL CATÁLOGO')
      console.log('💡 Verifica que tengan:')
      console.log('   - isActive = true')
      console.log('   - stock > 0')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkProducts()
