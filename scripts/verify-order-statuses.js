// Script para verificar los nuevos estados de OrderStatus
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyOrderStatuses() {
  try {
    console.log('🔍 Verificando estados de OrderStatus en la base de datos...\n')
    
    const result = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = '"OrderStatus"'::regtype 
      ORDER BY enumsortorder
    `
    
    console.log('✅ Estados disponibles en OrderStatus:')
    result.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.enumlabel}`)
    })
    
    console.log('\n📊 Total de estados:', result.length)
    
    // Verificar índices
    const indexes = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'orders'
      AND indexname LIKE 'idx_orders_status%'
      ORDER BY indexname
    `
    
    console.log('\n🔍 Índices de estado:')
    if (indexes.length > 0) {
      indexes.forEach((idx) => {
        console.log(`   ✓ ${idx.indexname}`)
      })
    } else {
      console.log('   ⚠️  No se encontraron índices personalizados')
    }
    
    console.log('\n✅ Verificación completada con éxito!')
    
  } catch (error) {
    console.error('❌ Error verificando estados:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyOrderStatuses()
