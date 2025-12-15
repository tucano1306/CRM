import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { ProductCategory } from '@prisma/client'
import { autoClassifyCategory } from '@/lib/autoClassifyCategory'
import * as XLSX from 'xlsx'

// ============================================================================
// Types
// ============================================================================
interface ColumnMap {
  sku?: number
  name?: number
  brand?: number
  pack?: number
  size?: number
  price?: number
  split?: number
  category?: number
}

interface HeaderParseResult {
  success: boolean
  headerRowIndex: number
  headers: string[]
  error?: string
}

interface ParsedProductRow {
  sku: string
  name: string
  brand: string
  pack: string
  size: string
  price: number
  split: boolean
  categoryFromExcel: string
  productName: string
  description: string
  category: ProductCategory
}

interface ProcessRowResult {
  success: boolean
  action?: 'created' | 'updated' | 'skipped'
  product?: any
  error?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find header row in Excel data
 */
function findHeaderRow(rawData: any[]): HeaderParseResult {
  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const row = rawData[i]
    if (row && Array.isArray(row)) {
      const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(' ')
      if (rowStr.includes('item') && (rowStr.includes('description') || rowStr.includes('price'))) {
        return {
          success: true,
          headerRowIndex: i,
          headers: row.map(cell => String(cell || '').trim())
        }
      }
    }
  }
  return {
    success: false,
    headerRowIndex: -1,
    headers: [],
    error: 'No se encontró la fila de encabezados. Asegúrese de que el archivo tenga columnas como: Item #, Description, Price'
  }
}

/**
 * Map column headers to their indices
 */
function mapColumns(headers: string[]): ColumnMap {
  const columnMap: ColumnMap = {}
  
  headers.forEach((header, index) => {
    const h = header.toLowerCase()
    if (h.includes('item') && (h.includes('#') || h.includes('no') || h === 'item')) {
      columnMap.sku = index
    } else if (h.includes('description') || h.includes('descripcion') || h.includes('nombre') || h.includes('product')) {
      columnMap.name = index
    } else if (h.includes('brand') || h.includes('marca')) {
      columnMap.brand = index
    } else if (h.includes('pack') || h.includes('cantidad') || h.includes('qty')) {
      columnMap.pack = index
    } else if (h.includes('size') || h.includes('tamaño') || h.includes('peso') || h.includes('weight')) {
      columnMap.size = index
    } else if (h.includes('price') || h.includes('precio') || h.includes('cost')) {
      columnMap.price = index
    } else if (h.includes('split')) {
      columnMap.split = index
    } else if (h.includes('category') || h.includes('categoria')) {
      columnMap.category = index
    }
  })
  
  return columnMap
}

/**
 * Extract cell value from row safely
 */
function getCellValue(row: any[], index: number | undefined, defaultValue = ''): string {
  if (index === undefined) return defaultValue
  return String(row[index] || '').trim()
}

/**
 * Parse a single product row from Excel data
 */
function parseProductRow(row: any[], columnMap: ColumnMap): ParsedProductRow | null {
  const sku = getCellValue(row, columnMap.sku)
  const name = getCellValue(row, columnMap.name)
  const brand = getCellValue(row, columnMap.brand)
  const pack = getCellValue(row, columnMap.pack)
  const size = getCellValue(row, columnMap.size)
  const priceStr = getCellValue(row, columnMap.price, '0')
  const split = getCellValue(row, columnMap.split).toLowerCase() === 'yes'
  const categoryFromExcel = getCellValue(row, columnMap.category).toUpperCase()
  
  // Parse price
  const price = Number.parseFloat(priceStr.replaceAll(/[^0-9.-]/g, '')) || 0
  
  // Build description
  let description = ''
  if (brand) description += `Marca: ${brand}. `
  if (pack) description += `Pack: ${pack}. `
  if (size) description += `Tamaño: ${size}. `
  if (split) description += `Divisible: Sí. `
  description = description.trim()
  
  // Build product name
  const productName = name || `${brand} - ${sku}`.trim() || `Producto ${sku}`
  
  if (!productName || productName === ' - ' || productName === 'Producto ') {
    return null
  }
  
  // Determine category
  const validCategories = Object.values(ProductCategory)
  const category = (categoryFromExcel && validCategories.includes(categoryFromExcel as ProductCategory))
    ? categoryFromExcel as ProductCategory
    : autoClassifyCategory(productName, description)
  
  return {
    sku,
    name,
    brand,
    pack,
    size,
    price,
    split,
    categoryFromExcel,
    productName,
    description,
    category
  }
}

/**
 * Process a single product row - create or update in database
 */
async function processProductRow(
  parsed: ParsedProductRow,
  sellerId: string,
  updateExisting: boolean
): Promise<ProcessRowResult> {
  // Check if product exists
  let existingProduct = null
  if (parsed.sku) {
    existingProduct = await prisma.product.findFirst({
      where: { 
        sku: parsed.sku,
        sellers: { some: { sellerId } }
      }
    })
  }
  
  if (existingProduct) {
    if (updateExisting) {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          name: parsed.productName,
          description: parsed.description || existingProduct.description,
          price: parsed.price || existingProduct.price,
          category: parsed.category,
          updatedAt: new Date()
        }
      })
      return { 
        success: true, 
        action: 'updated', 
        product: { ...existingProduct, price: parsed.price, category: parsed.category } 
      }
    }
    return { 
      success: true, 
      action: 'skipped', 
      product: { ...existingProduct, price: parsed.price } 
    }
  }
  
  // Create new product
  const newProduct = await prisma.product.create({
    data: {
      name: parsed.productName,
      description: parsed.description || null,
      price: parsed.price,
      sku: parsed.sku || null,
      category: parsed.category,
      stock: 999,
      isActive: true,
      sellers: {
        create: {
          sellerId,
          sellerPrice: parsed.price,
          isAvailable: true
        }
      }
    }
  })
  
  return { 
    success: true, 
    action: 'created', 
    product: { ...newProduct, price: parsed.price, category: parsed.category } 
  }
}

/**
 * Associate products with a client
 */
async function associateProductsToClient(
  products: any[],
  clientId: string,
  sellerId: string
): Promise<number> {
  const client = await prisma.client.findFirst({
    where: { id: clientId, sellerId }
  })
  
  if (!client) return 0
  
  let associated = 0
  for (const product of products) {
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
  return associated
}

// ============================================================================
// Authentication and Validation Helpers
// ============================================================================

/**
 * Get authenticated seller from user ID
 */
async function getAuthenticatedSeller(userId: string) {
  const authUser = await prisma.authenticated_users.findFirst({
    where: { authId: userId },
    include: { sellers: true }
  })

  if (!authUser || authUser.sellers.length === 0) {
    return null
  }

  return authUser.sellers[0]
}

/**
 * Validate required columns exist in Excel file
 */
function validateRequiredColumns(columnMap: ColumnMap, headers: string[]): { valid: boolean; error?: string; headers?: string[] } {
  if (columnMap.name === undefined && columnMap.sku === undefined) {
    return {
      valid: false,
      error: 'El archivo debe tener al menos una columna de Description o Item #',
      headers
    }
  }
  return { valid: true }
}

// ============================================================================
// Row Processing Helpers
// ============================================================================

interface ProcessingResult {
  createdProducts: any[]
  existingProducts: any[]
  errors: string[]
  created: number
  updated: number
  skipped: number
}

/**
 * Process a single row from Excel data
 */
async function processSingleRow(
  row: any,
  rowIndex: number,
  columnMap: ColumnMap,
  headerRowIndex: number,
  sellerId: string,
  updateExisting: boolean
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    createdProducts: [],
    existingProducts: [],
    errors: [],
    created: 0,
    updated: 0,
    skipped: 0
  }

  const isEmptyRow = !row || !Array.isArray(row) || row.every(cell => !cell)
  if (isEmptyRow) {
    return result
  }

  try {
    const parsed = parseProductRow(row, columnMap)
    if (!parsed) {
      result.errors.push(`Fila ${rowIndex + headerRowIndex + 2}: Producto sin nombre ni SKU`)
      result.skipped++
      return result
    }

    const processResult = await processProductRow(parsed, sellerId, updateExisting)

    if (processResult.action === 'created') {
      result.createdProducts.push(processResult.product)
      result.created++
    } else if (processResult.action === 'updated') {
      result.existingProducts.push(processResult.product)
      result.updated++
    } else {
      result.existingProducts.push(processResult.product)
      result.skipped++
    }
  } catch (err: any) {
    result.errors.push(`Fila ${rowIndex + headerRowIndex + 2}: ${err.message}`)
    result.skipped++
  }

  return result
}

/**
 * Process all data rows from Excel
 */
async function processAllDataRows(
  dataRows: any[],
  columnMap: ColumnMap,
  headerRowIndex: number,
  sellerId: string,
  updateExisting: boolean
): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    createdProducts: [],
    existingProducts: [],
    errors: [],
    created: 0,
    updated: 0,
    skipped: 0
  }

  for (let i = 0; i < dataRows.length; i++) {
    const rowResult = await processSingleRow(
      dataRows[i], i, columnMap, headerRowIndex, sellerId, updateExisting
    )
    
    result.errors.push(...rowResult.errors)
    result.createdProducts.push(...rowResult.createdProducts)
    result.existingProducts.push(...rowResult.existingProducts)
    result.created += rowResult.created
    result.updated += rowResult.updated
    result.skipped += rowResult.skipped
  }

  return result
}

/**
 * Parse Excel file and extract raw data
 */
function parseExcelFile(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  return XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[]
}

/**
 * Build success response for import
 */
function buildImportResponse(
  result: ProcessingResult,
  totalRows: number,
  clientId: string | null,
  headers: string[],
  columnMap: ColumnMap
) {
  const allProductsToAssociate = [...result.createdProducts, ...result.existingProducts]
  
  return {
    success: true,
    message: 'Importación completada',
    stats: {
      total: totalRows,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.length,
      associatedToClient: clientId ? allProductsToAssociate.length : 0
    },
    errors: result.errors.slice(0, 10),
    headers,
    columnMapping: columnMap
  }
}

// ============================================================================
// Main POST Handler
// ============================================================================

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

    const seller = await getAuthenticatedSeller(userId)
    if (!seller) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const clientId = formData.get('clientId') as string | null
    const updateExisting = formData.get('updateExisting') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const rawData = parseExcelFile(buffer)

    const headerResult = findHeaderRow(rawData)
    if (!headerResult.success) {
      return NextResponse.json({ error: headerResult.error }, { status: 400 })
    }

    const { headerRowIndex, headers } = headerResult
    const columnMap = mapColumns(headers)

    const columnsValidation = validateRequiredColumns(columnMap, headers)
    if (!columnsValidation.valid) {
      return NextResponse.json({ error: columnsValidation.error, headers }, { status: 400 })
    }

    const dataRows = rawData.slice(headerRowIndex + 1)
    const result = await processAllDataRows(dataRows, columnMap, headerRowIndex, seller.id, updateExisting)

    const allProductsToAssociate = [...result.createdProducts, ...result.existingProducts]
    if (clientId && allProductsToAssociate.length > 0) {
      await associateProductsToClient(allProductsToAssociate, clientId, seller.id)
    }

    return NextResponse.json(buildImportResponse(result, dataRows.length, clientId, headers, columnMap))
  } catch (error: any) {
    console.error('❌ Error importando productos:', error)
    return NextResponse.json({ error: 'Error procesando archivo: ' + error.message }, { status: 500 })
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
