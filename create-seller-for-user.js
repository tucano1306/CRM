/**
 * Script para crear un Seller y vincularlo al authenticated_user
 * 
 * Ejecutar con: node create-seller-for-user.js
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createSellerForUser() {
  try {
    const authId = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM'
    const email = 'tucano0109@gmail.com'
    
    console.log('🔍 Buscando authenticated_user...')
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId },
      include: { sellers: true }
    })
    
    if (!authUser) {
      console.error('❌ No se encontró el authenticated_user')
      return
    }
    
    console.log('✅ Usuario encontrado:', {
      id: authUser.id,
      email: authUser.email,
      role: authUser.role,
      sellersCount: authUser.sellers.length
    })
    
    if (authUser.sellers.length > 0) {
      console.log('⚠️  El usuario ya tiene sellers vinculados:')
      authUser.sellers.forEach(s => {
        console.log(`   - ${s.name} (${s.email})`)
      })
      return
    }
    
    console.log('\n📝 Creando nuevo Seller...')
    const seller = await prisma.seller.create({
      data: {
        name: authUser.name || 'Vendedor Principal',
        email: authUser.email,
        phone: authUser.phone,
        isActive: true,
        authenticated_users: {
          connect: { id: authUser.id }
        }
      },
      include: {
        authenticated_users: true
      }
    })
    
    console.log('✅ Seller creado exitosamente:', {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      linkedUsers: seller.authenticated_users.length
    })
    
    console.log('\n🔗 Verificando vinculación...')
    const verifyUser = await prisma.authenticated_users.findFirst({
      where: { authId },
      include: { sellers: true }
    })
    
    console.log('✅ Verificación completa:', {
      userId: verifyUser.id,
      sellersCount: verifyUser.sellers.length,
      sellers: verifyUser.sellers.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email
      }))
    })
    
    console.log('\n✅ ¡Proceso completado! El usuario ahora puede acceder como seller.')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSellerForUser()
