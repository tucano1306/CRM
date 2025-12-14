import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { withDbRetry } from '@/lib/db-retry'
import * as XLSX from 'xlsx'

/**
 * 📊 API para exportar productos de un cliente a Excel
 * 
 * GET /api/clients/[id]/products/export - Descarga Excel con productos del cliente
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id: clientId } = await params

    // Verificar que el usuario es vendedor
    const user = await withDbRetry(() =>
      prisma.authenticated_users.findUnique({
        where: { authId: userId }
      })
    )

    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'Solo vendedores pueden exportar catálogos' },
        { status: 403 }
      )
    }

    // Verificar que el cliente existe
    const client = await withDbRetry(() =>
      prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true }
      })
    )

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Obtener productos asignados al cliente
    const clientProducts = await withDbRetry(() =>
      prisma.clientProduct.findMany({
        where: { clientId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              stock: true,
              unit: true,
              category: true,
              sku: true,
              isActive: true,
            }
          }
        },
        orderBy: { product: { name: 'asc' } }
      })
    )

    if (clientProducts.length === 0) {
      return NextResponse.json(
        { error: 'El cliente no tiene productos asignados' },
        { status: 400 }
      )
    }

    // Transformar datos para Excel
    const excelData = clientProducts.map((cp, index) => ({
      '#': index + 1,
      'SKU': cp.product.sku || '',
      'Nombre': cp.product.name,
      'Descripción': cp.product.description || '',
      'Categoría': cp.product.category || 'OTROS',
      'Unidad': cp.product.unit || 'unit',
      'Precio Base': cp.product.price,
      'Precio Cliente': cp.customPrice,
      'Stock': cp.product.stock,
      'Visible': cp.isVisible ? 'Sí' : 'No',
      'Activo': cp.product.isActive ? 'Sí' : 'No',
      'Notas': cp.notes || ''
    }))

    // Crear workbook de Excel
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.json_to_sheet(excelData)

    // Ajustar anchos de columna
    const columnWidths = [
      { wch: 5 },   // #
      { wch: 15 },  // SKU
      { wch: 35 },  // Nombre
      { wch: 40 },  // Descripción
      { wch: 12 },  // Categoría
      { wch: 10 },  // Unidad
      { wch: 12 },  // Precio Base
      { wch: 14 },  // Precio Cliente
      { wch: 8 },   // Stock
      { wch: 8 },   // Visible
      { wch: 8 },   // Activo
      { wch: 30 },  // Notas
    ]
    worksheet['!cols'] = columnWidths

    // Agregar hoja con nombre del cliente
    const safeClientName = client.name.replaceAll(/[^a-zA-Z0-9 ]/g, '').substring(0, 31)
    XLSX.utils.book_append_sheet(workbook, worksheet, safeClientName || 'Productos')

    // Generar buffer Excel
    const excelBuffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx' 
    })

    console.log(`✅ [EXPORT] Exportados ${clientProducts.length} productos para cliente ${client.name}`)

    // Devolver archivo Excel
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="productos_${safeClientName}_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })

  } catch (error) {
    console.error('❌ [EXPORT ERROR]:', error)
    return NextResponse.json(
      { error: 'Error al exportar productos' },
      { status: 500 }
    )
  }
}
