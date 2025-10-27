const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createTestReturn() {
  try {
    // Primero buscar el cliente
    const client = await prisma.client.findFirst({
      where: {
        email: 'l3oyucon1978@gmail.com'
      }
    })

    if (!client) {
      console.log('❌ No se encontró el cliente')
      return
    }

    console.log('👤 Cliente encontrado:', client.name)

    // Buscar una orden del cliente para crear la devolución
    const order = await prisma.order.findFirst({
      where: {
        clientId: client.id,
        status: 'COMPLETED'
      },
      include: {
        client: true,
        seller: true,
        orderItems: {
          take: 1,
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      console.log('❌ No se encontró una orden completada del cliente')
      return
    }

    console.log('📦 Orden encontrada:', order.orderNumber)

    const randomString = Math.random().toString(36).substring(2, 9).toUpperCase()
    const returnNumber = `RET-TEST-${Date.now()}${randomString}`
    const creditNoteNumber = `CN-TEST-${Date.now()}-${randomString}`

    // Crear devolución de prueba con crédito SIN USAR
    const newReturn = await prisma.$transaction(async (tx) => {
      const ret = await tx.return.create({
        data: {
          returnNumber: returnNumber,
          orderId: order.id,
          clientId: order.clientId,
          sellerId: order.sellerId,
          status: 'APPROVED',
          reason: 'DAMAGED_PRODUCT',
          reasonDescription: 'Devolución de PRUEBA para testing - Producto dañado',
          refundType: 'CREDIT',
          totalReturnAmount: 50.00,
          restockFee: 0,
          finalRefundAmount: 50.00,
          notes: '⚠️ DEVOLUCIÓN DE PRUEBA - Crédito SIN USAR para testing',
          isManual: true,
          approvedAt: new Date()
        }
      })

      // Crear item de devolución
      await tx.returnItem.create({
        data: {
          return: {
            connect: { id: ret.id }
          },
          orderItem: {
            connect: { id: order.orderItems[0].id }
          },
          product: {
            connect: { id: order.orderItems[0].productId }
          },
          productName: order.orderItems[0].product.name,
          quantityReturned: 1,
          pricePerUnit: 50.00,
          subtotal: 50.00,
          restocked: false
        }
      })

      // Crear nota de crédito SIN USAR
      const creditNote = await tx.creditNote.create({
        data: {
          creditNoteNumber: creditNoteNumber,
          returnId: ret.id,
          clientId: order.clientId,
          sellerId: order.sellerId,
          amount: 50.00,
          balance: 50.00,  // ✅ BALANCE = AMOUNT (sin usar)
          usedAmount: 0,     // ✅ NO USADO
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true
        }
      })

      // Notificar al cliente
      await tx.notification.create({
        data: {
          type: 'CREDIT_NOTE_ISSUED',
          title: '🧪 Crédito de Prueba Generado',
          message: `Se creó una devolución de PRUEBA ${ret.returnNumber} con crédito de $50.00 SIN USAR. Puedes cambiar entre CRÉDITO y REEMBOLSO libremente.`,
          clientId: order.clientId,
          relatedId: ret.id,
          isRead: false
        }
      })

      return { ret, creditNote }
    })

    console.log('\n✅ DEVOLUCIÓN DE PRUEBA CREADA:')
    console.log('═══════════════════════════════════════')
    console.log('Return Number:', newReturn.ret.returnNumber)
    console.log('Credit Note:', newReturn.creditNote.creditNoteNumber)
    console.log('Amount: $50.00')
    console.log('Balance: $50.00 (SIN USAR)')
    console.log('Status: APPROVED')
    console.log('Refund Type: CREDIT')
    console.log('\n🎯 AHORA PUEDES:')
    console.log('1. Ir a /buyer/returns')
    console.log('2. Buscar:', newReturn.ret.returnNumber)
    console.log('3. Hacer clic en 💰 Reembolso para cambiar a REFUND')
    console.log('4. O dejarlo en CREDIT y hacer clic en 💰 Reembolso')
    console.log('═══════════════════════════════════════\n')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestReturn()
