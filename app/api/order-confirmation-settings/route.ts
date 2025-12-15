import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withPrismaTimeout } from '@/lib/timeout'
import logger, { LogCategory } from '@/lib/logger'
import { z } from 'zod'
import { validateSchema } from '@/lib/validations'

// UUID regex pattern for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Schema de validación
const confirmationSettingsSchema = z.object({
  clientId: z.string().regex(uuidRegex, 'Invalid UUID'),
  method: z.enum(['MANUAL', 'AUTOMATIC']),
  deadlineMinutes: z.number().min(1).max(60).optional() // Para AUTOMATIC, cuántos minutos dar
})

/**
 * GET /api/order-confirmation-settings
 * Obtener configuración de confirmación para todos los clientes del vendedor
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔒 SEGURIDAD: Obtener vendedor
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      return NextResponse.json({ 
        error: 'Solo vendedores pueden acceder a esta configuración' 
      }, { status: 403 })
    }

    // Obtener todos los clientes del vendedor con su configuración
    const clients = await withPrismaTimeout(
      () => prisma.client.findMany({
        where: { sellerId: seller.id },
        select: {
          id: true,
          name: true,
          email: true,
          orderConfirmationMethod: true,
          orderConfirmationEnabled: true
        },
        orderBy: { name: 'asc' }
      })
    )

    logger.info(LogCategory.API, 'Order confirmation settings retrieved', { 
      sellerId: seller.id,
      clientCount: clients.length
    })

    return NextResponse.json({
      success: true,
      clients
    })

  } catch (error) {
    logger.error(LogCategory.API, 'Error retrieving confirmation settings', error)
    return NextResponse.json({
      success: false,
      error: 'Error al obtener configuración'
    }, { status: 500 })
  }
}

/**
 * PUT /api/order-confirmation-settings
 * Configurar método de confirmación para un cliente específico
 * ✅ IDEMPOTENTE
 * 
 * Body example:
 * {
 *   "clientId": "uuid",
 *   "method": "MANUAL" | "AUTOMATIC",
 *   "deadlineMinutes": 10 // opcional, solo para AUTOMATIC
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // 🔒 SEGURIDAD: Obtener vendedor
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: {
          some: { authId: userId }
        }
      }
    })

    if (!seller) {
      return NextResponse.json({ 
        error: 'Solo vendedores pueden configurar métodos de confirmación' 
      }, { status: 403 })
    }

    const body = await request.json()

    // ✅ Validación con Zod
    const validation = validateSchema(confirmationSettingsSchema, body)
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Datos inválidos',
        details: validation.errors
      }, { status: 400 })
    }

    const { clientId, method, deadlineMinutes } = validation.data

    // Verificar que el cliente pertenece a este vendedor
    const client = await withPrismaTimeout(
      () => prisma.client.findFirst({
        where: {
          id: clientId,
          sellerId: seller.id
        }
      })
    )

    if (!client) {
      return NextResponse.json({
        error: 'Cliente no encontrado o no pertenece a este vendedor'
      }, { status: 404 })
    }

    // Actualizar configuración (IDEMPOTENTE)
    const updatedClient = await withPrismaTimeout(
      () => prisma.client.update({
        where: { id: clientId },
        data: {
          orderConfirmationMethod: method,
          orderConfirmationEnabled: true,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          orderConfirmationMethod: true,
          orderConfirmationEnabled: true
        }
      })
    )

    logger.info(LogCategory.API, 'Order confirmation method updated', {
      sellerId: seller.id,
      clientId,
      method,
      deadlineMinutes,
      userId
    })

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      client: updatedClient
    })

  } catch (error) {
    logger.error(LogCategory.API, 'Error updating confirmation settings', error)
    return NextResponse.json({
      success: false,
      error: 'Error al actualizar configuración'
    }, { status: 500 })
  }
}
