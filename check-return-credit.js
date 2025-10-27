// Verificar devolución y nota de crédito
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkReturn() {
  try {
    const returnNumber = 'RET-1761522175707T4UPEALRY'
    
    console.log(`\n🔍 Buscando devolución: ${returnNumber}\n`)
    
    const returnRecord = await prisma.return.findFirst({
      where: { returnNumber },
      include: {
        client: { select: { name: true } },
        creditNote: true
      }
    })
    
    if (!returnRecord) {
      console.log('❌ Devolución no encontrada')
      return
    }
    
    console.log('📦 DEVOLUCIÓN:')
    console.log('  ID:', returnRecord.id)
    console.log('  Estado:', returnRecord.status)
    console.log('  Tipo de reembolso:', returnRecord.refundType)
    console.log('  Monto final:', returnRecord.finalRefundAmount)
    console.log('  Cliente:', returnRecord.client?.name)
    console.log('  Aprobado por:', returnRecord.approvedBy)
    console.log('  Aprobado en:', returnRecord.approvedAt)
    
    console.log('\n💳 NOTA DE CRÉDITO:')
    if (returnRecord.creditNote) {
      console.log('  ✅ Existe')
      console.log('  Número:', returnRecord.creditNote.creditNoteNumber)
      console.log('  Monto:', returnRecord.creditNote.amount)
      console.log('  Balance disponible:', returnRecord.creditNote.balance)
      console.log('  Activa:', returnRecord.creditNote.isActive)
      console.log('  Cliente ID:', returnRecord.creditNote.clientId)
    } else {
      console.log('  ❌ No existe')
      console.log('\n  Razón posible:')
      console.log('  - Tipo de reembolso es:', returnRecord.refundType)
      console.log('  - Debería ser "CREDIT" para crear nota de crédito')
    }
    
    // Buscar todas las notas de crédito del cliente
    console.log('\n📋 TODAS LAS NOTAS DE CRÉDITO DEL CLIENTE:')
    const allCredits = await prisma.creditNote.findMany({
      where: { clientId: returnRecord.clientId },
      orderBy: { createdAt: 'desc' }
    })
    
    if (allCredits.length === 0) {
      console.log('  ❌ El cliente no tiene ninguna nota de crédito')
    } else {
      allCredits.forEach((credit, index) => {
        console.log(`\n  ${index + 1}. ${credit.creditNoteNumber}`)
        console.log('     Monto:', credit.amount)
        console.log('     Balance:', credit.balance)
        console.log('     Activa:', credit.isActive)
        console.log('     Devolución ID:', credit.returnId)
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkReturn()
