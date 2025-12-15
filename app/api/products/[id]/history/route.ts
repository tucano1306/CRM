import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { validateSchema } from '@/lib/validations'
import { sanitizeText } from '@/lib/sanitize'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Obtener historial del producto
    const history = await prisma.productHistory.findMany({
      where: { productId: id },
      orderBy: { changedAt: 'desc' },
      take: 50 // Limitar a últimos 50 cambios
    })

    return NextResponse.json({
      success: true,
      history,
      count: history.length
    })

  } catch (error) {
    console.error('Error fetching product history:', error)
    return NextResponse.json(
      { error: 'Error al obtener el historial del producto' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    // ✅ Validar schema
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const createHistorySchema = z.object({
      changeType: z.string().min(1).max(100),
      oldValue: z.string().max(500).optional(),
      newValue: z.string().min(1).max(500),
      changedBy: z.string().regex(uuidRegex, 'Invalid UUID').optional()
    })

    const validation = validateSchema(createHistorySchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: validation.errors }, { status: 400 })
    }

    const { changeType, oldValue, newValue, changedBy } = validation.data

    // ✅ Sanitizar campos de texto
    const sanitizedChangeType = sanitizeText(changeType)
    const sanitizedNewValue = sanitizeText(newValue)
    const sanitizedOldValue = oldValue ? sanitizeText(oldValue) : null

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Crear registro en historial
    const historyEntry = await prisma.productHistory.create({
      data: {
        productId: id,
        changeType: sanitizedChangeType,
        oldValue: sanitizedOldValue,
        newValue: sanitizedNewValue,
        changedBy: changedBy || userId,
        changedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      history: historyEntry
    })

  } catch (error) {
    console.error('Error creating product history entry:', error)
    return NextResponse.json(
      { error: 'Error al crear entrada en historial' },
      { status: 500 }
    )
  }
}
