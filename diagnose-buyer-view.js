// Script para diagnosticar qué ve el comprador
const { config } = require('dotenv')
const { PrismaClient } = require('@prisma/client')

config({ path: '.env.production', override: true })

async function diagnoseBuyerView() {
  const prisma = new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  })

  try {
    console.log('================================================')
    console.log('  DIAGNÓSTICO DE VISTA DEL COMPRADOR')
    console.log('================================================\n')

    const buyerEmail = 'l3oyucon1978@gmail.com'

    // 1. Buscar comprador
    const buyer = await prisma.authenticated_users.findUnique({
      where: { email: buyerEmail },
      include: {
        clients: {
          include: {
            seller: true
          }
        }
      }
    })

    if (!buyer) {
      console.log('❌ Comprador no encontrado')
      return
    }

    console.log('COMPRADOR:')
    console.log(`  - Nombre: ${buyer.name}`)
    console.log(`  - Email: ${buyer.email}`)
    console.log(`  - Auth ID (Clerk): ${buyer.authId}`)
    console.log(`  - Role: ${buyer.role}`)

    if (buyer.clients.length === 0) {
      console.log('\n❌ NO tiene registro de Client')
      return
    }

    const client = buyer.clients[0]
    console.log(`\nREGISTRO DE CLIENT:`)
    console.log(`  - Client ID: ${client.id}`)
    console.log(`  - Name: ${client.name}`)
    console.log(`  - Email: ${client.email}`)
    console.log(`  - Seller ID: ${client.sellerId}`)

    if (!client.seller) {
      console.log('\n❌ NO tiene vendedor asignado')
      return
    }

    console.log(`\nVENDEDOR ASIGNADO:`)
    console.log(`  - Seller ID: ${client.seller.id}`)
    console.log(`  - Name: ${client.seller.name}`)
    console.log(`  - Email: ${client.seller.email}`)
    console.log(`  - Active: ${client.seller.isActive}`)

    // 2. Verificar productos del vendedor
    console.log(`\n\nPRODUCTOS DEL VENDEDOR:`)
    const products = await prisma.productSeller.findMany({
      where: {
        sellerId: client.sellerId
      },
      include: {
        product: true
      },
      take: 5
    })

    if (products.length === 0) {
      console.log('  ❌ El vendedor NO tiene productos')
    } else {
      console.log(`  ✓ Tiene ${products.length} producto(s) (mostrando 5):`)
      products.forEach((ps, idx) => {
        console.log(`    ${idx + 1}. ${ps.product.name} - $${ps.product.price}`)
        console.log(`       SKU: ${ps.product.sku || 'N/A'} | Active: ${ps.product.isActive}`)
      })
    }

    // 3. Verificar órdenes del comprador
    console.log(`\n\nÓRDENES DEL COMPRADOR:`)
    const orders = await prisma.order.findMany({
      where: {
        clientId: client.id
      },
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (orders.length === 0) {
      console.log('  ❌ No tiene órdenes')
    } else {
      console.log(`  ✓ Tiene ${orders.length} orden(es):`)
      orders.forEach((order, idx) => {
        console.log(`    ${idx + 1}. ${order.orderNumber} - Status: ${order.status} - $${order.totalAmount}`)
      })
    }

    // 4. Verificar carrito
    console.log(`\n\nCARRITO:`)
    const cartItems = await prisma.cartItem.findMany({
      where: {
        userId: buyer.authId
      },
      include: {
        product: true
      }
    })

    if (cartItems.length === 0) {
      console.log('  ✓ Carrito vacío')
    } else {
      console.log(`  ✓ Tiene ${cartItems.length} item(s) en el carrito:`)
      cartItems.forEach((item, idx) => {
        console.log(`    ${idx + 1}. ${item.product.name} x${item.quantity}`)
      })
    }

    console.log('\n================================================')
    console.log('RESUMEN:')
    console.log('================================================')
    console.log(`✓ Comprador registrado: SÍ`)
    console.log(`✓ Tiene Client: SÍ`)
    console.log(`✓ Tiene Vendedor: SÍ (${client.seller.name})`)
    console.log(`${products.length > 0 ? '✓' : '❌'} Vendedor tiene productos: ${products.length > 0 ? 'SÍ' : 'NO'}`)
    console.log(`${orders.length > 0 ? '✓' : '❌'} Tiene órdenes: ${orders.length > 0 ? 'SÍ' : 'NO'}`)
    console.log('================================================\n')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseBuyerView()
