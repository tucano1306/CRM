// Script para corregir órdenes con status NULL
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixNullStatuses() {
  try {
    console.log('🔍 Verificando órdenes con status NULL...\n')
    
    // Usar executeRaw directamente para actualizar
    console.log('🔧 Actualizando órdenes con status NULL a PENDING...')
    
    const result = await prisma.$executeRaw`
      UPDATE orders
      SET status = 'PENDING', "updatedAt" = NOW()
      WHERE status IS NULL
    `
    
    console.log(`✅ ${result} órdenes actualizadas exitosamente\n`)
    
    if (result > 0) {
      console.log(`📊 Total de órdenes corregidas: ${result}`)
      console.log('✅ ¡Todas las órdenes ahora tienen status = PENDING!')
    } else {
      console.log('✅ No se encontraron órdenes con status NULL')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixNullStatuses()
  .then(() => {
    console.log('\n✅ Script completado exitosamente')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando script:', error)
    process.exit(1)
  })
