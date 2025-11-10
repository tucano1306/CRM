/**
 * EMERGENCY FIX: Delete wrong authenticated_users and create correct one
 * POST /api/debug/fix-auth-emergency
 */

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

// Use shared prisma singleton

async function fixAuthIssue() {
  try {
    const { userId } = await auth()
  const hdrs = await headers()
    const providedSecret = hdrs.get('x-admin-secret')
    const allowedUser = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM'
    const secretOk = !!process.env.ADMIN_MAINTENANCE_SECRET && providedSecret === process.env.ADMIN_MAINTENANCE_SECRET
    const userOk = userId === allowedUser

    if (!userId || !(secretOk || userOk)) {
      return NextResponse.json({
        error: 'Unauthorized - This endpoint is restricted'
      }, { status: 403 })
    }

    const WRONG_ID = '5d8f8f5d-43d1-435d-978b-39f254fb9846'
    const TARGET_AUTH_ID = 'user_33qmrSWlEDyZhiWqGuF7T27b1OM'

    console.log('🚨 EMERGENCY FIX STARTED')

    // Step 1: Delete the wrong authenticated_users record
    console.log('Step 1: Deleting wrong record...')
    const deleted = await prisma.authenticated_users.delete({
      where: { id: WRONG_ID }
    }).catch(() => null)

    console.log('Deleted:', deleted ? 'SUCCESS' : 'NOT FOUND')

    // Step 2: Check if correct record exists
    console.log('Step 2: Checking for existing correct record...')
    let authUser = await prisma.authenticated_users.findFirst({
      where: { authId: TARGET_AUTH_ID },
      include: { sellers: true }
    })

    // Step 3: Create correct record if it doesn't exist
    if (!authUser) {
      console.log('Step 3: Creating correct authenticated_users record...')
      const crypto = require('crypto')
      const newId = crypto.randomUUID()

      const created = await prisma.authenticated_users.create({
        data: {
          id: newId,
          authId: TARGET_AUTH_ID,
          email: 'tucano0109@gmail.com',
          name: 'Leo Leo',
          role: 'SELLER',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      
      // Fetch with include
      const fetched = await prisma.authenticated_users.findUnique({
        where: { id: created.id },
        include: { sellers: true }
      })
      
      if (!fetched) {
        throw new Error('Failed to create authenticated_users')
      }
      
      authUser = fetched
      console.log('Created auth user:', created.id)
    }

    // Step 4: Check if seller exists
    console.log('Step 4: Checking for seller record...')
    let seller = await prisma.seller.findFirst({
      where: { email: 'tucano0109@gmail.com' }
    })

    // Step 5: Create seller if it doesn't exist
    if (!seller) {
      console.log('Step 5: Creating seller record...')
      seller = await prisma.seller.create({
        data: {
          name: 'Leo Leo',
          email: 'tucano0109@gmail.com',
          isActive: true,
          authenticated_users: {
            connect: { id: authUser.id }
          }
        }
      })
      console.log('Created seller:', seller.id)
    } else {
      // Link existing seller to auth user if not linked
      const isLinked = await prisma.$queryRaw<Array<any>>`
        SELECT * FROM "_SellerUsers"
        WHERE "A" = ${seller.id}::uuid AND "B" = ${authUser.id}::uuid
      `

      if (isLinked.length === 0) {
        console.log('Step 5b: Linking seller to auth user...')
        await prisma.$executeRaw`
          INSERT INTO "_SellerUsers" ("A", "B")
          VALUES (${seller.id}::uuid, ${authUser.id}::uuid)
        `
        console.log('Linked successfully')
      }
    }

    // Step 6: Verify the fix
    const verification = await prisma.authenticated_users.findFirst({
      where: { authId: TARGET_AUTH_ID },
      include: { sellers: true }
    })

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      actions: {
        deletedWrongRecord: !!deleted,
        authUserExists: !!verification,
        sellersLinked: verification?.sellers?.length || 0
      },
      verification: {
        id: verification?.id,
        authId: verification?.authId,
        email: verification?.email,
        role: verification?.role,
        sellers: verification?.sellers?.map(s => ({
          id: s.id,
          name: s.name,
          email: s.email
        }))
      }
    }

    console.log('🎉 EMERGENCY FIX COMPLETED:', result)

    return NextResponse.json(result, { status: 200 })

  } catch (error) {
    console.error('❌ EMERGENCY FIX FAILED:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  } finally {
    // prisma singleton
  }
}

export async function POST() {
  return fixAuthIssue()
}
