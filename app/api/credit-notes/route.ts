// app/api/credit-notes/route.ts
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withResilientDb } from '@/lib/db-retry'

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    const authUser = await withResilientDb(() => prisma.authenticated_users.findUnique({
      where: { authId: userId },
      include: { sellers: true, clients: true }
    }))

    if (!authUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    let creditNotes

    if (role === 'client' && authUser.clients.length > 0) {
      creditNotes = await withResilientDb(() => prisma.creditNote.findMany({
        where: { 
          clientId: authUser.clients[0].id,
          isActive: true,
          balance: { gt: 0 }
        },
        include: {
          return: {
            include: {
              order: true
            }
          },
          usage: {
            include: {
              order: {
                select: {
                  orderNumber: true,
                  createdAt: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }))
    } else if (authUser.sellers.length > 0) {
      creditNotes = await withResilientDb(() => prisma.creditNote.findMany({
        where: { sellerId: authUser.sellers[0].id },
        include: {
          client: true,
          return: {
            include: {
              order: true
            }
          },
          usage: {
            include: {
              order: {
                select: {
                  orderNumber: true,
                  createdAt: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }))
    } else {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: creditNotes })
  } catch (error) {
    console.error('Error fetching credit notes:', error)
    return NextResponse.json({ error: 'Error al obtener notas de crédito' }, { status: 500 })
  } finally {
    // prisma singleton
  }
}
