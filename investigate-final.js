/**
 * FINAL INVESTIGATION: Query database directly for ALL records
 * Find out why raw query returns phantom ID
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
})

const TARGET_AUTH_ID = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM'
const PHANTOM_ID = '5d8f8f5d-43d1-435d-978b-39f254fb9846'
const CORRECT_ID = '3c53ef0d-4d2b-4f75-bd83-1b075d47278d'

async function investigateDatabase() {
  console.log('\n🔍 ===== FINAL DATABASE INVESTIGATION =====\n')

  try {
    // 1. Raw SQL query (exactly like production)
    console.log('1️⃣ Raw SQL query (same as production code)...')
    const rawResult = await prisma.$queryRaw`
      SELECT id, "authId", email, role::text
      FROM authenticated_users
      WHERE "authId" = ${TARGET_AUTH_ID}
      LIMIT 1
    `
    
    console.log('📊 Raw query result:', {
      count: rawResult.length,
      data: rawResult
    })

    // 2. Find ALL records with this authId
    console.log('\n2️⃣ Find ALL authenticated_users with this authId...')
    const allMatches = await prisma.authenticated_users.findMany({
      where: { authId: TARGET_AUTH_ID }
    })
    
    console.log('📊 All matching records:', {
      count: allMatches.length,
      records: allMatches.map(r => ({
        id: r.id,
        authId: r.authId,
        email: r.email,
        role: r.role,
        createdAt: r.createdAt
      }))
    })

    // 3. Check for phantom ID
    console.log('\n3️⃣ Check for phantom ID directly...')
    const phantomExists = await prisma.authenticated_users.findUnique({
      where: { id: PHANTOM_ID }
    })
    
    console.log('📊 Phantom ID check:', {
      exists: !!phantomExists,
      data: phantomExists ? {
        id: phantomExists.id,
        authId: phantomExists.authId,
        email: phantomExists.email,
        role: phantomExists.role
      } : null
    })

    // 4. Check for correct ID
    console.log('\n4️⃣ Check for correct ID directly...')
    const correctExists = await prisma.authenticated_users.findUnique({
      where: { id: CORRECT_ID }
    })
    
    console.log('📊 Correct ID check:', {
      exists: !!correctExists,
      data: correctExists ? {
        id: correctExists.id,
        authId: correctExists.authId,
        email: correctExists.email,
        role: correctExists.role
      } : null
    })

    // 5. List ALL authenticated_users (limit 10)
    console.log('\n5️⃣ List ALL authenticated_users...')
    const allUsers = await prisma.authenticated_users.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    })
    
    console.log('📊 All users (recent 10):', {
      count: allUsers.length,
      users: allUsers.map(u => ({
        id: u.id,
        authId: u.authId,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt
      }))
    })

    // 6. Raw SQL: Get EVERYTHING with this email
    console.log('\n6️⃣ Raw SQL: ALL records with email tucano0109@gmail.com...')
    const emailResults = await prisma.$queryRaw`
      SELECT id, "authId", email, role::text, "createdAt"
      FROM authenticated_users
      WHERE email = 'tucano0109@gmail.com'
      ORDER BY "createdAt" DESC
    `
    
    console.log('📊 Email search results:', emailResults)

    console.log('\n' + '='.repeat(60))
    console.log('🎯 CONCLUSION:')
    if (rawResult.length > 0 && rawResult[0].id === PHANTOM_ID) {
      console.log('❌ PHANTOM ID EXISTS IN DATABASE')
      console.log('   The "deleted" record is actually still there!')
      console.log('   Need to DELETE it for real this time')
    } else if (rawResult.length > 0 && rawResult[0].id === CORRECT_ID) {
      console.log('✅ CORRECT ID FOUND')
      console.log('   Database is correct, problem is elsewhere')
    } else {
      console.log('⚠️  UNEXPECTED RESULT')
      console.log('   Neither phantom nor correct ID found')
    }
    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

investigateDatabase()
