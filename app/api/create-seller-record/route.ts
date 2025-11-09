import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    console.log('🔍 Creating seller record for:', userId)
    
    // Verificar authenticated_users
    let authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { sellers: true }
    })
    
    if (!authUser) {
      console.log('⚠️  Creating authenticated_users record...')
      authUser = await prisma.authenticated_users.create({
        data: {
          id: crypto.randomUUID(),
          authId: userId,
          name: 'Leo Leo',
          email: 'tucano0109@gmail.com',
          role: 'SELLER',
          updatedAt: new Date()
        },
        include: { sellers: true }
      })
    }
    
    // Verificar si ya tiene un seller vinculado
    if (authUser.sellers && authUser.sellers.length > 0) {
      return NextResponse.json({
        success: true,
        message: '✅ Seller record already exists',
        seller: {
          id: authUser.sellers[0].id,
          name: authUser.sellers[0].name,
          email: authUser.sellers[0].email
        }
      })
    }
    
    // Crear seller y vincularlo
    console.log('⚠️  Creating seller record...')
    const seller = await prisma.seller.create({
      data: {
        name: 'Leo Leo',
        email: 'tucano0109@gmail.com',
        phone: '',
        authenticated_users: {
          connect: { authId: userId }
        }
      }
    })
      
    return NextResponse.json({
      success: true,
      message: '✅ Seller record created! Please refresh the page.',
      seller: {
        id: seller.id,
        name: seller.name,
        email: seller.email
      }
    })
    
  } catch (error: any) {
    console.error('❌ Error:', error)
    return NextResponse.json({ 
      error: error.message,
      details: error 
    }, { status: 500 })
  }
}
