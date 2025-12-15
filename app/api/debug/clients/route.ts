// GET /api/debug/clients - Ver todos los clientes y diagnosticar problemas
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Diagnose problems with a client record
 */
function diagnoseClientProblems(client: any): string[] {
  const problems: string[] = []
  if (!client.sellerId) problems.push('SIN_SELLER')
  if (client.authenticated_users.length === 0) problems.push('SIN_AUTH_USER')
  return problems
}

/**
 * Build client summary object for response
 */
function buildClientSummary(client: any) {
  return {
    id: client.id,
    name: client.name,
    email: client.email,
    sellerId: client.sellerId,
    sellerName: client.seller?.name,
    authUsersCount: client.authenticated_users.length,
    ordersCount: client.orders?.length ?? 0,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt
  }
}

/**
 * Attempt to fix client by assigning seller
 */
async function tryFixClient(client: any, userId: string) {
  const seller = await prisma.seller.findFirst({
    where: { authenticated_users: { some: { authId: userId } } }
  })

  if (!seller || client.sellerId) return null

  await prisma.client.update({
    where: { id: client.id },
    data: { sellerId: seller.id }
  })

  return {
    success: true,
    message: 'Cliente reparado',
    client: { ...client, sellerId: seller.id, seller },
    fixed: ['SELLER_ASSIGNED']
  }
}

/**
 * Handle single client lookup by email
 */
async function handleSingleClientLookup(email: string, userId: string, shouldFix: boolean) {
  const client = await prisma.client.findFirst({
    where: { email },
    include: { seller: true, authenticated_users: true, orders: true }
  })

  if (!client) {
    return { success: false, message: 'Cliente no encontrado en la base de datos', email, canCreate: true }
  }

  const problems = diagnoseClientProblems(client)

  if (shouldFix && problems.length > 0) {
    const fixResult = await tryFixClient(client, userId)
    if (fixResult) return fixResult
  }

  const suggestion = problems.length > 0
    ? 'Añade ?fix=true a la URL para reparar automáticamente'
    : 'Cliente configurado correctamente'

  return { success: true, client: buildClientSummary(client), problems, suggestion }
}

/**
 * Handle listing all clients
 */
async function handleListAllClients() {
  const allClients = await prisma.client.findMany({
    include: { seller: true, authenticated_users: true },
    orderBy: { createdAt: 'desc' },
    take: 50
  })

  const clientsWithProblems = allClients.filter(c => diagnoseClientProblems(c).length > 0)

  return {
    success: true,
    total: allClients.length,
    clientsWithProblems: clientsWithProblems.length,
    clients: allClients.map(c => {
      const problems = diagnoseClientProblems(c)
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        sellerId: c.sellerId,
        sellerName: c.seller?.name || null,
        authUsersCount: c.authenticated_users.length,
        hasProblems: problems.length > 0,
        problems
      }
    })
  }
}

// ============================================================================
// Main Route Handler
// ============================================================================

export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const shouldFix = searchParams.get('fix') === 'true'

    if (email) {
      const result = await handleSingleClientLookup(email, userId, shouldFix)
      return NextResponse.json(result)
    }

    const result = await handleListAllClients()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in debug/clients:', error)
    return NextResponse.json(
      { error: 'Error al obtener clientes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
