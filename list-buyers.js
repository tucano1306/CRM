// Script para listar todos los usuarios compradores
const { config } = require('dotenv')
const { PrismaClient } = require('@prisma/client')

// Cargar variables de entorno de producción
config({ path: '.env.production', override: true })

async function listBuyers() {
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
    console.log('  LISTANDO USUARIOS COMPRADORES')
    console.log('================================================\n')

    const buyers = await prisma.authenticated_users.findMany({
      where: {
        role: 'CLIENT'
      },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            sellerId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    if (buyers.length === 0) {
      console.log('❌ No se encontraron compradores')
      return
    }

    console.log(`✓ Encontrados ${buyers.length} comprador(es):\n`)

    buyers.forEach((buyer, index) => {
      console.log(`${index + 1}. ${buyer.name || 'Sin nombre'}`)
      console.log(`   - ID: ${buyer.id}`)
      console.log(`   - Email: ${buyer.email}`)
      console.log(`   - Auth ID (Clerk): ${buyer.authId}`)
      console.log(`   - Role: ${buyer.role}`)
      console.log(`   - Creado: ${buyer.createdAt}`)
      
      if (buyer.clients.length > 0) {
        console.log(`   - Clients vinculados: ${buyer.clients.length}`)
        buyer.clients.forEach((client, idx) => {
          console.log(`     ${idx + 1}. ${client.name} (${client.sellerId ? 'Con vendedor' : 'Sin vendedor'})`)
        })
      } else {
        console.log(`   - ❌ Sin registros de Client`)
      }
      console.log('')
    })

    console.log('================================================')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

listBuyers()
