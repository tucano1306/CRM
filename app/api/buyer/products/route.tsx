import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/buyer/products - Obtener todos los productos disponibles
export async function GET(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener parámetros de búsqueda de la URL
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    // Construir condiciones de filtrado
    const whereConditions: any = {
      stock: { gt: 0 }, // Solo productos con stock disponible
      isActive: true, // Solo productos activos
    }

    // Filtro por búsqueda (nombre o descripción)
    if (search) {
      whereConditions.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Obtener productos de la base de datos
    const products = await prisma.product.findMany({
      where: whereConditions,
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        stock: true,
        unit: true,
        imageUrl: true,
        sku: true,
        isActive: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      products,
      total: products.length,
    })
  } catch (error) {
    console.error('Error obteniendo productos:', error)
    return NextResponse.json(
      { error: 'Error obteniendo productos' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}