import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'
import * as path from 'path'

const prisma = new PrismaClient()

async function importCatalog() {
  try {
    console.log('📋 Importando catálogo desde Excel...\n')
    
    // Ruta al archivo Excel
    const excelPath = 'c:\\Users\\tucan\\Downloads\\FACTORIA DE AZUCAR 1.xlsx'
    
    console.log(`📂 Buscando archivo: ${excelPath}`)
    
    // Leer el archivo Excel
    const workbook = XLSX.readFile(excelPath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet)
    
    console.log(`✅ Archivo leído. Productos encontrados: ${data.length}\n`)
    
    // Obtener el vendedor (asumiendo que hay uno)
    const seller = await prisma.seller.findFirst()
    if (!seller) {
      console.log('❌ No hay vendedor registrado')
      return
    }
    console.log(`🏪 Vendedor: ${seller.name}\n`)
    
    // Obtener los clientes
    const clients = await prisma.client.findMany({
      where: { sellerId: seller.id }
    })
    
    if (clients.length === 0) {
      console.log('❌ No hay clientes registrados')
      return
    }
    
    console.log(`👥 Clientes encontrados: ${clients.length}`)
    clients.forEach(c => console.log(`   - ${c.name} (${c.email})`))
    console.log('')
    
    let productsCreated = 0
    let assignmentsCreated = 0
    
    // Procesar cada producto del Excel
    for (const row of data as any[]) {
      // Ajusta estos nombres según las columnas de tu Excel
      const name = row['Nombre'] || row['nombre'] || row['NOMBRE'] || row['Name']
      const price = parseFloat(row['Precio'] || row['precio'] || row['PRECIO'] || row['Price'] || '0')
      const description = row['Descripción'] || row['descripcion'] || row['Description'] || ''
      const sku = row['SKU'] || row['sku'] || row['Código'] || row['codigo'] || ''
      const stock = parseInt(row['Stock'] || row['stock'] || row['Existencia'] || '0')
      
      if (!name) {
        console.log(`⚠️ Fila sin nombre, ignorando`)
        continue
      }
      
      // Crear el producto
      const product = await prisma.product.create({
        data: {
          name,
          description,
          price,
          sku: sku || undefined,
          stock,
          isActive: true,
          sellerId: seller.id,
          category: 'General'
        }
      })
      
      productsCreated++
      console.log(`✅ Producto creado: ${name} - $${price}`)
      
      // Asignar el producto a todos los clientes
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
    }
    
    console.log('\n✅ Importación completada:')
    console.log(`   - Productos creados: ${productsCreated}`)
    console.log(`   - Asignaciones creadas: ${assignmentsCreated}`)
    console.log(`   - Productos por cliente: ${assignmentsCreated / clients.length}`)
    
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error('\n❌ Archivo no encontrado.')
      console.log('\n📝 Instrucciones:')
      console.log('1. Guarda tu archivo Excel como "catalog.xlsx"')
      console.log('2. Colócalo en la raíz del proyecto (junto a package.json)')
      console.log('3. El archivo debe tener columnas: Nombre, Precio, Descripción (opcional), SKU (opcional), Stock (opcional)')
      console.log('4. Vuelve a ejecutar: npx tsx scripts/import-catalog.ts')
    } else {
      console.error('❌ Error:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

importCatalog()
