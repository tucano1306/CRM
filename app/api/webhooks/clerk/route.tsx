import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'

/**
 * Extract user data from Clerk webhook event
 */
function extractUserData(evtData: any) {
  const { id, email_addresses, first_name, last_name, public_metadata } = evtData
  const userEmail = email_addresses[0]?.email_address
  const name = `${first_name || ''} ${last_name || ''}`.trim() || userEmail || ''
  const role = (public_metadata?.role as string) || 'CLIENT'
  return { id, userEmail, name, role }
}

/**
 * Emit user logged in event for new users
 */
async function emitUserLoggedInEvent(id: string, userEmail: string, role: string, name: string): Promise<void> {
  try {
    await eventEmitter.emit({
      type: EventType.USER_LOGGED_IN,
      timestamp: new Date(),
      userId: id,
      data: {
        userId: id,
        email: userEmail,
        role: role,
        name: name,
        isNewUser: true
      }
    })
  } catch (eventError) {
    console.error('Error emitting USER_LOGGED_IN event:', eventError)
  }
}

/**
 * Link authenticated user to existing client by email
 */
async function linkUserToClient(userEmail: string, newUserId: string): Promise<void> {
  const existingClient = await prisma.client.findFirst({
    where: { email: userEmail },
    include: { seller: true }
  })

  if (existingClient) {
    console.log(`🔍 Cliente encontrado con email ${userEmail}:`)
    console.log(`   • Client ID: ${existingClient.id}`)
    console.log(`   • Nombre: ${existingClient.name}`)
    console.log(`   • Seller: ${existingClient.seller?.name || 'Sin seller'}`)
    
    await prisma.client.update({
      where: { id: existingClient.id },
      data: {
        authenticated_users: {
          connect: { id: newUserId }
        }
      }
    })
    
    console.log(`✅ Usuario vinculado automáticamente con cliente existente`)
  } else {
    console.log(`ℹ️ No se encontró cliente con email ${userEmail}`)
  }
}

/**
 * Handle user.created webhook event
 */
async function handleUserCreated(evtData: any): Promise<Response | null> {
  const { id, userEmail, name, role } = extractUserData(evtData)

  if (!userEmail) {
    console.error('❌ Email no encontrado en el usuario')
    return new Response('Error: No email', { status: 400 })
  }

  const existingUser = await prisma.authenticated_users.findUnique({
    where: { email: userEmail },
  })

  if (existingUser) {
    console.log(`⚠️ Usuario ya existe, actualizando: ${userEmail}`)
    await prisma.authenticated_users.update({
      where: { email: userEmail },
      data: { authId: id, name, role: role as any },
    })
    console.log(`✅ Usuario actualizado: ${userEmail} (${role})`)
    return null
  }

  const newUser = await prisma.authenticated_users.create({
    data: { authId: id, email: userEmail, name, role: role as any } as any,
  })
  console.log(`✅ Usuario creado: ${userEmail} (${role})`)

  await emitUserLoggedInEvent(id, userEmail, role, name)
  await linkUserToClient(userEmail, newUser.id)
  console.log(`   → El usuario ahora puede autenticarse y ver el catálogo del seller`)
  
  return null
}

/**
 * Handle user.updated webhook event
 */
async function handleUserUpdated(evtData: any): Promise<void> {
  const { id, userEmail, name, role } = extractUserData(evtData)

  const user = await prisma.authenticated_users.findUnique({
    where: { authId: id },
  })

  if (user) {
    await prisma.authenticated_users.update({
      where: { authId: id },
      data: { email: userEmail, name: name || user.name, role: role as any },
    })
    console.log(`✅ Usuario actualizado: ${userEmail} (${role})`)
    return
  }

  console.log(`⚠️ Usuario no encontrado en BD, creando: ${userEmail}`)
  const newUser = await prisma.authenticated_users.create({
    data: { authId: id, email: userEmail, name: name || userEmail, role: role as any } as any,
  })
  console.log(`✅ Usuario creado: ${userEmail} (${role})`)

  await linkUserToClient(userEmail || '', newUser.id)
}

/**
 * Handle user.deleted webhook event
 */
async function handleUserDeleted(evtData: { id: string }): Promise<void> {
  const { id } = evtData

  const user = await prisma.authenticated_users.findUnique({
    where: { authId: id },
  })

  if (user) {
    await prisma.authenticated_users.delete({
      where: { authId: id },
    })
    console.log(`✅ Usuario eliminado de BD: ${user.email}`)
  } else {
    console.log(`⚠️ Usuario no existía en BD (ya eliminado): ${id}`)
  }
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('❌ CLERK_WEBHOOK_SECRET no configurado')
    return new Response('Error: Missing webhook secret', { status: 500 })
  }

  // Obtener headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('❌ Headers de Svix faltantes')
    return new Response('Error: Missing svix headers', { status: 400 })
  }

  // Obtener el body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Verificar el webhook
  const wh = new Webhook(WEBHOOK_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('❌ Error verificando webhook:', err)
    return new Response('Error: Verification failed', { status: 400 })
  }

  const eventType = evt.type
  console.log(`📩 Webhook recibido: ${eventType}`)

  try {
    if (eventType === 'user.created') {
      const errorResponse = await handleUserCreated(evt.data)
      if (errorResponse) return errorResponse
    }

    if (eventType === 'user.updated') {
      await handleUserUpdated(evt.data)
    }

    if (eventType === 'user.deleted') {
      await handleUserDeleted(evt.data as { id: string })
    }

    return new Response('Webhook procesado correctamente', { status: 200 })
  } catch (error) {
    console.error('❌ Error procesando webhook:', error)
    return new Response('Error procesando webhook', { status: 500 })
  } finally {
    // Usamos prisma singleton, no desconectar
  }
}
