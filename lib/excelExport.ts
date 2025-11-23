// lib/excelExport.ts
/**
 * 📊 Excel Export Helper
 * Utilidad para exportar datos a formato Excel (.xlsx)
 */

import * as XLSX from 'xlsx'

export interface ExcelColumn {
  header: string
  key: string
  width?: number
}

export interface ExcelSheet {
  name: string
  columns: ExcelColumn[]
  data: any[]
}

/**
 * Exportar datos a archivo Excel
 */
export function exportToExcel(sheets: ExcelSheet[], filename: string) {
  const workbook = XLSX.utils.book_new()

  sheets.forEach(({ name, columns, data }) => {
    // Crear headers
    const headers = columns.map(col => col.header)
    
    // Mapear datos según las keys de las columnas
    const rows = data.map(row => 
      columns.map(col => {
        const value = row[col.key]
        // Formatear valores especiales
        if (value instanceof Date) {
          return value.toLocaleDateString('es-ES')
        }
        if (typeof value === 'number' && col.key.includes('price') || col.key.includes('amount') || col.key.includes('total')) {
          return `$${value.toFixed(2)}`
        }
        return value ?? ''
      })
    )

    // Combinar headers y rows
    const worksheetData = [headers, ...rows]
    
    // Crear worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

    // Establecer ancho de columnas
    worksheet['!cols'] = columns.map(col => ({ 
      wch: col.width || 15 
    }))

    // Agregar al workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, name)
  })

  // Descargar archivo
  XLSX.writeFile(workbook, filename)
}

/**
 * Exportar ventas a Excel
 */
export function exportSalesReport(
  salesData: Array<{ date: string; orders: number; revenue: number }>,
  period: string
) {
  const totalOrders = salesData.reduce((sum, day) => sum + day.orders, 0)
  const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0)

  exportToExcel(
    [{
      name: 'Ventas',
      columns: [
        { header: 'Fecha', key: 'date', width: 15 },
        { header: 'Órdenes', key: 'orders', width: 12 },
        { header: 'Ingresos', key: 'revenue', width: 15 }
      ],
      data: [
        ...salesData,
        {},
        { date: 'TOTAL', orders: totalOrders, revenue: totalRevenue }
      ]
    }],
    `reporte-ventas-${period}-${new Date().toISOString().split('T')[0]}.xlsx`
  )
}

/**
 * Exportar productos a Excel
 */
export function exportProductsReport(
  topSelling: Array<{ productName: string; totalSold: number; totalRevenue: number; ordersCount: number }>,
  lowStock: Array<{ name: string; stock: number; price: number; sku: string | null }>,
  noSales: Array<{ name: string; stock: number; price: number }>
) {
  exportToExcel(
    [
      {
        name: 'Productos Top',
        columns: [
          { header: 'Producto', key: 'productName', width: 30 },
          { header: 'Cantidad Vendida', key: 'totalSold', width: 18 },
          { header: 'Ingresos', key: 'totalRevenue', width: 15 },
          { header: 'Órdenes', key: 'ordersCount', width: 12 }
        ],
        data: topSelling
      },
      {
        name: 'Bajo Stock',
        columns: [
          { header: 'SKU', key: 'sku', width: 15 },
          { header: 'Producto', key: 'name', width: 30 },
          { header: 'Stock', key: 'stock', width: 12 },
          { header: 'Precio', key: 'price', width: 15 }
        ],
        data: lowStock
      },
      {
        name: 'Sin Ventas',
        columns: [
          { header: 'Producto', key: 'name', width: 30 },
          { header: 'Stock', key: 'stock', width: 12 },
          { header: 'Precio', key: 'price', width: 15 }
        ],
        data: noSales
      }
    ],
    `reporte-productos-${new Date().toISOString().split('T')[0]}.xlsx`
  )
}

/**
 * Exportar clientes a Excel
 */
export function exportClientsReport(
  clients: Array<{
    name: string
    email: string
    phone: string | null
    address: string
    stats?: { totalOrders: number; totalSpent: number }
  }>
) {
  exportToExcel(
    [{
      name: 'Clientes',
      columns: [
        { header: 'Nombre', key: 'name', width: 25 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Teléfono', key: 'phone', width: 15 },
        { header: 'Dirección', key: 'address', width: 35 },
        { header: 'Total Órdenes', key: 'totalOrders', width: 15 },
        { header: 'Total Gastado', key: 'totalSpent', width: 18 }
      ],
      data: clients.map(client => ({
        ...client,
        totalOrders: client.stats?.totalOrders || 0,
        totalSpent: client.stats?.totalSpent || 0
      }))
    }],
    `reporte-clientes-${new Date().toISOString().split('T')[0]}.xlsx`
  )
}

/**
 * Exportar historial de un cliente a Excel
 */
export function exportClientHistory(
  clientName: string,
  orders: Array<{
    orderNumber: string
    createdAt: Date | string
    status: string
    totalAmount: number
    orderItems: Array<{ productName: string; quantity: number; pricePerUnit: number }>
  }>
) {
  // Preparar datos de órdenes
  const ordersData = orders.map(order => ({
    orderNumber: order.orderNumber,
    fecha: order.createdAt instanceof Date 
      ? order.createdAt.toLocaleDateString('es-ES')
      : new Date(order.createdAt).toLocaleDateString('es-ES'),
    status: order.status,
    items: order.orderItems.length,
    total: order.totalAmount
  }))

  // Preparar datos de productos comprados
  const productsMap = new Map<string, { quantity: number; total: number; times: number }>()
  orders.forEach(order => {
    order.orderItems.forEach(item => {
      const existing = productsMap.get(item.productName) || { quantity: 0, total: 0, times: 0 }
      productsMap.set(item.productName, {
        quantity: existing.quantity + item.quantity,
        total: existing.total + (item.quantity * item.pricePerUnit),
        times: existing.times + 1
      })
    })
  })

  const productsData = Array.from(productsMap.entries()).map(([name, stats]) => ({
    producto: name,
    cantidadTotal: stats.quantity,
    vecesComprado: stats.times,
    totalGastado: stats.total
  }))

  exportToExcel(
    [
      {
        name: 'Órdenes',
        columns: [
          { header: 'N° Orden', key: 'orderNumber', width: 20 },
          { header: 'Fecha', key: 'fecha', width: 15 },
          { header: 'Estado', key: 'status', width: 18 },
          { header: 'Items', key: 'items', width: 10 },
          { header: 'Total', key: 'total', width: 15 }
        ],
        data: ordersData
      },
      {
        name: 'Productos Comprados',
        columns: [
          { header: 'Producto', key: 'producto', width: 30 },
          { header: 'Cantidad Total', key: 'cantidadTotal', width: 18 },
          { header: 'Veces Comprado', key: 'vecesComprado', width: 18 },
          { header: 'Total Gastado', key: 'totalGastado', width: 18 }
        ],
        data: productsData.sort((a, b) => b.totalGastado - a.totalGastado)
      }
    ],
    `historial-${clientName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`
  )
}
