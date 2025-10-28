import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { z } from 'zod'
import { validateSchema } from '@/lib/validations'
import DOMPurify from 'isomorphic-dompurify'

/**
 * GET /api/notifications
 * Obtener notificaciones del usuario actual (vendedor o comprador)
 * Query params:
 * - unreadOnly: true/false (solo no leídas)
 * - limit: número (default 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Buscar el usuario autenticado
    let authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { 
        sellers: true,
        clients: true 
      }
    })

    // ⚠️ LOGS COMENTADOS PARA REDUCIR RUIDO EN DESARROLLO
    // console.log('🔔 [NOTIFICATIONS] authUser found:', {
    //   userId,
    //   authUserId: authUser?.id,
    //   sellersCount: authUser?.sellers?.length || 0,
    //   clientsCount: authUser?.clients?.length || 0,
    //   role: authUser?.role
    // })

    // Si no existe authUser, crearlo automáticamente
    if (!authUser) {
      console.log('⚠️ [NOTIFICATIONS] Creating authenticated_users record for:', userId)
      
      // Obtener datos del usuario de Clerk
      const { currentUser } = await import('@clerk/nextjs/server')
      const clerkUser = await currentUser()
      
      if (!clerkUser) {
        console.log('❌ [NOTIFICATIONS] Cannot get Clerk user')
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 404 }
        )
      }

      // Determinar rol del usuario desde metadata
      const role = (clerkUser.publicMetadata?.role as string) || 
                   (clerkUser.privateMetadata?.role as string) || 
                   'CLIENT'

      // Crear authenticated_users
      authUser = await prisma.authenticated_users.create({
        data: {
          id: crypto.randomUUID(),
          authId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          name: clerkUser.firstName || clerkUser.username || 'Usuario',
          role: role as any,
          updatedAt: new Date()
        },
        include: {
          sellers: true,
          clients: true
        }
      })

      console.log('✅ [NOTIFICATIONS] authenticated_users created:', authUser.id)
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')

    // Determinar si es vendedor o comprador
    const isSeller = authUser.sellers.length > 0
    const isClient = authUser.clients.length > 0

    // ⚠️ LOGS COMENTADOS PARA REDUCIR RUIDO EN DESARROLLO
    // console.log('🔔 [NOTIFICATIONS] User type:', { isSeller, isClient })

    // Si no tiene rol asignado, retornar array vacío en lugar de error
    if (!isSeller && !isClient) {
      console.log('⚠️ [NOTIFICATIONS] No role assigned, returning empty array')
      return NextResponse.json({
        success: true,
        notifications: [],
        unreadCount: 0,
        userType: 'none',
      })
    }

    // Construir query
    const where: any = {}
    
    if (isSeller && authUser.sellers[0]) {
      where.sellerId = authUser.sellers[0].id
      // console.log('🔔 [NOTIFICATIONS] Querying for seller:', authUser.sellers[0].id)
    } else if (isClient && authUser.clients[0]) {
      where.clientId = authUser.clients[0].id
      // console.log('🔔 [NOTIFICATIONS] Querying for client:', authUser.clients[0].id)
    }

    if (unreadOnly) {
      where.isRead = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    // ⚠️ LOGS COMENTADOS PARA REDUCIR RUIDO EN DESARROLLO
    // console.log(`🔔 [NOTIFICATIONS] Found ${notifications.length} notifications for user`)
    // if (notifications.length > 0) {
    //   console.log('🔔 [NOTIFICATIONS] Latest notification:', {
    //     id: notifications[0].id,
    //     type: notifications[0].type,
    //     title: notifications[0].title,
    //     isRead: notifications[0].isRead,
    //     createdAt: notifications[0].createdAt
    //   })
    // }

    // Contar no leídas
    const unreadWhere = { ...where, isRead: false }
    const unreadCount = await prisma.notification.count({
      where: unreadWhere,
    })

    // console.log(`🔔 [NOTIFICATIONS] Unread count: ${unreadCount}`)

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
      userType: isSeller ? 'seller' : 'client',
    })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Error obteniendo notificaciones' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/notifications
 * Crear una nueva notificación (uso interno)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ✅ Validar schema
    const createNotificationSchema = z.object({
      sellerId: z.string().uuid().optional(),
      clientId: z.string().uuid().optional(),
      type: z.string().min(1).max(50),
      title: z.string().min(1).max(200),
      message: z.string().min(1).max(1000),
      orderId: z.string().uuid().optional(),
      relatedId: z.string().uuid().optional(),
      metadata: z.any().optional() // JSON field
    }).refine(data => data.sellerId || data.clientId, {
      message: 'Debe especificar sellerId o clientId'
    })

    const validation = validateSchema(createNotificationSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: validation.errors }, { status: 400 })
    }

    const { sellerId, clientId, type, title, message, orderId, relatedId, metadata } = validation.data

    // ✅ Sanitizar campos de texto
    const sanitizedTitle = DOMPurify.sanitize(title.trim())
    const sanitizedMessage = DOMPurify.sanitize(message.trim())

    const notification = await prisma.notification.create({
      data: {
        sellerId,
        clientId,
        type: type as any, // NotificationType enum
        title: sanitizedTitle,
        message: sanitizedMessage,
        orderId,
        relatedId,
        metadata: metadata || undefined,
      },
    })

    return NextResponse.json({
      success: true,
      notification,
    })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: 'Error creando notificación' },
      { status: 500 }
    )
  }
}
