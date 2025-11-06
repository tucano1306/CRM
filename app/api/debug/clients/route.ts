// GET /api/debug/clients - Ver todos los clientes y diagnosticar problemas
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetros
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const fix = searchParams.get('fix') === 'true'

    // Si se proporciona email, buscar ese cliente específico
    if (email) {
      const client = await prisma.client.findFirst({
        where: { email },
        include: {
          seller: true,
          authenticated_users: true,
          orders: true
        }
      })

      if (!client) {
        return NextResponse.json({
          success: false,
          message: 'Cliente no encontrado en la base de datos',
          email,
          canCreate: true
        })
      }

      // Diagnosticar problemas
      const problems = []
      
      if (!client.sellerId) {
        problems.push('SIN_SELLER')
      }
      
      if (client.authenticated_users.length === 0) {
        problems.push('SIN_AUTH_USER')
      }

      // Si fix=true, intentar arreglar
      if (fix && problems.length > 0) {
        // Obtener seller del usuario actual
        const seller = await prisma.seller.findFirst({
          where: {
            authenticated_users: {
              some: { authId: userId }
            }
          }
        })

        if (seller && !client.sellerId) {
          await prisma.client.update({
            where: { id: client.id },
            data: { sellerId: seller.id }
          })
          
          return NextResponse.json({
            success: true,
            message: 'Cliente reparado',
            client: {
              ...client,
              sellerId: seller.id,
              seller: seller
            },
            fixed: ['SELLER_ASSIGNED']
          })
        }
      }

      return NextResponse.json({
        success: true,
        client: {
          id: client.id,
          name: client.name,
          email: client.email,
          sellerId: client.sellerId,
          sellerName: client.seller?.name,
          authUsersCount: client.authenticated_users.length,
          ordersCount: client.orders.length,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt
        },
        problems,
        suggestion: problems.length > 0 
          ? `Añade ?fix=true a la URL para reparar automáticamente`
          : 'Cliente configurado correctamente'
      })
    }

    // Sin email, mostrar todos los clientes
    const allClients = await prisma.client.findMany({
      include: {
        seller: true,
        authenticated_users: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const clientsWithProblems = allClients.filter(c => !c.sellerId || c.authenticated_users.length === 0)

    return NextResponse.json({
      success: true,
      total: allClients.length,
      clientsWithProblems: clientsWithProblems.length,
      clients: allClients.map(c => ({
        id: c.id,
        name: c.name,
        email: c.email,
        sellerId: c.sellerId,
        sellerName: c.seller?.name || null,
        authUsersCount: c.authenticated_users.length,
        hasProblems: !c.sellerId || c.authenticated_users.length === 0,
        problems: [
          ...(!c.sellerId ? ['SIN_SELLER'] : []),
          ...(c.authenticated_users.length === 0 ? ['SIN_AUTH_USER'] : [])
        ]
      }))
    })

  } catch (error) {
    console.error('Error in debug/clients:', error)
    return NextResponse.json({ 
      error: 'Error al obtener clientes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
