/**
 * Debug script: Real-time authentication check
 * Verifies actual database state vs what getSeller() returns
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

const userId = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM'

async function debugAuth() {
  console.log('\n🔍 ===== REAL-TIME AUTH DEBUG =====\n')

  try {
    // 1. Check authenticated_users
    console.log('1️⃣ Checking authenticated_users table...')
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: { sellers: true }
    })

    console.log('📊 authenticated_users result:', {
      found: !!authUser,
      id: authUser?.id,
      authId: authUser?.authId,
      email: authUser?.email,
      role: authUser?.role,
      sellersLinked: authUser?.sellers?.length || 0,
      sellers: authUser?.sellers?.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        isActive: s.isActive
      }))
    })

    // 2. Simulate getSeller() query
    console.log('\n2️⃣ Simulating getSeller() query...')
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      },
      include: {
        authenticated_users: true
      }
    })

    console.log('📊 getSeller() simulation result:', {
      found: !!seller,
      sellerId: seller?.id,
      sellerName: seller?.name,
      sellerEmail: seller?.email,
      isActive: seller?.isActive,
      usersLinked: seller?.authenticated_users?.length || 0,
      users: seller?.authenticated_users?.map(u => ({
        id: u.id,
        authId: u.authId,
        email: u.email,
        role: u.role
      }))
    })

    // 3. Check junction table directly
    console.log('\n3️⃣ Checking _SellerUsers junction table...')
    const junctionRecords = await prisma.$queryRaw`
      SELECT * FROM "_SellerUsers"
      WHERE "B" = ${authUser?.id}::uuid
    `

    console.log('📊 Junction table records:', junctionRecords)

    // 4. Final verdict
    console.log('\n' + '='.repeat(60))
    if (seller) {
      console.log('✅ SUCCESS: User IS authorized as seller')
      console.log(`   Seller: ${seller.name} (${seller.id})`)
      console.log(`   Email: ${seller.email}`)
      console.log(`   Active: ${seller.isActive}`)
    } else {
      console.log('❌ FAILURE: User is NOT authorized as seller')
      console.log('   Possible causes:')
      console.log('   1. authenticated_users record missing')
      console.log('   2. Seller record missing')
      console.log('   3. Junction table linkage missing')
      console.log('   4. Prisma client cache issue')
    }
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ Error during debug:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugAuth()
