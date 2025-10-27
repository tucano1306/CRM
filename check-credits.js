// Verificar créditos en base de datos
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkCredits() {
  try {
    const credits = await prisma.creditNote.findMany({
      where: {
        isActive: true,
        balance: { gt: 0 }
      },
      include: {
        client: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('\n💳 CRÉDITOS ACTIVOS EN BASE DE DATOS:\n')
    console.log(`Total: ${credits.length}\n`)
    
    credits.forEach((credit, i) => {
      console.log(`${i + 1}. ${credit.creditNoteNumber}`)
      console.log(`   Cliente: ${credit.client?.name || 'N/A'}`)
      console.log(`   Balance: $${credit.balance}`)
      console.log(`   Cliente ID: ${credit.clientId}`)
      console.log(`   Activa: ${credit.isActive}`)
      console.log('')
    })
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkCredits()
