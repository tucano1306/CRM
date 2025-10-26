// app/api/quotes/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyQuoteCreated } from '@/lib/notifications'
import logger, { LogCategory } from '@/lib/logger'

// GET - Obtener cotizaciones
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener usuario autenticado
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { 
        sellers: true,
        clients: true 
      }
    })

    console.log('🔍 [QUOTES API] Usuario autenticado:', {
      userId,
      authUserId: authUser?.id,
      email: authUser?.email,
      sellersCount: authUser?.sellers?.length || 0,
      clientsCount: authUser?.clients?.length || 0,
      sellers: authUser?.sellers?.map(s => ({ id: s.id, name: s.name })),
      clients: authUser?.clients?.map(c => ({ id: c.id, name: c.name }))
    })

    if (!authUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    let quotes

    // Si es vendedor, obtener cotizaciones que ha creado
    if (authUser.sellers.length > 0) {
      const sellerId = authUser.sellers[0].id

      quotes = await prisma.quote.findMany({
        where: { sellerId },
        include: {
          client: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          },
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    } 
    // Si es comprador, obtener cotizaciones que ha recibido
    else if (authUser.clients.length > 0) {
      const clientId = authUser.clients[0].id

      console.log('🔍 [QUOTES API] Buscando cotizaciones para cliente:', clientId)

      quotes = await prisma.quote.findMany({
        where: { clientId },
        include: {
          seller: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          },
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
      
      console.log(`📋 [QUOTES API] Cotizaciones encontradas para cliente: ${quotes.length}`)
      if (quotes.length > 0) {
        console.log('📋 [QUOTES API] Primera cotización:', {
          id: quotes[0].id,
          quoteNumber: quotes[0].quoteNumber,
          status: quotes[0].status,
          itemsCount: quotes[0].items.length
        })
      }
    } 
    // Si no tiene rol asignado
    else {
      return NextResponse.json({ 
        success: true, 
        data: [] 
      })
    }

    return NextResponse.json({ success: true, data: quotes })
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json({ error: 'Error al obtener cotizaciones' }, { status: 500 })
  }
}

// POST - Crear cotización
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Validar datos
    if (!body.clientId || !body.title || !body.items || body.items.length === 0) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }

    // Obtener vendedor
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { sellers: true }
    })

    if (!authUser || authUser.sellers.length === 0) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    const sellerId = authUser.sellers[0].id

    // Calcular totales
    const subtotal = body.items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.pricePerUnit)
    }, 0)
    
    const discount = body.discount || 0
    const tax = (subtotal - discount) * 0.10 // 10% de impuesto
    const totalAmount = subtotal - discount + tax

    // Generar número de cotización
    const quoteNumber = `QUO-${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Crear cotización
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        clientId: body.clientId,
        sellerId,
        title: body.title,
        description: body.description,
        subtotal,
        tax,
        discount,
        totalAmount,
        validUntil: new Date(body.validUntil),
        notes: body.notes,
        termsAndConditions: body.termsAndConditions || 'Términos y condiciones estándar',
        status: 'DRAFT',
        items: {
          create: body.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            description: item.description,
            quantity: item.quantity,
            pricePerUnit: item.pricePerUnit,
            discount: item.discount || 0,
            subtotal: item.quantity * item.pricePerUnit,
            notes: item.notes
          }))
        }
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        client: true
      }
    })

    // 🔔 ENVIAR NOTIFICACIÓN AL COMPRADOR
    try {
      await notifyQuoteCreated(
        body.clientId,
        quote.id,
        quoteNumber,
        Number(totalAmount)
      )
      logger.info(
        LogCategory.API,
        'Quote creation notification sent to client',
        {
          clientId: body.clientId,
          quoteId: quote.id,
          quoteNumber
        }
      )
    } catch (notifError) {
      // No bloquear la respuesta si falla la notificación
      logger.error(
        LogCategory.API,
        'Error sending quote creation notification',
        notifError
      )
    }

    return NextResponse.json({
      success: true,
      data: quote,
      message: 'Cotización creada exitosamente'
    })
  } catch (error) {
    console.error('Error creating quote:', error)
    return NextResponse.json({ error: 'Error al crear cotización' }, { status: 500 })
  }
}
