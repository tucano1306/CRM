// Script de diagnóstico para verificar animaciones en órdenes del vendedor
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function diagnosticOrders() {
  try {
    console.log('\n🔍 DIAGNÓSTICO DE ÓRDENES - VENDEDOR\n')
    
    // Obtener todas las órdenes
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        client: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20 // Últimas 20 órdenes
    })

    if (orders.length === 0) {
      console.log('❌ No hay órdenes en la base de datos')
      console.log('💡 Crea algunas órdenes para ver las animaciones')
      return
    }

    console.log(`📊 Total de órdenes encontradas: ${orders.length}\n`)

    // Agrupar por estado
    const byStatus = {}
    orders.forEach(order => {
      if (!byStatus[order.status]) {
        byStatus[order.status] = []
      }
      byStatus[order.status].push(order)
    })

    // Mostrar resumen por estado
    console.log('📈 RESUMEN POR ESTADO:\n')
    
    const animationStates = ['PENDING', 'CONFIRMED', 'PREPARING', 'IN_DELIVERY']
    const completedStates = ['COMPLETED', 'DELIVERED']
    const canceledStates = ['CANCELED', 'CANCELLED']

    let hasAnimationOrders = false
    let hasCompletedOrders = false

    Object.keys(byStatus).forEach(status => {
      const count = byStatus[status].length
      const emoji = animationStates.includes(status) ? '🔄' : 
                    completedStates.includes(status) ? '✅' : 
                    canceledStates.includes(status) ? '❌' : '⚪'
      
      console.log(`${emoji} ${status}: ${count} orden${count !== 1 ? 'es' : ''}`)
      
      if (animationStates.includes(status)) hasAnimationOrders = true
      if (completedStates.includes(status)) hasCompletedOrders = true
    })

    console.log('\n🎬 EFECTOS QUE DEBERÍAS VER:\n')

    if (hasAnimationOrders) {
      console.log('✅ ÓRDENES CON ANIMACIÓN (Pulse + Punto Rojo):')
      animationStates.forEach(status => {
        if (byStatus[status]) {
          console.log(`   • ${status}: ${byStatus[status].length} orden${byStatus[status].length !== 1 ? 'es' : ''}`)
          byStatus[status].slice(0, 3).forEach(order => {
            console.log(`     - ${order.orderNumber} (${order.client.name}) - $${order.totalAmount}`)
          })
        }
      })
    } else {
      console.log('⚠️  NO hay órdenes con estado pendiente/en proceso')
      console.log('   No verás animaciones de pulse ni punto rojo')
    }

    console.log('')

    if (hasCompletedOrders) {
      console.log('✅ ÓRDENES CON STICKER VERDE:')
      completedStates.forEach(status => {
        if (byStatus[status]) {
          console.log(`   • ${status}: ${byStatus[status].length} orden${byStatus[status].length !== 1 ? 'es' : ''}`)
          byStatus[status].slice(0, 3).forEach(order => {
            console.log(`     - ${order.orderNumber} (${order.client.name}) - $${order.totalAmount}`)
          })
        }
      })
    } else {
      console.log('⚠️  NO hay órdenes completadas/entregadas')
      console.log('   No verás el sticker verde "¡Completada!"')
    }

    console.log('\n📝 PASOS PARA VER LAS ANIMACIONES:\n')
    console.log('1. ✅ Asegúrate de tener el servidor corriendo (npm run dev)')
    console.log('2. ✅ Haz hard refresh: Ctrl+Shift+R (Windows) o Cmd+Shift+R (Mac)')
    console.log('3. ✅ Ve a la sección de Órdenes del vendedor')
    console.log('4. ✅ Busca órdenes con los estados mostrados arriba')
    console.log('')
    console.log('🎯 CLASES TAILWIND USADAS:')
    console.log('   • animate-subtle-pulse (tarjeta pulsa cada 3s)')
    console.log('   • animate-ping (punto rojo pulsante)')
    console.log('   • animate-icon-pulse (ícono pulsa cada 2s)')
    console.log('   • animate-bounce-once (sticker rebota al cargar)')
    console.log('')

    if (!hasAnimationOrders && !hasCompletedOrders) {
      console.log('💡 RECOMENDACIÓN: Crea órdenes de prueba con estos estados:')
      console.log('   • PENDING - Para ver animación de pulse')
      console.log('   • COMPLETED - Para ver sticker verde')
      console.log('')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

diagnosticOrders()
