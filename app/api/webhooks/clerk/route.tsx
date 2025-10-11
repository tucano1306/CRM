import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
    // EVENTO: Usuario creado
    if (eventType === 'user.created') {
      const { id, email_addresses, first_name, last_name, public_metadata } = evt.data

      const userEmail = email_addresses[0]?.email_address
      if (!userEmail) {
        console.error('❌ Email no encontrado en el usuario')
        return new Response('Error: No email', { status: 400 })
      }

      const name = `${first_name || ''} ${last_name || ''}`.trim() || userEmail
      const role = (public_metadata?.role as string) || 'CLIENT'

      // Verificar si ya existe
      const existingUser = await prisma.authenticatedUser.findUnique({
        where: { email: userEmail },
      })

      if (existingUser) {
        // Si ya existe, actualizar en lugar de crear
        console.log(`⚠️ Usuario ya existe, actualizando: ${userEmail}`)
        await prisma.authenticatedUser.update({
          where: { email: userEmail },
          data: {
            authId: id,
            name,
            role: role as any,
          },
        })
        console.log(`✅ Usuario actualizado: ${userEmail} (${role})`)
      } else {
        // Crear nuevo usuario
        await prisma.authenticatedUser.create({
          data: {
            authId: id,
            email: userEmail,
            name,
            role: role as any,
          },
        })
        console.log(`✅ Usuario creado: ${userEmail} (${role})`)
      }
    }

    // EVENTO: Usuario actualizado
    if (eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, public_metadata } = evt.data

      const userEmail = email_addresses[0]?.email_address
      const name = `${first_name || ''} ${last_name || ''}`.trim()
      const role = (public_metadata?.role as string) || 'CLIENT'

      // Intentar actualizar por authId
      const user = await prisma.authenticatedUser.findUnique({
        where: { authId: id },
      })

      if (user) {
        await prisma.authenticatedUser.update({
          where: { authId: id },
          data: {
            email: userEmail,
            name: name || user.name,
            role: role as any,
          },
        })
        console.log(`✅ Usuario actualizado: ${userEmail} (${role})`)
      } else {
        console.log(`⚠️ Usuario no encontrado en BD, creando: ${userEmail}`)
        // Si no existe, crearlo
        await prisma.authenticatedUser.create({
          data: {
            authId: id,
            email: userEmail,
            name: name || userEmail,
            role: role as any,
          },
        })
        console.log(`✅ Usuario creado: ${userEmail} (${role})`)
      }
    }

    // EVENTO: Usuario eliminado
    if (eventType === 'user.deleted') {
      const { id } = evt.data as { id: string }

      // Verificar si existe antes de eliminar
      const user = await prisma.authenticatedUser.findUnique({
        where: { authId: id },
      })

      if (user) {
        await prisma.authenticatedUser.delete({
          where: { authId: id },
        })
        console.log(`✅ Usuario eliminado de BD: ${user.email}`)
      } else {
        console.log(`⚠️ Usuario no existía en BD (ya eliminado): ${id}`)
      }
    }

    return new Response('Webhook procesado correctamente', { status: 200 })
  } catch (error) {
    console.error('❌ Error procesando webhook:', error)
    return new Response('Error procesando webhook', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}