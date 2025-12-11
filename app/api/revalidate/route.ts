// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { auth } from '@clerk/nextjs/server'

// Helper: Check authorization
async function checkAuthorization(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  const revalidateSecret = process.env.REVALIDATE_SECRET
  
  // Check by secret (webhooks)
  if (revalidateSecret && authHeader === `Bearer ${revalidateSecret}`) {
    return true
  }
  
  // Check by auth (authenticated users)
  const { userId } = await auth()
  return !!userId
}

// Helper: Process revalidation by type
function processRevalidation(type: string, path?: string, tag?: string, tags?: string[]): string | null {
  switch (type) {
    case 'path':
      if (!path) return 'Path requerido'
      revalidatePath(path)
      console.log(`✅ [REVALIDATE] Path revalidated: ${path}`)
      return null
      
    case 'tag':
      if (!tag) return 'Tag requerido'
      revalidateTag(tag, 'max')
      console.log(`✅ [REVALIDATE] Tag revalidated: ${tag}`)
      return null
      
    case 'tags':
      if (!tags || !Array.isArray(tags)) return 'Tags array requerido'
      tags.forEach((t: string) => revalidateTag(t, 'max'))
      console.log(`✅ [REVALIDATE] Tags revalidated: ${tags.join(', ')}`)
      return null
      
    default:
      return 'Tipo inválido'
  }
}

// ✅ ISR On-Demand Revalidation API
export async function POST(request: NextRequest) {
  try {
    const isAuthorized = await checkAuthorization(request)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { type, path, tag, tags } = body

    console.log('🔄 [REVALIDATE] Revalidating:', { type, path, tag, tags })

    const error = processRevalidation(type, path, tag, tags)
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Cache revalidated successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ [REVALIDATE] Error:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET - Status endpoint para verificar el servicio
export async function GET() {
  return NextResponse.json({
    service: 'ISR Revalidation API',
    status: 'active',
    endpoints: {
      POST: '/api/revalidate',
      methods: ['path', 'tag', 'tags']
    },
    examples: {
      revalidatePath: { type: 'path', path: '/dashboard' },
      revalidateTag: { type: 'tag', tag: 'products' },
      revalidateTags: { type: 'tags', tags: ['products', 'orders'] }
    }
  })
}