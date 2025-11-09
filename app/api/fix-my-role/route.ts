import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Obtener el usuario completo
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    
    const currentRole = user.publicMetadata?.role
    
    const info = {
      userId: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      name: `${user.firstName} ${user.lastName}`,
      currentRole: currentRole || 'NO_ROLE',
      publicMetadata: user.publicMetadata,
    }
    
    console.log('🔍 User info:', info)
    
    // Si no tiene rol, asignar SELLER
    if (!currentRole) {
      console.log('⚠️  User has no role, assigning SELLER...')
      
      await client.users.updateUser(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          role: 'SELLER'
        }
      })
      
      return NextResponse.json({
        ...info,
        message: '✅ Role SELLER assigned! Please sign out and sign in again.',
        action: 'ROLE_ASSIGNED'
      })
    }
    
    return NextResponse.json({
      ...info,
      message: '✅ User already has a role'
    })
    
  } catch (error: any) {
    console.error('❌ Error:', error)
    return NextResponse.json({ 
      error: error.message,
      details: error.errors 
    }, { status: 500 })
  }
}
