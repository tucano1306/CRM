// Script para diagnosticar qué ve el vendedor
const { config } = require('dotenv')
const { PrismaClient } = require('@prisma/client')

config({ path: '.env.production', override: true })

async function diagnoseSellerView() {
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
    console.log('  DIAGNÓSTICO DE VISTA DEL VENDEDOR')
    console.log('================================================\n')

    const sellerEmail = 'tucano0109@gmail.com'

    // 1. Buscar vendedor
    const sellerAuth = await prisma.authenticated_users.findUnique({
      where: { email: sellerEmail },
      include: {
        sellers: true
      }
    })

    if (!sellerAuth) {
      console.log('❌ Vendedor no encontrado')
      return
    }

    console.log('VENDEDOR:')
    console.log(`  - Nombre: ${sellerAuth.name}`)
    console.log(`  - Email: ${sellerAuth.email}`)
    console.log(`  - Auth ID (Clerk): ${sellerAuth.authId}`)
    console.log(`  - Role: ${sellerAuth.role}`)

    if (sellerAuth.sellers.length === 0) {
      console.log('\n❌ NO tiene registro de Seller')
      return
    }

    const seller = sellerAuth.sellers[0]
    console.log(`\nREGISTRO DE SELLER:`)
    console.log(`  - Seller ID: ${seller.id}`)
    console.log(`  - Name: ${seller.name}`)
    console.log(`  - Email: ${seller.email}`)
    console.log(`  - Active: ${seller.isActive}`)

    // 2. Buscar TODOS los clientes de este vendedor
    console.log(`\n\nCLIENTES DEL VENDEDOR:`)
    const clients = await prisma.client.findMany({
      where: {
        sellerId: seller.id
      },
      include: {
        authenticated_users: {
          select: {
            email: true,
            name: true,
            authId: true,
            role: true
          }
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true
          },
          take: 3
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (clients.length === 0) {
      console.log('  ❌ NO tiene clientes asignados')
      
      // Debug: Verificar si el comprador existe
      console.log('\n\nBUSCANDO AL COMPRADOR:')
      const buyer = await prisma.authenticated_users.findUnique({
        where: { email: 'l3oyucon1978@gmail.com' },
        include: {
          clients: {
            include: {
              seller: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      })

      if (buyer) {
        console.log(`  ✓ Comprador encontrado: ${buyer.email}`)
        if (buyer.clients.length > 0) {
          const client = buyer.clients[0]
          console.log(`  - Client ID: ${client.id}`)
          console.log(`  - Seller ID del cliente: ${client.sellerId}`)
          console.log(`  - Seller ID esperado: ${seller.id}`)
          console.log(`  - ¿Coinciden?: ${client.sellerId === seller.id ? 'SÍ ✓' : 'NO ✗'}`)
          
          if (client.seller) {
            console.log(`  - Vendedor actual: ${client.seller.name} (${client.seller.email})`)
          }
        } else {
          console.log(`  - ❌ El comprador NO tiene registro de Client`)
        }
      } else {
        console.log(`  - ❌ Comprador NO encontrado`)
      }
      
    } else {
      console.log(`  ✓ Tiene ${clients.length} cliente(s):\n`)
      
      clients.forEach((client, idx) => {
        console.log(`  ${idx + 1}. ${client.name}`)
        console.log(`     - Client ID: ${client.id}`)
        console.log(`     - Email: ${client.email}`)
        console.log(`     - Phone: ${client.phone}`)
        console.log(`     - Address: ${client.address}`)
        
        if (client.authenticated_users.length > 0) {
          console.log(`     - Usuarios vinculados: ${client.authenticated_users.length}`)
          client.authenticated_users.forEach((user, uIdx) => {
            console.log(`       ${uIdx + 1}. ${user.name} (${user.email}) - Role: ${user.role}`)
          })
        } else {
          console.log(`     - ⚠️ Sin usuarios autenticados vinculados`)
        }
        
        if (client.orders.length > 0) {
          console.log(`     - Órdenes: ${client.orders.length}`)
          client.orders.forEach((order, oIdx) => {
            console.log(`       ${oIdx + 1}. ${order.orderNumber} - ${order.status} - $${order.totalAmount}`)
          })
        }
        console.log('')
      })
    }

    console.log('================================================')
    console.log('RESUMEN:')
    console.log('================================================')
    console.log(`✓ Vendedor registrado: SÍ`)
    console.log(`✓ Seller ID: ${seller.id}`)
    console.log(`${clients.length > 0 ? '✓' : '❌'} Clientes asignados: ${clients.length}`)
    console.log('================================================\n')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

diagnoseSellerView()
