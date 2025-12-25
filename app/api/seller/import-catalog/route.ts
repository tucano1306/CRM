import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que sea vendedor
    const seller = await prisma.seller.findFirst({
      where: {
        authenticated_users: { some: { authId: userId } }
      }
    })

    if (!seller) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No se envió archivo' }, { status: 400 })
    }

    // Leer el archivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)

    if (data.length === 0) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })
    }

    // Obtener clientes del vendedor
    const clients = await prisma.client.findMany({
      where: { sellerId: seller.id }
    })

    if (clients.length === 0) {
      return NextResponse.json({ error: 'No tienes clientes registrados' }, { status: 400 })
    }

    let productsCreated = 0
    let assignmentsCreated = 0
    const errors: string[] = []

    // Procesar cada fila
    for (const row of data as any[]) {
      try {
        const name = row['Nombre'] || row['nombre'] || row['NOMBRE'] || row['Name'] || row['name']
        const priceStr = row['Precio'] || row['precio'] || row['PRECIO'] || row['Price'] || row['price'] || '0'
        const price = typeof priceStr === 'number' ? priceStr : parseFloat(String(priceStr).replace(/[^0-9.-]/g, ''))
        const description = row['Descripción'] || row['descripcion'] || row['Description'] || ''
        const sku = row['SKU'] || row['sku'] || row['Código'] || row['codigo'] || ''
        const stockStr = row['Stock'] || row['stock'] || row['Existencia'] || '0'
        const stock = typeof stockStr === 'number' ? stockStr : parseInt(String(stockStr).replace(/[^0-9]/g, ''))

        if (!name || isNaN(price)) {
          errors.push(`Fila sin nombre o precio inválido`)
          continue
        }

        // Crear producto
        const product = await prisma.product.create({
          data: {
            name,
            description: description || '',
            price,
            sku: sku || undefined,
            stock: isNaN(stock) ? 0 : stock,
            isActive: true,
            sellerId: seller.id,
            category: 'General'
          }
        })

        productsCreated++

        // Asignar a todos los clientes
        for (const client of clients) {
          await prisma.clientProduct.create({
            data: {
              clientId: client.id,
              productId: product.id,
              customPrice: price,
              isVisible: true
            }
          })
          assignmentsCreated++
        }
      } catch (err: any) {
        errors.push(`Error procesando producto: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        productsCreated,
        assignmentsCreated,
        clientsCount: clients.length,
        errors
      }
    })

  } catch (error: any) {
    console.error('Error importando catálogo:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
