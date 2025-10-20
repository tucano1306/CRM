import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'

export async function GET() {
  const { userId } = await auth()
  const user = await currentUser()
  
  return NextResponse.json({
    clerkUserId: userId,
    email: user?.emailAddresses[0]?.emailAddress,
    name: `${user?.firstName} ${user?.lastName}`,
    role: user?.publicMetadata?.role || 'No role'
  })
}
