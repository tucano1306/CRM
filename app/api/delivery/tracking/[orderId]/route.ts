import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import prisma from '@/lib/prisma'

// GET /api/delivery/tracking/:orderId
export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { orderId } = params

    // Verificar que la orden existe
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        seller: true
      }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Verificar permisos: buscar usuario autenticado
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId }
    })

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el usuario es el cliente o vendedor de esta orden
    const isClient = order.clientId === authUser.id
    const isSeller = order.sellerId === authUser.id

    if (!isClient && !isSeller) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para ver este tracking' },
        { status: 403 }
      )
    }

    // Obtener tracking de la orden
    const tracking = await prisma.deliveryTracking.findUnique({
      where: { orderId }
    })

    if (!tracking) {
      return NextResponse.json(
        { success: false, error: 'No hay información de tracking para esta orden' },
        { status: 404 }
      )
    }

    // Si es cliente, ocultar la dirección completa por privacidad
    const trackingData = {
      ...tracking,
      // Convertir Decimal a number para JSON
      currentLatitude: tracking.currentLatitude ? Number(tracking.currentLatitude) : null,
      currentLongitude: tracking.currentLongitude ? Number(tracking.currentLongitude) : null,
      // Ocultar dirección completa para clientes
      deliveryAddress: isClient ? null : tracking.deliveryAddress,
      deliveryCity: isClient ? null : tracking.deliveryCity,
      deliveryState: isClient ? null : tracking.deliveryState,
      deliveryZipCode: isClient ? null : tracking.deliveryZipCode,
    }

    return NextResponse.json({
      success: true,
      tracking: trackingData,
      isClient,
      isSeller
    })

  } catch (error) {
    console.error('Error obteniendo tracking:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH /api/delivery/tracking/:orderId
export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { orderId } = params
    const body = await request.json()

    // Verificar usuario autenticado
    const authUser = await prisma.authenticated_users.findUnique({
      where: { authId: userId }
    })

    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que la orden existe
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    // Solo el vendedor puede actualizar el tracking
    if (order.sellerId !== authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Solo el vendedor puede actualizar el tracking' },
        { status: 403 }
      )
    }

    // Validar datos
    const {
      status,
      driverName,
      driverPhone,
      estimatedDeliveryTime,
      currentLatitude,
      currentLongitude,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      deliveryZipCode
    } = body

    // Crear o actualizar tracking
    const tracking = await prisma.deliveryTracking.upsert({
      where: { orderId },
      create: {
        orderId,
        status: status || 'PENDING',
        driverName,
        driverPhone,
        estimatedDeliveryTime: estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : null,
        currentLatitude: currentLatitude ? parseFloat(currentLatitude) : null,
        currentLongitude: currentLongitude ? parseFloat(currentLongitude) : null,
        deliveryAddress,
        deliveryCity,
        deliveryState,
        deliveryZipCode
      },
      update: {
        status: status || undefined,
        driverName: driverName !== undefined ? driverName : undefined,
        driverPhone: driverPhone !== undefined ? driverPhone : undefined,
        estimatedDeliveryTime: estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : undefined,
        currentLatitude: currentLatitude ? parseFloat(currentLatitude) : undefined,
        currentLongitude: currentLongitude ? parseFloat(currentLongitude) : undefined,
        deliveryAddress: deliveryAddress !== undefined ? deliveryAddress : undefined,
        deliveryCity: deliveryCity !== undefined ? deliveryCity : undefined,
        deliveryState: deliveryState !== undefined ? deliveryState : undefined,
        deliveryZipCode: deliveryZipCode !== undefined ? deliveryZipCode : undefined
      }
    })

    // Si se actualizó la ubicación, guardar en el historial
    if (currentLatitude && currentLongitude) {
      await prisma.deliveryLocationHistory.create({
        data: {
          trackingId: tracking.id,
          latitude: parseFloat(currentLatitude),
          longitude: parseFloat(currentLongitude),
          timestamp: new Date()
        }
      })
    }

    return NextResponse.json({
      success: true,
      tracking: {
        ...tracking,
        currentLatitude: tracking.currentLatitude ? Number(tracking.currentLatitude) : null,
        currentLongitude: tracking.currentLongitude ? Number(tracking.currentLongitude) : null
      }
    })

  } catch (error) {
    console.error('Error actualizando tracking:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
