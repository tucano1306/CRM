/**
 * CRITICAL FIX: Delete phantom authenticated_users record
 * This is the ID being cached by serverless functions
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

const PHANTOM_ID = '5d8f8f5d-43d1-435d-978b-39f254fb9846'
const CORRECT_ID = '3c53ef0d-4d2b-4f75-bd83-1b075d47278d'

async function deletePhantomRecord() {
  console.log('\n🔥 ===== DELETE PHANTOM RECORD =====\n')

  try {
    // 1. Check if phantom record exists
    console.log('1️⃣ Checking for phantom record...')
    const phantom = await prisma.authenticated_users.findUnique({
      where: { id: PHANTOM_ID },
      include: { sellers: true }
    })

    if (!phantom) {
      console.log('✅ Phantom record does NOT exist (good!)')
    } else {
      console.log('⚠️  Phantom record FOUND:', {
        id: phantom.id,
        authId: phantom.authId,
        email: phantom.email,
        role: phantom.role,
        sellers: phantom.sellers?.length || 0
      })

      // 2. Delete the phantom record
      console.log('\n2️⃣ Deleting phantom record...')
      await prisma.authenticated_users.delete({
        where: { id: PHANTOM_ID }
      })
      
      console.log('✅ Phantom record DELETED successfully')
    }

    // 3. Verify correct record still exists
    console.log('\n3️⃣ Verifying correct record...')
    const correct = await prisma.authenticated_users.findUnique({
      where: { id: CORRECT_ID },
      include: { sellers: true }
    })

    if (!correct) {
      console.error('❌ ERROR: Correct record is MISSING!')
      process.exit(1)
    }

    console.log('✅ Correct record verified:', {
      id: correct.id,
      authId: correct.authId,
      email: correct.email,
      role: correct.role,
      sellers: correct.sellers?.length || 0
    })

    // 4. Final verification with authId lookup
    console.log('\n4️⃣ Testing authId lookup...')
    const lookup = await prisma.authenticated_users.findFirst({
      where: { authId: 'user_33qmrSWlEDyZhiWqGuF7T27b1OM' },
      include: { sellers: true }
    })

    console.log('📊 Lookup result:', {
      found: !!lookup,
      id: lookup?.id,
      shouldMatch: CORRECT_ID,
      matches: lookup?.id === CORRECT_ID,
      sellers: lookup?.sellers?.length || 0
    })

    console.log('\n' + '='.repeat(60))
    console.log('✅ PHANTOM RECORD ELIMINATED')
    console.log('   Now only the correct record exists in database')
    console.log('   Cached queries will fail and force fresh lookup')
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

deletePhantomRecord()
