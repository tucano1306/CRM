require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

/**
 * Script para registrar usuarios de TEST en la base de datos
 * Crea registros en authenticated_users, client y seller
 */

async function registerTestUsers() {
  try {
    console.log('\n📊 Registrando usuarios de TEST en la base de datos...\n')

    const testUsers = [
      {
        authId: 'user_34ntQ0vUP877GhFMJD5lDp4Y1Ah',
        email: 'test-client@crm-test.com',
        name: 'Test Client',
        role: 'CLIENT'
      },
      {
        authId: 'user_34ntQ8SL932KGwfRSSRM2rD0ACy',
        email: 'test-seller@crm-test.com',
        name: 'Test Seller',
        role: 'SELLER'
      }
    ]

    // 1. Registrar en authenticated_users
    for (const user of testUsers) {
      console.log(`📧 Procesando: ${user.email}`)

      // Verificar si ya existe
      const existing = await prisma.authenticated_users.findUnique({
        where: { authId: user.authId }
      })

      if (!existing) {
        await prisma.authenticated_users.create({
          data: {
            id: crypto.randomUUID(),
            authId: user.authId,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        })
        console.log(`   ✅ Registrado en authenticated_users`)
      } else {
        console.log(`   ℹ️  Ya existe en authenticated_users`)
      }
    }

    // 2. Para TEST: Los usuarios solo necesitan estar en authenticated_users
    // No es necesario crear registros en client/seller para tests E2E básicos
    // Los tests solo verifican autenticación y navegación

    console.log('\n✅ Usuarios de TEST registrados en la base de datos')
    console.log('\n📋 Resumen:')
    console.log('   • test-client@crm-test.com → Registrado como CLIENT')
    console.log('   • test-seller@crm-test.com → Registrado como SELLER')
    console.log('\n🎯 Estos usuarios están listos para tests E2E')
    console.log('   Los tests solo verifican autenticación y rutas')
    console.log('   No requieren datos de client/seller para funcionar\n')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

registerTestUsers()
