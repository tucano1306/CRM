import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        clientId: params.id
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        seller: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener órdenes del cliente' 
      },
      { status: 500 }
    )
  }
}