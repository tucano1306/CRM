// app/api/debug/invitations/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// GET /api/debug/invitations - Ver todas las invitaciones con sus links
// SOLO PARA DESARROLLO - Eliminar en producción
export async function GET(request: Request) {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        error: 'Este endpoint solo está disponible en desarrollo' 
      }, { status: 403 })
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener todas las invitaciones del vendedor
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { sellers: true }
    })

    if (!authUser || authUser.sellers.length === 0) {
      return NextResponse.json({ 
        error: 'Debes ser vendedor para ver invitaciones' 
      }, { status: 403 })
    }

    const sellerId = authUser.sellers[0].id

    // Obtener invitaciones pendientes
    const invitations = await prisma.invitation.findMany({
      where: { 
        sellerId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    // Construir links completos
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invitationsWithLinks = invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      status: inv.status,
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
      // Link completo para copiar y pegar
      invitationLink: `${baseUrl}/accept-invitation?token=${inv.token}`,
      // Link corto solo con token
      token: inv.token
    }))

    return NextResponse.json({
      success: true,
      message: 'Invitaciones encontradas',
      data: invitationsWithLinks,
      instructions: {
        howToTest: [
          '1. Copia el "invitationLink" completo',
          '2. Abre una ventana de incógnito',
          '3. Pega el link en el navegador',
          '4. Regístrate con CUALQUIER email (puede ser el mismo con +alias)',
          '5. El sistema te asociará automáticamente con el vendedor'
        ],
        emailTrick: 'Si usas Gmail: tuEmail+test1@gmail.com, tuEmail+test2@gmail.com, etc.'
      }
    })

  } catch (error) {
    console.error('Error obteniendo invitaciones debug:', error)
    return NextResponse.json({ 
      error: 'Error obteniendo invitaciones',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// POST /api/debug/invitations - Crear invitación de prueba
export async function POST(request: Request) {
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ 
        error: 'Este endpoint solo está disponible en desarrollo' 
      }, { status: 403 })
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { sellers: true }
    })

    if (!authUser || authUser.sellers.length === 0) {
      return NextResponse.json({ 
        error: 'Debes ser vendedor' 
      }, { status: 403 })
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ 
        error: 'Email es requerido' 
      }, { status: 400 })
    }

    const sellerId = authUser.sellers[0].id

    // Generar token único
    const token = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    
    // Expira en 7 días
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Crear invitación
    const invitation = await prisma.invitation.create({
      data: {
        email,
        token,
        sellerId,
        expiresAt,
        status: 'PENDING'
      }
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const invitationLink = `${baseUrl}/accept-invitation?token=${token}`

    return NextResponse.json({
      success: true,
      message: 'Invitación de prueba creada',
      data: {
        id: invitation.id,
        email: invitation.email,
        invitationLink,
        token,
        expiresAt: invitation.expiresAt
      },
      instructions: {
        nextStep: 'Copia el invitationLink y ábrelo en una ventana de incógnito',
        emailTip: `Puedes registrarte con ${email} o cualquier variación como ${email.split('@')[0]}+test@${email.split('@')[1]}`
      }
    })

  } catch (error) {
    console.error('Error creando invitación debug:', error)
    return NextResponse.json({ 
      error: 'Error creando invitación',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
