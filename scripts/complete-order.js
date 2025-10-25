const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function completeOrder() {
  try {
    console.log('🔍 Buscando órdenes pendientes...')
    
    // Obtener la orden más reciente que esté PENDING
    const pendingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { status: 'PENDING' },
          { status: 'CONFIRMED' }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        client: true,
        seller: true
      }
    })

    if (!pendingOrder) {
      console.log('❌ No se encontraron órdenes pendientes')
      return
    }

    console.log('📦 Orden encontrada:', {
      id: pendingOrder.id,
      orderNumber: pendingOrder.orderNumber,
      status: pendingOrder.status,
      totalAmount: pendingOrder.totalAmount,
      client: pendingOrder.client?.name || 'N/A'
    })

    // Actualizar a COMPLETED
    const updated = await prisma.order.update({
      where: { id: pendingOrder.id },
      data: { 
        status: 'COMPLETED',
        updatedAt: new Date()
      }
    })

    console.log('✅ Orden marcada como COMPLETED:', {
      id: updated.id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      totalAmount: updated.totalAmount
    })

    console.log('\n💰 Ahora el "Total Gastado" debería mostrar:', updated.totalAmount)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

completeOrder()
