const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixSellerRelation() {
  try {
    console.log('🔧 Arreglando relación del vendedor...')

    // 1. Crear seller si no existe
    const seller = await prisma.seller.upsert({
      where: { id: '9de9276b-e8b7-4daf-9a94-e4a198875c49' },
      create: {
        id: '9de9276b-e8b7-4daf-9a94-e4a198875c49',
        name: 'Vendedor Principal',
        email: 'vendedor@foodcrm.com',
        phone: '+1555000000',
        isActive: true,
        territory: 'General',
        commission: 5.0,
      },
      update: {},
    })

    console.log('✅ Seller created/found:', seller.id)

    // 2. Obtener authenticated_user
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: 'user_33qmrSWlEDyZhiWqGuF7T27b1OM' },
    })

    if (!authUser) {
      console.log('❌ Authenticated user not found')
      return
    }

    console.log('✅ Auth user found:', authUser.id)

    // 3. Conectar authenticated_user con seller
    await prisma.authenticated_users.update({
      where: { id: authUser.id },
      data: {
        sellers: {
          connect: { id: seller.id }
        }
      }
    })

    console.log('✅ Relación creada exitosamente!')

    // 4. Verificar
    const updatedAuth = await prisma.authenticated_users.findUnique({
      where: { id: authUser.id },
      include: {
        sellers: true,
        clients: true
      }
    })

    console.log('📊 Verificación:')
    console.log('  - Auth User:', updatedAuth.email)
    console.log('  - Role:', updatedAuth.role)
    console.log('  - Sellers count:', updatedAuth.sellers.length)
    console.log('  - Clients count:', updatedAuth.clients.length)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixSellerRelation()
