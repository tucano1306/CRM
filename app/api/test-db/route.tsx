import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Intentar contar usuarios
    const userCount = await prisma.authenticated_users.count()
    const clientCount = await prisma.client.count()
    const productCount = await prisma.product.count()
    const orderCount = await prisma.order.count()
    
    // Obtener info de la base de datos
    const dbInfo = await prisma.$queryRaw<Array<{ database_name: string; user_name: string; postgres_version: string }>>`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as postgres_version
    `
    
    return NextResponse.json({
      status: 'connected',
      message: '✅ PostgreSQL conectado correctamente',
      database: dbInfo[0],
      counts: {
        users: userCount,
        clients: clientCount,
        products: productCount,
        orders: orderCount
      }
    })
    
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      {
        status: 'error',
        message: '❌ Error al conectar a PostgreSQL',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }  // ✅ Corrección aquí
    )
  }
}
