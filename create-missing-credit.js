// Crear nota de crédito manualmente para devolución aprobada
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createCreditNote() {
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
    
    if (returnRecord.creditNote) {
      console.log('⚠️  Esta devolución ya tiene una nota de crédito:', returnRecord.creditNote.creditNoteNumber)
      return
    }
    
    if (returnRecord.refundType !== 'CREDIT') {
      console.log('⚠️  Esta devolución no es de tipo CREDIT, es:', returnRecord.refundType)
      return
    }
    
    console.log('📦 Devolución encontrada:')
    console.log('  Cliente:', returnRecord.client?.name)
    console.log('  Monto:', returnRecord.finalRefundAmount)
    console.log('  Estado:', returnRecord.status)
    
    console.log('\n💳 Creando nota de crédito...')
    
    const creditNoteNumber = `CN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    
    const creditNote = await prisma.creditNote.create({
      data: {
        creditNoteNumber,
        returnId: returnRecord.id,
        clientId: returnRecord.clientId,
        sellerId: returnRecord.sellerId,
        amount: Number(returnRecord.finalRefundAmount),
        balance: Number(returnRecord.finalRefundAmount),
        usedAmount: 0,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
        isActive: true,
        notes: `Crédito por devolución ${returnRecord.returnNumber}`
      }
    })
    
    console.log('✅ Nota de crédito creada exitosamente!')
    console.log('  Número:', creditNote.creditNoteNumber)
    console.log('  Monto:', creditNote.amount)
    console.log('  Balance disponible:', creditNote.balance)
    console.log('  Expira:', creditNote.expiresAt)
    
    console.log('\n🔔 Creando notificación para el cliente...')
    
    await prisma.notification.create({
      data: {
        type: 'CREDIT_NOTE_ISSUED',
        title: '💳 Crédito a tu Favor',
        message: `Se ha emitido un crédito de $${Number(returnRecord.finalRefundAmount).toFixed(2)} por tu devolución ${returnRecord.returnNumber}. Puedes usarlo en tu próxima compra.`,
        clientId: returnRecord.clientId,
        relatedId: creditNote.id,
        orderId: returnRecord.orderId,
        isRead: false
      }
    })
    
    console.log('✅ Notificación creada exitosamente!')
    console.log('\n🎉 ¡Proceso completado! El cliente ahora verá su crédito disponible.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createCreditNote()
