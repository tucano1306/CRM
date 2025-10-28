import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { validateSchema } from '@/lib/validations'
import { OrderConfirmationMethod } from '@prisma/client'

// PUT /api/order-confirmation-settings - Update client's confirmation method
export async function PUT(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await request.json()

    // ✅ Validar schema
    const updateSettingsSchema = z.object({
      clientId: z.string().uuid(),
      method: z.enum(['WHATSAPP', 'PHONE', 'EMAIL']),
      idempotencyKey: z.string().optional()
    })

    const validation = validateSchema(updateSettingsSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: validation.errors }, { status: 400 })
    }

    const { clientId, method, idempotencyKey } = validation.data

    // Note: clients don't store idempotencyKey in schema; callers should ensure idempotency

    const updated = await prisma.client.update({ 
      where: { id: clientId }, 
      data: { 
        orderConfirmationMethod: method as OrderConfirmationMethod,
        orderConfirmationEnabled: true 
      } 
    })

    // Optionally persist idempotencyKey on client (if column exists)
    try {
      if (idempotencyKey) {
        await prisma.client.update({ where: { id: clientId }, data: { /* no-op: keep method updated above */ } })
      }
    } catch (_) {
      // ignore if schema doesn't include idempotencyKey on client
    }

    return NextResponse.json({ success: true, client: updated })
  } catch (error) {
    console.error('Error en order-confirmation-settings PUT', error)
    return NextResponse.json({ error: 'Error actualizando configuración' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// GET /api/order-confirmation-settings?clientId=... - Get client's method
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) return NextResponse.json({ error: 'clientId requerido' }, { status: 400 })

    const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, orderConfirmationMethod: true, orderConfirmationEnabled: true } })
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

    return NextResponse.json({ success: true, client })
  } catch (error) {
    console.error('Error en order-confirmation-settings GET', error)
    return NextResponse.json({ error: 'Error obteniendo configuración' }, { status: 500 })
  }
}
