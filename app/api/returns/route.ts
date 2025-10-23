// app/api/returns/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Obtener devoluciones
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') // 'seller' o 'client'

    // Obtener usuario
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { 
        sellers: true,
        clients: true
      }
    })

    if (!authUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    let returns

    if (role === 'client' && authUser.clients.length > 0) {
      // Cliente: ver sus propias devoluciones
      const clientId = authUser.clients[0].id
      returns = await prisma.return.findMany({
        where: { clientId },
        include: {
          order: {
            select: {
              orderNumber: true,
              createdAt: true
            }
          },
          seller: {
            select: {
              name: true,
              email: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  unit: true
                }
              }
            }
          },
          creditNote: true
        },
        orderBy: { createdAt: 'desc' }
      })
    } else if (authUser.sellers.length > 0) {
      // Si es vendedor, ver todas las devoluciones de sus clientes
      const sellerId = authUser.sellers[0].id
      returns = await prisma.return.findMany({
        where: { sellerId },
        include: {
          order: {
            select: {
              orderNumber: true,
              createdAt: true
            }
          },
          client: {
            select: {
              name: true,
              email: true,
              phone: true
            }
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  unit: true
                }
              }
            }
          },
          creditNote: true
        },
        orderBy: { createdAt: 'desc' }
      })
    } else {
      return NextResponse.json({ error: 'Usuario sin permisos' }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      data: returns
    })

  } catch (error) {
    console.error('Error fetching returns:', error)
    return NextResponse.json(
      { error: 'Error al obtener devoluciones' },
      { status: 500 }
    )
  }
}

// POST /api/returns - Crear nueva devolución
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, reason, reasonDescription, refundType, items, notes } = body

    // Validar campos requeridos
    if (!orderId || !reason || !refundType || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Buscar usuario autenticado (cliente)
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { clients: true }
    })

    if (!authUser || authUser.clients.length === 0) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const clientId = authUser.clients[0].id

    // Verificar que la orden pertenece al cliente
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        seller: true
      }
    })

    if (!order || order.clientId !== clientId) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 })
    }

    // Calcular totales
    let totalReturnAmount = 0
    const returnItems = []

    for (const item of items) {
      const orderItem = order.orderItems.find(oi => oi.id === item.orderItemId)
      if (!orderItem) {
        return NextResponse.json(
          { error: `Item de orden ${item.orderItemId} no encontrado` },
          { status: 400 }
        )
      }

      if (item.quantityReturned > orderItem.quantity) {
        return NextResponse.json(
          { error: `Cantidad a devolver excede la cantidad ordenada` },
          { status: 400 }
        )
      }

      const subtotal = Number(orderItem.pricePerUnit) * item.quantityReturned
      totalReturnAmount += subtotal

      returnItems.push({
        orderItemId: item.orderItemId,
        productId: orderItem.productId,
        productName: orderItem.productName,
        quantityReturned: item.quantityReturned,
        pricePerUnit: Number(orderItem.pricePerUnit),
        subtotal,
        notes: item.notes || null
      })
    }

    // Calcular fee de restock (5% del total)
    const restockFee = totalReturnAmount * 0.05
    const finalRefundAmount = totalReturnAmount - restockFee

    // Generar número de devolución
    const returnNumber = `RET-${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Crear devolución con items
    const newReturn = await prisma.return.create({
      data: {
        returnNumber,
        orderId,
        clientId,
        sellerId: order.sellerId,
        status: 'PENDING',
        reason,
        reasonDescription,
        refundType,
        totalReturnAmount,
        restockFee,
        finalRefundAmount,
        notes,
        items: {
          create: returnItems
        }
      },
      include: {
        order: {
          select: {
            orderNumber: true
          }
        },
        items: {
          include: {
            product: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: newReturn,
      message: 'Devolución creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating return:', error)
    return NextResponse.json(
      { error: 'Error al crear devolución' },
      { status: 500 }
    )
  }
}
