// Script para vincular vendedor con comprador
// Vendedor: tucano0109@gmail.com
// Comprador: L3oyucon1978@gmail.com

const { config } = require('dotenv')
const { PrismaClient } = require('@prisma/client')

// Cargar variables de entorno de producción
config({ path: '.env.production', override: true })

async function linkSellerToBuyer() {
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
    console.log('  VINCULANDO VENDEDOR CON COMPRADOR')
    console.log('================================================\n')

    const sellerEmail = 'tucano0109@gmail.com'
    const buyerEmail = 'l3oyucon1978@gmail.com' // Email correcto en minúsculas

    // 1. Buscar el usuario vendedor
    console.log('1. Buscando vendedor...')
    const sellerAuthUser = await prisma.authenticated_users.findUnique({
      where: { email: sellerEmail },
      include: {
        sellers: true
      }
    })

    if (!sellerAuthUser) {
      console.error('❌ No se encontró el usuario vendedor con email:', sellerEmail)
      return
    }

    console.log('✓ Vendedor encontrado:')
    console.log('  - AuthUser ID:', sellerAuthUser.id)
    console.log('  - Email:', sellerAuthUser.email)
    console.log('  - Role:', sellerAuthUser.role)
    console.log('  - Sellers vinculados:', sellerAuthUser.sellers.length)

    if (sellerAuthUser.sellers.length === 0) {
      console.error('❌ Este usuario no tiene un registro de Seller')
      return
    }

    const seller = sellerAuthUser.sellers[0]
    console.log('  - Seller ID:', seller.id)
    console.log('  - Seller Name:', seller.name)

    // 2. Buscar el usuario comprador
    console.log('\n2. Buscando comprador...')
    const buyerAuthUser = await prisma.authenticated_users.findUnique({
      where: { email: buyerEmail },
      include: {
        clients: true
      }
    })

    if (!buyerAuthUser) {
      console.error('❌ No se encontró el usuario comprador con email:', buyerEmail)
      return
    }

    console.log('✓ Comprador encontrado:')
    console.log('  - AuthUser ID:', buyerAuthUser.id)
    console.log('  - Email:', buyerAuthUser.email)
    console.log('  - Role:', buyerAuthUser.role)
    console.log('  - Clients vinculados:', buyerAuthUser.clients.length)

    if (buyerAuthUser.clients.length === 0) {
      console.error('❌ Este usuario no tiene un registro de Client')
      console.log('\n3. Creando registro de Client...')
      
      // Crear el registro de Client
      const newClient = await prisma.client.create({
        data: {
          name: buyerAuthUser.name || 'Cliente',
          email: buyerAuthUser.email,
          address: 'Sin dirección',
          phone: 'Sin teléfono',
          sellerId: seller.id, // Vincular con el vendedor
          authenticated_users: {
            connect: {
              id: buyerAuthUser.id
            }
          }
        }
      })

      console.log('✓ Client creado exitosamente:')
      console.log('  - Client ID:', newClient.id)
      console.log('  - Name:', newClient.name)
      console.log('  - Email:', newClient.email)
      console.log('  - Seller ID:', newClient.sellerId)
      console.log('\n✅ VINCULACIÓN COMPLETADA')
      console.log('================================================')
      return
    }

    // Si ya existe el Client, actualizar su sellerId
    const client = buyerAuthUser.clients[0]
    console.log('  - Client ID:', client.id)
    console.log('  - Client Name:', client.name)
    console.log('  - Seller ID actual:', client.sellerId)

    if (client.sellerId === seller.id) {
      console.log('\n✅ Ya están vinculados correctamente!')
      console.log('================================================')
      return
    }

    // 3. Actualizar la vinculación
    console.log('\n3. Actualizando vinculación...')
    const updatedClient = await prisma.client.update({
      where: { id: client.id },
      data: {
        sellerId: seller.id
      }
    })

    console.log('✓ Vinculación actualizada:')
    console.log('  - Client ID:', updatedClient.id)
    console.log('  - Nuevo Seller ID:', updatedClient.sellerId)

    // 4. Verificar la vinculación
    console.log('\n4. Verificando vinculación...')
    const verification = await prisma.client.findUnique({
      where: { id: client.id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            authenticated_users: {
              select: {
                email: true
              }
            }
          }
        },
        authenticated_users: {
          select: {
            email: true,
            role: true
          }
        }
      }
    })

    console.log('✓ Verificación completa:')
    console.log('  - Client:', verification.name)
    console.log('  - Email Client:', verification.email)
    console.log('  - Vendedor:', verification.seller.name)
    console.log('  - Email Vendedor:', verification.seller.authenticated_users[0]?.email)
    console.log('  - Usuario del Client:', verification.authenticated_users.map(u => u.email).join(', '))

    console.log('\n✅ VINCULACIÓN COMPLETADA EXITOSAMENTE')
    console.log('================================================')

  } catch (error) {
    console.error('\n❌ ERROR:', error.message)
    console.error(error)
  } finally {
    await prisma.$disconnect()
  }
}

linkSellerToBuyer()
