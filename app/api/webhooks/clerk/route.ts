import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: Request) {
  // Obtener el webhook secret del .env
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET no está configurado en .env')
  }

  // Obtener los headers de la petición
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // Verificar que los headers existan
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', {
      status: 400,
    })
  }

  // Obtener el body de la petición
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Crear una instancia de Webhook con el secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verificar el webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('❌ Error verificando webhook:', err)
    return new Response('Error: Verification failed', {
      status: 400,
    })
  }

  // Obtener el tipo de evento
  const eventType = evt.type
  console.log(`📩 Webhook recibido: ${eventType}`)

  // Manejar evento: user.created
  if (eventType === 'user.created') {
    const { id, email_addresses, primary_email_address_id, first_name, last_name } = evt.data

    try {
      // Obtener el email (maneja tanto datos de prueba como reales)
      let userEmail = ''
      
      if (email_addresses && email_addresses.length > 0) {
        // Buscar el email principal
        const primaryEmail = email_addresses.find(
          (email: any) => email.id === primary_email_address_id
        )
        userEmail = primaryEmail?.email_address || email_addresses[0].email_address
      }

      // Si no hay email, usar un placeholder
      if (!userEmail) {
        userEmail = `user_${id}@placeholder.com`
        console.warn('⚠️ No se encontró email, usando placeholder')
      }

      await prisma.authenticatedUser.create({
        data: {
          authId: id,
          email: userEmail,
          name: `${first_name || ''} ${last_name || ''}`.trim() || 'Usuario',
          role: 'CLIENT',
        },
      })
      
      console.log(`✅ Usuario creado en BD: ${userEmail}`)
    } catch (error) {
      console.error('❌ Error creando usuario en BD:', error)
      return new Response('Error creating user in database', {
        status: 500,
      })
    }
  }

  // Manejar evento: user.updated
  if (eventType === 'user.updated') {
    const { id, email_addresses, primary_email_address_id, first_name, last_name } = evt.data

    try {
      // Obtener el email actualizado
      let userEmail = ''
      
      if (email_addresses && email_addresses.length > 0) {
        const primaryEmail = email_addresses.find(
          (email: any) => email.id === primary_email_address_id
        )
        userEmail = primaryEmail?.email_address || email_addresses[0].email_address
      }

      const updateData: any = {
        name: `${first_name || ''} ${last_name || ''}`.trim() || 'Usuario',
      }

      if (userEmail) {
        updateData.email = userEmail
      }

      await prisma.authenticatedUser.update({
        where: { authId: id },
        data: updateData,
      })
      
      console.log(`✅ Usuario actualizado en BD: ${userEmail || id}`)
    } catch (error) {
      console.error('❌ Error actualizando usuario en BD:', error)
    }
  }

  // Manejar evento: user.deleted
  if (eventType === 'user.deleted') {
    const { id } = evt.data

    try {
      await prisma.authenticatedUser.delete({
        where: { authId: id },
      })
      
      console.log(`✅ Usuario eliminado de BD: ${id}`)
    } catch (error) {
      console.error('❌ Error eliminando usuario de BD:', error)
    }
  }

  return new Response('Webhook procesado correctamente', { status: 200 })
}