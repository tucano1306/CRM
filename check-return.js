const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkReturn() {
  try {
    const ret = await prisma.return.findFirst({
      where: {
        order: {
          orderNumber: 'ORD-1761429996944'
        }
      },
      include: {
        creditNote: true,
        order: {
          select: {
            orderNumber: true,
            totalAmount: true
          }
        }
      }
    })

    if (!ret) {
      console.log('❌ No se encontró devolución para ORD-1761429996944')
      return
    }

    console.log('\n📋 DEVOLUCIÓN ENCONTRADA:')
    console.log('═══════════════════════════════════════')
    console.log('Return Number:', ret.returnNumber)
    console.log('Status:', ret.status)
    console.log('Refund Type:', ret.refundType)
    console.log('Final Refund Amount:', ret.finalRefundAmount)
    console.log('\n💳 CRÉDITO ASOCIADO:')
    if (ret.creditNote) {
      console.log('Credit Note Number:', ret.creditNote.creditNoteNumber)
      console.log('Amount:', ret.creditNote.amount)
      console.log('Balance:', ret.creditNote.balance)
      console.log('Used Amount:', ret.creditNote.usedAmount)
      console.log('Is Active:', ret.creditNote.isActive)
      console.log('\n✅ Estado: ' + (ret.creditNote.balance === ret.creditNote.amount ? 'NO USADO (puede cambiarse)' : 'PARCIALMENTE USADO (NO puede cambiarse)'))
    } else {
      console.log('❌ No hay nota de crédito asociada')
    }
    console.log('═══════════════════════════════════════\n')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkReturn()
