// prisma/seed.ts - VERSIÓN CORREGIDA PARA SCHEMA ACTUAL
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ============================================
  // LIMPIAR DATOS EN ORDEN CORRECTO
  // ============================================
  console.log('🗑️  Limpiando datos existentes...')
  
  await prisma.orderItem.deleteMany()
  console.log('   ✅ OrderItems borrados')
  
  await prisma.order.deleteMany()
  console.log('   ✅ Orders borrados')
  
  await prisma.cartItem.deleteMany()
  console.log('   ✅ CartItems borrados')
  
  await prisma.cart.deleteMany()
  console.log('   ✅ Carts borrados')
  
  await prisma.productSeller.deleteMany()
  console.log('   ✅ ProductSellers borrados')
  
  await prisma.product.deleteMany()
  console.log('   ✅ Products borrados')
  
  await prisma.client.deleteMany()
  console.log('   ✅ Clients borrados')
  
  await prisma.seller.deleteMany()
  console.log('   ✅ Sellers borrados')

  console.log('✅ Datos limpiados\n')

  // ============================================
  // CREAR SELLERS
  // ============================================
  console.log('👤 Creando sellers...')
  
  const seller1 = await prisma.seller.create({
    data: {
      clerkUserId: 'user_test_seller_1',
      name: 'Juan Vendedor',
      email: 'juan.seller@foodcrm.com',
      phone: '555-0001'
    }
  })

  const seller2 = await prisma.seller.create({
    data: {
      clerkUserId: 'user_test_seller_2',
      name: 'Maria Sales',
      email: 'maria.sales@foodcrm.com',
      phone: '555-0002'
    }
  })

  console.log(`✅ ${2} Sellers creados\n`)

  // ============================================
  // CREAR CLIENTES
  // ============================================
  console.log('🏢 Creando clientes...')
  
  const client1 = await prisma.client.create({
    data: {
      clerkUserId: 'user_test_client_1',
      name: 'Cornerstone Cafe',
      email: 'cornerstone@cafe.com',
      phone: '555-1001',
      address: '123 Main Street',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      sellerId: seller1.id
    }
  })

  const client2 = await prisma.client.create({
    data: {
      clerkUserId: 'user_test_client_2',
      name: 'The Bistro Restaurant',
      email: 'info@bistro.com',
      phone: '555-1002',
      address: '456 Ocean Drive',
      city: 'Miami Beach',
      state: 'FL',
      zipCode: '33139',
      sellerId: seller1.id
    }
  })

  const client3 = await prisma.client.create({
    data: {
      clerkUserId: 'user_test_client_3',
      name: 'Pizza Palace',
      email: 'orders@pizzapalace.com',
      phone: '555-1003',
      address: '789 Lincoln Road',
      city: 'Miami Beach',
      state: 'FL',
      zipCode: '33139',
      sellerId: seller2.id
    }
  })

  console.log(`✅ ${3} Clientes creados\n`)

  // ============================================
  // CREAR PRODUCTOS
  // ============================================
  console.log('📦 Creando productos...')
  
  const product1 = await prisma.product.create({
    data: {
      name: 'Tomates Frescos',
      description: 'Tomates rojos frescos, perfectos para ensaladas y salsas',
      unit: 'case',
      price: 25.99,
      stock: 100,
      sku: 'TOM-FRESH-001',
      isActive: true
    }
  })

  const product2 = await prisma.product.create({
    data: {
      name: 'Mozzarella Premium',
      description: 'Queso mozzarella italiano de alta calidad',
      unit: 'pk',
      price: 15.50,
      stock: 50,
      sku: 'MOZ-PREM-001',
      isActive: true
    }
  })

  const product3 = await prisma.product.create({
    data: {
      name: 'Pasta Spaghetti',
      description: 'Pasta italiana seca de trigo duro',
      unit: 'pk',
      price: 8.75,
      stock: 200,
      sku: 'SPA-ITA-001',
      isActive: true
    }
  })

  const product4 = await prisma.product.create({
    data: {
      name: 'Aceite de Oliva Extra Virgen',
      description: 'Aceite de oliva español de primera presión',
      unit: 'case',
      price: 45.00,
      stock: 30,
      sku: 'OIL-EVOO-001',
      isActive: true
    }
  })

  const product5 = await prisma.product.create({
    data: {
      name: 'Albahaca Fresca',
      description: 'Hojas de albahaca fresca',
      unit: 'pk',
      price: 12.50,
      stock: 75,
      sku: 'BAS-FRESH-001',
      isActive: true
    }
  })

  console.log(`✅ ${5} Productos creados\n`)

  // ============================================
  // RELACIONAR PRODUCTOS CON SELLERS
  // ============================================
  console.log('🔗 Creando relaciones producto-seller...')
  
  await prisma.productSeller.createMany({
    data: [
      { productId: product1.id, sellerId: seller1.id },
      { productId: product2.id, sellerId: seller1.id },
      { productId: product3.id, sellerId: seller1.id },
      { productId: product4.id, sellerId: seller1.id },
      { productId: product5.id, sellerId: seller1.id },
      { productId: product1.id, sellerId: seller2.id },
      { productId: product3.id, sellerId: seller2.id },
      { productId: product4.id, sellerId: seller2.id }
    ]
  })

  console.log(`✅ Relaciones creadas\n`)

  // ============================================
  // CREAR ÓRDENES DE EJEMPLO
  // ============================================
  console.log('📝 Creando órdenes...')
  
  const order1 = await prisma.order.create({
    data: {
      clerkUserId: client1.clerkUserId,
      clientId: client1.id,
      sellerId: seller1.id,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      totalAmount: 100.48,
      subtotal: 100.48,
      tax: 0,
      notes: 'Primera orden de prueba'
    }
  })

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        productId: product1.id,
        productName: product1.name,
        quantity: 2,
        pricePerUnit: 25.99,
        subtotal: 51.98
      },
      {
        orderId: order1.id,
        productId: product2.id,
        productName: product2.name,
        quantity: 3,
        pricePerUnit: 15.50,
        subtotal: 46.50
      }
    ]
  })

  const order2 = await prisma.order.create({
    data: {
      clerkUserId: client2.clerkUserId,
      clientId: client2.id,
      sellerId: seller1.id,
      status: 'confirmed',
      paymentStatus: 'PAID',
      totalAmount: 98.75,
      subtotal: 98.75,
      tax: 0,
      notes: 'Orden confirmada'
    }
  })

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order2.id,
        productId: product3.id,
        productName: product3.name,
        quantity: 5,
        pricePerUnit: 8.75,
        subtotal: 43.75
      },
      {
        orderId: order2.id,
        productId: product5.id,
        productName: product5.name,
        quantity: 4,
        pricePerUnit: 12.50,
        subtotal: 50.00
      }
    ]
  })

  const order3 = await prisma.order.create({
    data: {
      clerkUserId: client3.clerkUserId,
      clientId: client3.id,
      sellerId: seller2.id,
      status: 'COMPLETED',
      paymentStatus: 'PAID',
      totalAmount: 148.96,
      subtotal: 148.96,
      tax: 0,
      notes: 'Orden completada y entregada'
    }
  })

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order3.id,
        productId: product1.id,
        productName: product1.name,
        quantity: 4,
        pricePerUnit: 25.99,
        subtotal: 103.96
      },
      {
        orderId: order3.id,
        productId: product4.id,
        productName: product4.name,
        quantity: 1,
        pricePerUnit: 45.00,
        subtotal: 45.00
      }
    ]
  })

  console.log(`✅ ${3} Órdenes creadas\n`)

  // ============================================
  // RESUMEN
  // ============================================
  console.log('🎉 ¡Seed completado exitosamente!\n')
  console.log('📊 RESUMEN DE DATOS CREADOS:')
  console.log('================================')
  
  const sellerCount = await prisma.seller.count()
  const clientCount = await prisma.client.count()
  const productCount = await prisma.product.count()
  const orderCount = await prisma.order.count()
  const orderItemCount = await prisma.orderItem.count()

  console.log(`👥 Sellers: ${sellerCount}`)
  console.log(`🏢 Clientes: ${clientCount}`)
  console.log(`📦 Productos: ${productCount}`)
  console.log(`📝 Órdenes: ${orderCount}`)
  console.log(`🛒 Items de Órdenes: ${orderItemCount}`)
  console.log('================================\n')
  
  console.log('✅ Puedes ver los datos en Prisma Studio:')
  console.log('   http://localhost:5555\n')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })