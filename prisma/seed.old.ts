// ============================================
// PRISMA SEED FILE
// ============================================
// Archivo: prisma/seed.ts
// Ejecutar con: npx prisma db seed

import { PrismaClient, UserRole, ProductUnit, OrderStatus, DayOfWeek, TimeSlot } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...')

  // ============================================
  // 1. LIMPIAR DATOS EXISTENTES (Opcional)
  // ============================================
  console.log('🗑️  Limpiando datos existentes...')
  
  await prisma.chatMessage.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.pendingOrder.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.productSeller.deleteMany()
  await prisma.product.deleteMany()
  await prisma.client.deleteMany()
  await prisma.seller.deleteMany()
  await prisma.authenticatedUser.deleteMany()
  await prisma.activityLog.deleteMany()

  console.log('✅ Datos limpiados')

  // ============================================
  // 2. CREAR AUTHENTICATED USERS
  // ============================================
  console.log('👤 Creando usuarios autenticados...')

  const adminUser = await prisma.authenticatedUser.create({
    data: {
      authId: 'auth_admin_001',
      email: 'admin@foodcrm.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  })

  const sellerUser1 = await prisma.authenticatedUser.create({
    data: {
      authId: 'auth_seller_001',
      email: 'john.seller@foodcrm.com',
      name: 'John Seller',
      role: UserRole.SELLER,
    },
  })

  const sellerUser2 = await prisma.authenticatedUser.create({
    data: {
      authId: 'auth_seller_002',
      email: 'maria.sales@foodcrm.com',
      name: 'Maria Sales',
      role: UserRole.SELLER,
    },
  })

  const clientUser1 = await prisma.authenticatedUser.create({
    data: {
      authId: 'auth_client_001',
      email: 'owner@cornerstone.com',
      name: 'Restaurant Owner',
      role: UserRole.CLIENT,
    },
  })

  const clientUser2 = await prisma.authenticatedUser.create({
    data: {
      authId: 'auth_client_002',
      email: 'manager@bistro.com',
      name: 'Bistro Manager',
      role: UserRole.CLIENT,
    },
  })

  console.log('✅ Usuarios autenticados creados')

  // ============================================
  // 3. CREAR SELLERS
  // ============================================
  console.log('🤝 Creando sellers...')

  const seller1 = await prisma.seller.create({
    data: {
      name: 'John Seller',
      email: 'john.seller@foodcrm.com',
      phone: '555-1000',
      territory: 'North Miami',
      commission: 5.5,
      isActive: true,
      users: {
        connect: { id: sellerUser1.id },
      },
    },
  })

  const seller2 = await prisma.seller.create({
    data: {
      name: 'Maria Sales',
      email: 'maria.sales@foodcrm.com',
      phone: '555-2000',
      territory: 'South Miami',
      commission: 6.0,
      isActive: true,
      users: {
        connect: { id: sellerUser2.id },
      },
    },
  })

  console.log('✅ Sellers creados')

  // ============================================
  // 4. CREAR CLIENTS
  // ============================================
  console.log('🏢 Creando clientes...')

  const client1 = await prisma.client.create({
    data: {
      name: 'Cornerstone Cafe',
      businessName: 'Cornerstone Cafe LLC',
      address: '123 Market St, Miami FL 33101',
      phone: '555-1234',
      email: 'orders@cornerstone.com',
      orderConfirmationEnabled: true,
      notificationsEnabled: true,
      sellerId: seller1.id,
      users: {
        connect: { id: clientUser1.id },
      },
    },
  })

  const client2 = await prisma.client.create({
    data: {
      name: 'The Bistro',
      businessName: 'Bistro Gourmet Inc',
      address: '456 Main Rd, Miami FL 33102',
      phone: '555-5678',
      email: 'contact@bistro.com',
      orderConfirmationEnabled: true,
      notificationsEnabled: true,
      sellerId: seller1.id,
      users: {
        connect: { id: clientUser2.id },
      },
    },
  })

  const client3 = await prisma.client.create({
    data: {
      name: 'Pizza Palace',
      businessName: 'Pizza Palace Corp',
      address: '789 Oak Ave, Miami FL 33103',
      phone: '555-9012',
      email: 'info@pizzapalace.com',
      orderConfirmationEnabled: false,
      notificationsEnabled: true,
      sellerId: seller2.id,
    },
  })

  console.log('✅ Clientes creados')

  // ============================================
  // 5. CREAR PRODUCTS
  // ============================================
  console.log('📦 Creando productos...')

  const product1 = await prisma.product.create({
    data: {
      name: 'Fresh Tomatoes',
      description: 'Premium fresh tomatoes, perfect for sauces and salads',
      unit: ProductUnit.case,
      price: 25.99,
      stock: 100,
      sku: 'PROD-TOM-001',
      isActive: true,
    },
  })

  const product2 = await prisma.product.create({
    data: {
      name: 'Mozzarella Cheese',
      description: 'Italian mozzarella, ideal for pizza and pasta',
      unit: ProductUnit.pk,
      price: 15.50,
      stock: 50,
      sku: 'PROD-MOZ-001',
      isActive: true,
    },
  })

  const product3 = await prisma.product.create({
    data: {
      name: 'Spaghetti Pasta',
      description: 'Dried spaghetti, pantry staple',
      unit: ProductUnit.pk,
      price: 8.75,
      stock: 200,
      sku: 'PROD-SPA-001',
      isActive: true,
    },
  })

  const product4 = await prisma.product.create({
    data: {
      name: 'Extra Virgin Olive Oil',
      description: 'Premium olive oil from Spain',
      unit: ProductUnit.case,
      price: 45.00,
      stock: 80,
      sku: 'PROD-OIL-001',
      isActive: true,
    },
  })

  const product5 = await prisma.product.create({
    data: {
      name: 'Fresh Basil',
      description: 'Organic fresh basil leaves',
      unit: ProductUnit.pk,
      price: 12.50,
      stock: 150,
      sku: 'PROD-BAS-001',
      isActive: true,
    },
  })

  const product6 = await prisma.product.create({
    data: {
      name: 'Chicken Breast',
      description: 'Premium boneless chicken breast',
      unit: ProductUnit.kg,
      price: 18.99,
      stock: 120,
      sku: 'PROD-CHK-001',
      isActive: true,
    },
  })

  console.log('✅ Productos creados')

  // ============================================
  // 6. RELACIONAR PRODUCTS CON SELLERS
  // ============================================
  console.log('🔗 Relacionando productos con sellers...')

  await prisma.productSeller.createMany({
    data: [
      { productId: product1.id, sellerId: seller1.id, sellerPrice: 24.99, isAvailable: true },
      { productId: product2.id, sellerId: seller1.id, sellerPrice: 14.99, isAvailable: true },
      { productId: product3.id, sellerId: seller1.id, sellerPrice: 8.25, isAvailable: true },
      { productId: product4.id, sellerId: seller1.id, sellerPrice: 43.50, isAvailable: true },
      { productId: product5.id, sellerId: seller1.id, sellerPrice: 12.00, isAvailable: true },
      { productId: product6.id, sellerId: seller1.id, sellerPrice: 17.99, isAvailable: true },
      
      { productId: product1.id, sellerId: seller2.id, sellerPrice: 26.50, isAvailable: true },
      { productId: product3.id, sellerId: seller2.id, sellerPrice: 8.99, isAvailable: true },
      { productId: product4.id, sellerId: seller2.id, sellerPrice: 44.00, isAvailable: true },
      { productId: product6.id, sellerId: seller2.id, sellerPrice: 18.50, isAvailable: true },
    ],
  })

  console.log('✅ Relaciones producto-seller creadas')

  // ============================================
  // 7. CREAR SCHEDULES PARA SELLERS
  // ============================================
  console.log('📅 Creando horarios de sellers...')

  await prisma.schedule.createMany({
    data: [
      { sellerId: seller1.id, dayOfWeek: DayOfWeek.MONDAY, timeSlot: TimeSlot.MORNING, isActive: true },
      { sellerId: seller1.id, dayOfWeek: DayOfWeek.MONDAY, timeSlot: TimeSlot.AFTERNOON, isActive: true },
      { sellerId: seller1.id, dayOfWeek: DayOfWeek.TUESDAY, timeSlot: TimeSlot.MORNING, isActive: true },
      { sellerId: seller1.id, dayOfWeek: DayOfWeek.WEDNESDAY, timeSlot: TimeSlot.MORNING, isActive: true },
      { sellerId: seller1.id, dayOfWeek: DayOfWeek.THURSDAY, timeSlot: TimeSlot.MORNING, isActive: true },
      { sellerId: seller1.id, dayOfWeek: DayOfWeek.FRIDAY, timeSlot: TimeSlot.MORNING, isActive: true },
      
      { sellerId: seller2.id, dayOfWeek: DayOfWeek.TUESDAY, timeSlot: TimeSlot.AFTERNOON, isActive: true },
      { sellerId: seller2.id, dayOfWeek: DayOfWeek.WEDNESDAY, timeSlot: TimeSlot.AFTERNOON, isActive: true },
      { sellerId: seller2.id, dayOfWeek: DayOfWeek.THURSDAY, timeSlot: TimeSlot.AFTERNOON, isActive: true },
      { sellerId: seller2.id, dayOfWeek: DayOfWeek.FRIDAY, timeSlot: TimeSlot.AFTERNOON, isActive: true },
    ],
  })

  console.log('✅ Horarios creados')

  // ============================================
  // 8. CREAR ORDERS
  // ============================================
  console.log('📝 Creando órdenes...')

  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2024-001',
      clientId: client1.id,
      sellerId: seller1.id,
      status: OrderStatus.PENDING,
      totalAmount: 0,
      notes: 'Primera orden del cliente Cornerstone Cafe',
    },
  })

  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2024-002',
      clientId: client2.id,
      sellerId: seller1.id,
      status: OrderStatus.CONFIRMED,
      totalAmount: 0,
      notes: 'Orden confirmada - The Bistro',
      confirmedAt: new Date(),
    },
  })

  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2024-003',
      clientId: client3.id,
      sellerId: seller2.id,
      status: OrderStatus.COMPLETED,
      totalAmount: 0,
      notes: 'Orden completada - Pizza Palace',
      confirmedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  })

  console.log('✅ Órdenes creadas')

  // ============================================
  // 9. CREAR ORDER ITEMS
  // ============================================
  console.log('🛒 Creando items de órdenes...')

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        productId: product1.id,
        productName: product1.name,
        quantity: 2,
        pricePerUnit: 25.99,
        subtotal: 2 * 25.99,
        confirmed: false,
      },
      {
        orderId: order1.id,
        productId: product2.id,
        productName: product2.name,
        quantity: 3,
        pricePerUnit: 15.50,
        subtotal: 3 * 15.50,
        confirmed: false,
      },
      {
        orderId: order2.id,
        productId: product3.id,
        productName: product3.name,
        quantity: 5,
        pricePerUnit: 8.75,
        subtotal: 5 * 8.75,
        confirmed: true,
      },
      {
        orderId: order2.id,
        productId: product4.id,
        productName: product4.name,
        quantity: 1,
        pricePerUnit: 45.00,
        subtotal: 1 * 45.00,
        confirmed: true,
      },
      {
        orderId: order3.id,
        productId: product1.id,
        productName: product1.name,
        quantity: 4,
        pricePerUnit: 25.99,
        subtotal: 4 * 25.99,
        confirmed: true,
      },
      {
        orderId: order3.id,
        productId: product5.id,
        productName: product5.name,
        quantity: 2,
        pricePerUnit: 12.50,
        subtotal: 2 * 12.50,
        confirmed: true,
      },
      {
        orderId: order3.id,
        productId: product6.id,
        productName: product6.name,
        quantity: 3,
        pricePerUnit: 18.99,
        subtotal: 3 * 18.99,
        confirmed: true,
      },
    ],
  })

  console.log('✅ Items de órdenes creados')

  // ============================================
  // 10. ACTUALIZAR TOTALES DE ORDERS
  // ============================================
  console.log('💰 Actualizando totales de órdenes...')

  const order1Items = await prisma.orderItem.findMany({ where: { orderId: order1.id } })
  const order1Total = order1Items.reduce((sum, item) => sum + item.subtotal, 0)
  await prisma.order.update({
    where: { id: order1.id },
    data: { totalAmount: order1Total },
  })

  const order2Items = await prisma.orderItem.findMany({ where: { orderId: order2.id } })
  const order2Total = order2Items.reduce((sum, item) => sum + item.subtotal, 0)
  await prisma.order.update({
    where: { id: order2.id },
    data: { totalAmount: order2Total },
  })

  const order3Items = await prisma.orderItem.findMany({ where: { orderId: order3.id } })
  const order3Total = order3Items.reduce((sum, item) => sum + item.subtotal, 0)
  await prisma.order.update({
    where: { id: order3.id },
    data: { totalAmount: order3Total },
  })

  console.log('✅ Totales actualizados')

  // ============================================
  // 11. CREAR PENDING ORDERS
  // ============================================
  console.log('📋 Creando órdenes pendientes...')

  await prisma.pendingOrder.createMany({
    data: [
      {
        clientId: client1.id,
        status: 'draft',
        notes: 'Orden en borrador para revisión',
      },
      {
        clientId: client2.id,
        status: 'submitted',
        notes: 'Orden enviada esperando aprobación del seller',
      },
    ],
  })

  console.log('✅ Órdenes pendientes creadas')

  // ============================================
  // 12. CREAR CHAT MESSAGES
  // ============================================
  console.log('💬 Creando mensajes de chat...')

  await prisma.chatMessage.createMany({
    data: [
      {
        userId: clientUser1.id,
        sellerId: seller1.id,
        orderId: order1.id,
        message: '¿Cuándo estará disponible mi orden?',
        isRead: false,
        messageType: 'text',
      },
      {
        userId: sellerUser1.id,
        sellerId: seller1.id,
        orderId: order1.id,
        message: 'Su orden estará lista mañana por la mañana',
        isRead: true,
        messageType: 'text',
      },
      {
        userId: clientUser2.id,
        sellerId: seller1.id,
        message: '¿Tienen tomates frescos disponibles?',
        isRead: false,
        messageType: 'text',
      },
      {
        userId: sellerUser2.id,
        sellerId: seller2.id,
        message: 'Buenos días, ¿necesita ayuda con su pedido?',
        isRead: false,
        messageType: 'text',
      },
    ],
  })

  console.log('✅ Mensajes de chat creados')

  // ============================================
  // 13. CREAR ACTIVITY LOGS
  // ============================================
  console.log('📊 Creando logs de actividad...')

  await prisma.activityLog.createMany({
    data: [
      {
        action: 'created',
        entityType: 'order',
        entityId: order1.id,
        description: 'Nueva orden creada por cliente Cornerstone Cafe',
        userId: clientUser1.authId,
        metadata: { orderNumber: order1.orderNumber },
      },
      {
        action: 'confirmed',
        entityType: 'order',
        entityId: order2.id,
        description: 'Orden confirmada por seller John',
        userId: sellerUser1.authId,
        metadata: { orderNumber: order2.orderNumber },
      },
      {
        action: 'completed',
        entityType: 'order',
        entityId: order3.id,
        description: 'Orden completada y entregada',
        userId: sellerUser2.authId,
        metadata: { orderNumber: order3.orderNumber },
      },
      {
        action: 'login',
        entityType: 'user',
        entityId: adminUser.id,
        description: 'Admin user logged in',
        userId: adminUser.authId,
      },
    ],
  })

  console.log('✅ Logs de actividad creados')

  // ============================================
  // RESUMEN FINAL
  // ============================================
  console.log('\n🎉 ¡Seeding completado exitosamente!\n')
  console.log('📊 RESUMEN DE DATOS CREADOS:')
  console.log('================================')
  
  const userCount = await prisma.authenticatedUser.count()
  const sellerCount = await prisma.seller.count()
  const clientCount = await prisma.client.count()
  const productCount = await prisma.product.count()
  const orderCount = await prisma.order.count()
  const orderItemCount = await prisma.orderItem.count()
  const scheduleCount = await prisma.schedule.count()
  const chatCount = await prisma.chatMessage.count()
  const pendingOrderCount = await prisma.pendingOrder.count()
  const logCount = await prisma.activityLog.count()

  console.log(`👤 Usuarios Autenticados: ${userCount}`)
  console.log(`🤝 Sellers: ${sellerCount}`)
  console.log(`🏢 Clientes: ${clientCount}`)
  console.log(`📦 Productos: ${productCount}`)
  console.log(`📝 Órdenes: ${orderCount}`)
  console.log(`🛒 Items de Órdenes: ${orderItemCount}`)
  console.log(`📅 Horarios: ${scheduleCount}`)
  console.log(`💬 Mensajes de Chat: ${chatCount}`)
  console.log(`📋 Órdenes Pendientes: ${pendingOrderCount}`)
  console.log(`📊 Logs de Actividad: ${logCount}`)
  console.log('================================\n')

  console.log('✅ Puedes ver los datos en Prisma Studio:')
  console.log('   Ejecuta: npx prisma studio\n')
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })