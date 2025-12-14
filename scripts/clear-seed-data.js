const { PrismaClient } = require('@prisma/client')

async function clearSeedData() {
  const prisma = new PrismaClient()
  
  console.log('⚠️  ELIMINANDO TODOS LOS DATOS DE PRUEBA...\n')
  
  // Lista de tablas en orden de dependencia (primero las que dependen, luego las principales)
  const tables = [
    'order_items',
    'order_status_history',
    'credit_note_usages',
    'orders',
    'pending_orders',
    'credit_notes',
    'return_items',
    'returns',
    'cart_items',
    'carts',
    'favorites',
    'chat_messages',
    'notifications',
    'quote_items',
    'quotes',
    'recurring_order_items',
    'recurring_orders',
    'product_tags',
    'product_history',
    'product_variants',
    'client_products',
    'product_sellers',
    'products',
    'clients',
    'order_schedules',
    'chat_schedules',
    'schedules',
    'sellers',
    'authenticated_users'
  ]
  
  let deletedCount = 0
  let skippedCount = 0
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`)
      console.log(`✓ Eliminado: ${table}`)
      deletedCount++
    } catch (error) {
      if (error.code === 'P2010' && error.meta?.code === '42P01') {
        console.log(`⏭ Tabla no existe: ${table}`)
        skippedCount++
      } else {
        console.log(`⚠ Error en ${table}: ${error.message}`)
      }
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log(`✅ LIMPIEZA COMPLETADA`)
  console.log(`   - Tablas limpiadas: ${deletedCount}`)
  console.log(`   - Tablas omitidas: ${skippedCount}`)
  console.log('\n📝 La base de datos ahora está vacía.')
  console.log('   Cuando inicies sesión se creará tu usuario automáticamente.')
  console.log('   Podrás crear clientes y productos reales.')
  
  await prisma.$disconnect()
}

clearSeedData()
