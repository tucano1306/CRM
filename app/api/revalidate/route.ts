// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { auth } from '@clerk/nextjs/server'

// ✅ ISR On-Demand Revalidation API
export async function POST(request: NextRequest) {
  try {
    // 🔐 Verificar autorización (webhook secret o auth)
    const authHeader = request.headers.get('authorization')
    const revalidateSecret = process.env.REVALIDATE_SECRET
    
    // Verificar por secret (webhooks) o por auth (usuarios admin)
    let isAuthorized = false
    
    if (revalidateSecret && authHeader === `Bearer ${revalidateSecret}`) {
      isAuthorized = true
    } else {
      const { userId } = await auth()
      if (userId) {
        // TODO: Verificar rol admin si es necesario
        isAuthorized = true
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { type, path, tag, tags } = body

    console.log('🔄 [REVALIDATE] Revalidating:', { type, path, tag, tags })

    switch (type) {
      case 'path':
        if (!path) {
          return NextResponse.json({ error: 'Path requerido' }, { status: 400 })
        }
        revalidatePath(path)
        console.log(`✅ [REVALIDATE] Path revalidated: ${path}`)
        break

      case 'tag':
        if (!tag) {
          return NextResponse.json({ error: 'Tag requerido' }, { status: 400 })
        }
        revalidateTag(tag, 'max')
        console.log(`✅ [REVALIDATE] Tag revalidated: ${tag}`)
        break

      case 'tags':
        if (!tags || !Array.isArray(tags)) {
          return NextResponse.json({ error: 'Tags array requerido' }, { status: 400 })
        }
        tags.forEach((t: string) => revalidateTag(t, 'max'))
        console.log(`✅ [REVALIDATE] Tags revalidated: ${tags.join(', ')}`)
        break

      default:
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
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