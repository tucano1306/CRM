// ============================================
// PRISMA SEED FILE - CORREGIDO
// ============================================
import { PrismaClient, OrderStatus, ProductUnit, DayOfWeek, TimeSlot, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ============================================
  // 1. LIMPIAR DATOS
  // ============================================
  console.log('🗑️  Limpiando datos...')
  
  await prisma.chatMessage.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.orderStatusUpdate.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.cart.deleteMany()
  await prisma.productSeller.deleteMany()
  await prisma.product.deleteMany()
  await prisma.pending_orders.deleteMany()
  await prisma.schedules.deleteMany()
  await prisma.orderSchedule.deleteMany()
  await prisma.chatSchedule.deleteMany()
  await prisma.client.deleteMany()
  await prisma.seller.deleteMany()
  await prisma.authenticated_users.deleteMany()
  await prisma.activity_logs.deleteMany()

  console.log('✅ Datos limpiados')

  // ============================================
  // 2. AUTHENTICATED USERS
  // ============================================
  console.log('👤 Creando usuarios autenticados...')

  const adminUser = await prisma.authenticated_users.create({
    data: {
      id: 'auth_admin_001',
      authId: 'auth_admin_001',
      email: 'admin@foodcrm.com',
      name: 'Admin User',
      role: 'ADMIN' as UserRole,
      updatedAt: new Date(),
    },
  })

  const sellerUser1 = await prisma.authenticated_users.create({
    data: {
      id: 'auth_seller_001',
      authId: 'auth_seller_001',
      email: 'john.seller@foodcrm.com',
      name: 'John Seller',
      role: 'SELLER' as UserRole,
      updatedAt: new Date(),
    },
  })

  const sellerUser2 = await prisma.authenticated_users.create({
    data: {
      id: 'auth_seller_002',
      authId: 'auth_seller_002',
      email: 'maria.sales@foodcrm.com',
      name: 'Maria Sales',
      role: 'SELLER' as UserRole,
      updatedAt: new Date(),
    },
  })

  console.log('✅ Usuarios autenticados creados')

  // ============================================
  // 3. SELLERS
  // ============================================
  console.log('👨‍💼 Creando vendedores...')

  const seller1 = await prisma.seller.create({
    data: {
      name: 'John Seller',
      email: 'john@seller.com',
      phone: '+1234567890',
      isActive: true,
      territory: 'North Region',
      commission: 5.5,
      authenticated_users: {
        connect: { id: sellerUser1.id }
      }
    }
  })

  const seller2 = await prisma.seller.create({
    data: {
      name: 'Maria Sales',
      email: 'maria@seller.com',
      phone: '+1987654321',
      isActive: true,
      territory: 'South Region',
      commission: 6.0,
      authenticated_users: {
        connect: { id: sellerUser2.id }
      }
    }
  })

  console.log('✅ Vendedores creados')

  // ============================================
  // 4. CLIENTS
  // ============================================
  console.log('🏢 Creando clientes...')

  const client1 = await prisma.client.create({
    data: {
      name: 'Restaurant ABC',
      businessName: 'ABC Corp',
      address: '123 Main St, City',
      phone: '+1555123456',
      email: 'contact@abc.com',
      orderConfirmationEnabled: true,
      notificationsEnabled: true,
      sellerId: seller1.id,
    }
  })

  const client2 = await prisma.client.create({
    data: {
      name: 'Bistro XYZ',
      businessName: 'XYZ Dining LLC',
      address: '456 Oak Ave, Town',
      phone: '+1555789012',
      email: 'hello@xyz.com',
      orderConfirmationEnabled: true,
      notificationsEnabled: true,
      sellerId: seller1.id,
    }
  })

  const client3 = await prisma.client.create({
    data: {
      name: 'Cafe 789',
      businessName: 'Cafe 789 Inc',
      address: '789 Pine St, Village',
      phone: '+1555345678',
      email: 'info@cafe789.com',
      orderConfirmationEnabled: false,
      notificationsEnabled: true,
      sellerId: seller2.id,
    }
  })

  console.log('✅ Clientes creados')

  // ============================================
  // 5. PRODUCTS
  // ============================================
  console.log('📦 Creando productos...')

  const product1 = await prisma.product.create({
    data: {
      name: 'Chicken Breast',
      description: 'Fresh chicken breast',
      unit: 'case' as ProductUnit,
      price: 45.99,
      stock: 100,
      sku: 'CHK-001',
      isActive: true,
    }
  })

  const product2 = await prisma.product.create({
    data: {
      name: 'Ground Beef',
      description: '80/20 ground beef',
      unit: 'lb' as ProductUnit,
      price: 5.99,
      stock: 500,
      sku: 'BEF-002',
      isActive: true,
    }
  })

  const product3 = await prisma.product.create({
    data: {
      name: 'Fresh Salmon',
      description: 'Atlantic salmon fillets',
      unit: 'kg' as ProductUnit,
      price: 24.99,
      stock: 75,
      sku: 'SAL-003',
      isActive: true,
    }
  })

  const product4 = await prisma.product.create({
    data: {
      name: 'Tomatoes',
      description: 'Organic vine tomatoes',
      unit: 'box' as ProductUnit,
      price: 12.50,
      stock: 200,
      sku: 'TOM-004',
      isActive: true,
    }
  })

  console.log('✅ Productos creados')

  // ============================================
  // 6. PRODUCT-SELLER RELATIONS
  // ============================================
  console.log('🔗 Asignando productos a vendedores...')

  await prisma.productSeller.createMany({
    data: [
      { productId: product1.id, sellerId: seller1.id, sellerPrice: 44.99, isAvailable: true },
      { productId: product2.id, sellerId: seller1.id, sellerPrice: 5.49, isAvailable: true },
      { productId: product3.id, sellerId: seller1.id, sellerPrice: 23.99, isAvailable: true },
      { productId: product1.id, sellerId: seller2.id, sellerPrice: 46.99, isAvailable: true },
      { productId: product4.id, sellerId: seller2.id, sellerPrice: 11.99, isAvailable: true },
    ]
  })

  console.log('✅ Relaciones producto-vendedor creadas')

  // ============================================
  // 7. ORDERS
  // ============================================
  console.log('🛒 Creando órdenes...')

  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2025-001',
      clientId: client1.id,
      sellerId: seller1.id,
      status: 'PENDING' as OrderStatus,
      totalAmount: 0,
      notes: 'Primera orden de prueba',
      items: {
        create: [
          {
            productId: product1.id,
            productName: product1.name,
            quantity: 5,
            pricePerUnit: 45.99,
            subtotal: 229.95,
            confirmed: false,
          },
          {
            productId: product2.id,
            productName: product2.name,
            quantity: 20,
            pricePerUnit: 5.99,
            subtotal: 119.80,
            confirmed: false,
          }
        ]
      }
    }
  })

  await prisma.order.update({
    where: { id: order1.id },
    data: { totalAmount: 349.75 }
  })

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2025-002',
      clientId: client2.id,
      sellerId: seller1.id,
      status: 'CONFIRMED' as OrderStatus,
      totalAmount: 0,
      confirmedAt: new Date(),
      notes: 'Orden confirmada',
      items: {
        create: [
          {
            productId: product3.id,
            productName: product3.name,
            quantity: 10,
            pricePerUnit: 24.99,
            subtotal: 249.90,
            confirmed: true,
          }
        ]
      }
    }
  })

  await prisma.order.update({
    where: { id: order2.id },
    data: { totalAmount: 249.90 }
  })

  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2025-003',
      clientId: client3.id,
      sellerId: seller2.id,
      status: 'COMPLETED' as OrderStatus,
      totalAmount: 0,
      confirmedAt: new Date(Date.now() - 86400000),
      completedAt: new Date(),
      notes: 'Orden completada',
      items: {
        create: [
          {
            productId: product4.id,
            productName: product4.name,
            quantity: 15,
            pricePerUnit: 12.50,
            subtotal: 187.50,
            confirmed: true,
          }
        ]
      }
    }
  })

  await prisma.order.update({
    where: { id: order3.id },
    data: { totalAmount: 187.50 }
  })

  console.log('✅ Órdenes creadas')

  // ============================================
  // 8. SCHEDULES
  // ============================================
  console.log('📅 Creando horarios...')

  await prisma.schedules.createMany({
    data: [
      {
        id: 'sched_001',
        sellerId: seller1.id,
        dayOfWeek: 'MONDAY' as DayOfWeek,
        timeSlot: 'MORNING' as TimeSlot,
        isActive: true,
        notes: 'Horario regular',
        updatedAt: new Date(),
      },
      {
        id: 'sched_002',
        sellerId: seller1.id,
        dayOfWeek: 'WEDNESDAY' as DayOfWeek,
        timeSlot: 'AFTERNOON' as TimeSlot,
        isActive: true,
        updatedAt: new Date(),
      }
    ]
  })

  console.log('✅ Horarios creados')

  // ============================================
  // RESUMEN
  // ============================================
  console.log('\n🎉 Seed completado exitosamente!\n')
  console.log('📊 Resumen:')
  console.log(`  - ${await prisma.authenticated_users.count()} usuarios autenticados`)
  console.log(`  - ${await prisma.seller.count()} vendedores`)
  console.log(`  - ${await prisma.client.count()} clientes`)
  console.log(`  - ${await prisma.product.count()} productos`)
  console.log(`  - ${await prisma.order.count()} órdenes`)
  console.log(`  - ${await prisma.orderItem.count()} items de orden`)
  console.log(`  - ${await prisma.productSeller.count()} relaciones producto-vendedor`)
  console.log(`  - ${await prisma.schedules.count()} horarios\n`)
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })