import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { ProductCategory } from '@prisma/client'
import { autoClassifyCategory } from '@/lib/autoClassifyCategory'
import * as XLSX from 'xlsx'

/**
 * POST /api/products/import
 * Importar productos desde un archivo Excel
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Buscar el usuario autenticado y su seller
    const authUser = await prisma.authenticated_users.findFirst({
      where: { authId: userId },
      include: { sellers: true }
    })

    if (!authUser || authUser.sellers.length === 0) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    const seller = authUser.sellers[0]

    // Obtener el archivo del form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const clientId = formData.get('clientId') as string | null
    const updateExisting = formData.get('updateExisting') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    // Leer el archivo Excel
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    
    // Tomar la primera hoja
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convertir a JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    // Encontrar la fila de encabezados (buscar "Item #" o "Item" o similar)
    let headerRowIndex = -1
    let headers: string[] = []
    
    for (let i = 0; i < Math.min(rawData.length, 20); i++) {
      const row = rawData[i]
      if (row && Array.isArray(row)) {
        const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ')
        if (rowStr.includes('item') && (rowStr.includes('description') || rowStr.includes('price'))) {
          headerRowIndex = i
          headers = row.map(cell => String(cell || '').trim())
          break
        }
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json({ 
        error: 'No se encontró la fila de encabezados. Asegúrese de que el archivo tenga columnas como: Item #, Description, Price' 
      }, { status: 400 })
    }

    // Mapear columnas
    const columnMap: Record<string, number> = {}
    headers.forEach((header, index) => {
      const h = header.toLowerCase()
      if (h.includes('item') && (h.includes('#') || h.includes('no') || h === 'item')) {
        columnMap['sku'] = index
      } else if (h.includes('description') || h.includes('descripcion') || h.includes('nombre') || h.includes('product')) {
        columnMap['name'] = index
      } else if (h.includes('brand') || h.includes('marca')) {
        columnMap['brand'] = index
      } else if (h.includes('pack') || h.includes('cantidad') || h.includes('qty')) {
        columnMap['pack'] = index
      } else if (h.includes('size') || h.includes('tamaño') || h.includes('peso') || h.includes('weight')) {
        columnMap['size'] = index
      } else if (h.includes('price') || h.includes('precio') || h.includes('cost')) {
        columnMap['price'] = index
      } else if (h.includes('split')) {
        columnMap['split'] = index
      } else if (h.includes('category') || h.includes('categoria')) {
        columnMap['category'] = index
      }
    })

    // Verificar columnas mínimas requeridas
    if (!('name' in columnMap) && !('sku' in columnMap)) {
      return NextResponse.json({ 
        error: 'El archivo debe tener al menos una columna de Description o Item #',
        headers: headers
      }, { status: 400 })
    }

    // Procesar datos
    const dataRows = rawData.slice(headerRowIndex + 1)
    const products: any[] = []
    const existingProducts: any[] = [] // Para productos que ya existen
    const errors: string[] = []
    let created = 0
    let updated = 0
    let skipped = 0

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      if (!row || !Array.isArray(row) || row.every(cell => !cell)) {
        continue // Skip empty rows
      }

      try {
        const sku = columnMap['sku'] === undefined ? '' : String(row[columnMap['sku']] || '').trim()
        const name = columnMap['name'] === undefined ? '' : String(row[columnMap['name']] || '').trim()
        const brand = columnMap['brand'] === undefined ? '' : String(row[columnMap['brand']] || '').trim()
        const pack = columnMap['pack'] === undefined ? '' : String(row[columnMap['pack']] || '').trim()
        const size = columnMap['size'] === undefined ? '' : String(row[columnMap['size']] || '').trim()
        const priceStr = columnMap['price'] === undefined ? '0' : String(row[columnMap['price']] || '0')
        const split = columnMap['split'] === undefined ? false : String(row[columnMap['split']] || '').toLowerCase() === 'yes'
        
        // Obtener categoría del Excel o auto-clasificar
        const categoryFromExcel = columnMap['category'] === undefined ? '' : String(row[columnMap['category']] || '').trim().toUpperCase()
        
        // Validar si la categoría del Excel es válida
        const validCategories = Object.values(ProductCategory)
        let category: ProductCategory

        // Limpiar precio (quitar $, comas, etc)
        const price = parseFloat(priceStr.replaceAll(/[^0-9.-]/g, '')) || 0

        // Crear descripción completa
        let description = ''
        if (brand) description += `Marca: ${brand}. `
        if (pack) description += `Pack: ${pack}. `
        if (size) description += `Tamaño: ${size}. `
        if (split) description += `Divisible: Sí. `
        description = description.trim()

        // Nombre del producto (usar description del Excel, o construir uno)
        const productName = name || `${brand} - ${sku}`.trim() || `Producto ${sku}`

        if (!productName || productName === ' - ' || productName === 'Producto ') {
          errors.push(`Fila ${i + headerRowIndex + 2}: Producto sin nombre ni SKU`)
          skipped++
          continue
        }
        
        // Auto-clasificar si no tiene categoría válida del Excel
        if (categoryFromExcel && validCategories.includes(categoryFromExcel as ProductCategory)) {
          category = categoryFromExcel as ProductCategory
        } else {
          category = autoClassifyCategory(productName, description)
        }

        // Buscar si el producto ya existe (por SKU y asociado al seller)
        let existingProduct = null
        if (sku) {
          existingProduct = await prisma.product.findFirst({
            where: { 
              sku: sku,
              sellers: {
                some: { sellerId: seller.id }
              }
            }
          })
        }

        if (existingProduct) {
          if (updateExisting) {
            // Actualizar producto existente
            await prisma.product.update({
              where: { id: existingProduct.id },
              data: {
                name: productName,
                description: description || existingProduct.description,
                price: price || existingProduct.price,
                category: category, // Actualizar categoría también
                updatedAt: new Date()
              }
            })
            updated++
            // Guardar para asociar al cliente
            existingProducts.push({ ...existingProduct, price, category })
          } else {
            // Aunque se omita la actualización, guardarlo para asociar al cliente
            existingProducts.push({ ...existingProduct, price })
            skipped++
          }
        } else {
          // Crear nuevo producto y asociarlo al seller
          const newProduct = await prisma.product.create({
            data: {
              name: productName,
              description: description || null,
              price: price,
              sku: sku || null,
              category: category, // Categoría auto-clasificada
              stock: 999, // Stock inicial alto
              isActive: true,
              sellers: {
                create: {
                  sellerId: seller.id,
                  sellerPrice: price,
                  isAvailable: true
                }
              }
            }
          })
          products.push({ ...newProduct, price, category })
          created++
        }

      } catch (err: any) {
        errors.push(`Fila ${i + headerRowIndex + 2}: ${err.message}`)
        skipped++
      }
    }

    // Combinar productos nuevos y existentes para asociar al cliente
    const allProductsToAssociate = [...products, ...existingProducts]

    // Si hay clientId, asociar TODOS los productos al cliente (nuevos y existentes)
    if (clientId && allProductsToAssociate.length > 0) {
      // Verificar que el cliente existe y pertenece al vendedor
      const client = await prisma.client.findFirst({
        where: { 
          id: clientId,
          sellerId: seller.id
        }
      })

      if (client) {
        let associated = 0
        // Crear las asociaciones ClientProduct para cada producto
        for (const product of allProductsToAssociate) {
          try {
            await prisma.clientProduct.upsert({
              where: {
                clientId_productId: {
                  clientId: client.id,
                  productId: product.id
                }
              },
              create: {
                clientId: client.id,
                productId: product.id,
                customPrice: product.price,
                isVisible: true
              },
              update: {
                customPrice: product.price,
                isVisible: true
              }
            })
            associated++
          } catch (err) {
            console.error(`Error asociando producto ${product.id} al cliente:`, err)
          }
        }
        console.log(`✅ ${associated} productos asociados al cliente: ${client.name}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importación completada`,
      stats: {
        total: dataRows.length,
        created,
        updated,
        skipped,
        errors: errors.length,
        associatedToClient: clientId ? allProductsToAssociate.length : 0
      },
      errors: errors.slice(0, 10), // Solo mostrar primeros 10 errores
      headers: headers,
      columnMapping: columnMap
    })

  } catch (error: any) {
    console.error('❌ Error importando productos:', error)
    return NextResponse.json({ 
      error: 'Error procesando archivo: ' + error.message 
    }, { status: 500 })
  }
}

/**
 * GET /api/products/import/template
 * Descargar plantilla Excel
 */
export async function GET() {
  try {
    // Crear plantilla
    const template = [
      ['Item #', 'Description', 'Brand', 'Pack', 'Size', 'Price', 'Split'],
      ['SKU001', 'Producto ejemplo 1', 'Marca A', '24', '1#', '25.99', 'No'],
      ['SKU002', 'Producto ejemplo 2', 'Marca B', '12', '2LB', '45.50', 'Yes'],
    ]

    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet(template)
    
    // Ajustar anchos de columna
    worksheet['!cols'] = [
      { wch: 12 }, // Item #
      { wch: 40 }, // Description
      { wch: 15 }, // Brand
      { wch: 8 },  // Pack
      { wch: 10 }, // Size
      { wch: 12 }, // Price
      { wch: 8 },  // Split
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Productos')
    
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename=plantilla_productos.xlsx'
      }
    })

  } catch (error: any) {
    console.error('Error generando plantilla:', error)
    return NextResponse.json({ error: 'Error generando plantilla' }, { status: 500 })
  }
}
