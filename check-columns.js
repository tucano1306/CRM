const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkColumn() {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'clients'
      ORDER BY ordinal_position
    `
    console.log('Columnas en tabla clients:')
    console.table(result)
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}

checkColumn()
