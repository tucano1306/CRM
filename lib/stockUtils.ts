/**
 * Utilidades para gestión de stock de productos
 */

export interface StockAlert {
  level: 'critical' | 'low' | 'normal' | 'out'
  message: string
  color: 'red' | 'yellow' | 'green' | 'gray'
  bgColor: string
  textColor: string
  borderColor: string
}

/**
 * Verifica si un producto tiene stock bajo
 * @param stock - Cantidad actual en stock
 * @param threshold - Umbral para considerar stock bajo (default: 10)
 * @returns true si el stock está por debajo del umbral
 */
export function isLowStock(stock: number, threshold = 10): boolean {
  return stock > 0 && stock < threshold
}

/**
 * Verifica si un producto está agotado
 * @param stock - Cantidad actual en stock
 * @returns true si el stock es 0
 */
export function isOutOfStock(stock: number): boolean {
  return stock === 0
}

/**
 * Verifica si un producto tiene stock crítico
 * @param stock - Cantidad actual en stock
 * @param criticalThreshold - Umbral crítico (default: 5)
 * @returns true si el stock está en nivel crítico
 */
export function isCriticalStock(stock: number, criticalThreshold = 5): boolean {
  return stock > 0 && stock < criticalThreshold
}

/**
 * Obtiene un mensaje descriptivo del estado del stock
 * @param stock - Cantidad actual en stock
 * @returns Mensaje descriptivo del estado
 */
export function getStockAlertMessage(stock: number): string {
  if (stock === 0) return 'Sin stock'
  if (stock < 5) return 'Stock crítico'
  if (stock < 10) return 'Stock bajo'
  return 'Stock suficiente'
}

/**
 * Obtiene información completa del estado del stock
 * @param stock - Cantidad actual en stock
 * @returns Objeto con nivel, mensaje y colores para UI
 */
export function getStockAlert(stock: number): StockAlert {
  if (stock === 0) {
    return {
      level: 'out',
      message: '⚠️ Producto agotado',
      color: 'gray',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-700',
      borderColor: 'border-gray-300'
    }
  }

  if (stock < 5) {
    return {
      level: 'critical',
      message: '🚨 Stock crítico - Reabastecer urgente',
      color: 'red',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200'
    }
  }

  if (stock < 10) {
    return {
      level: 'low',
      message: '⚠️ Stock bajo - Considere reabastecer',
      color: 'yellow',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-200'
    }
  }

  return {
    level: 'normal',
    message: '✅ Stock suficiente',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  }
}

/**
 * Calcula el porcentaje de stock respecto a un máximo
 * @param stock - Cantidad actual en stock
 * @param maxStock - Cantidad máxima de stock (default: 100)
 * @returns Porcentaje entre 0 y 100
 */
export function getStockPercentage(stock: number, maxStock = 100): number {
  if (stock <= 0) return 0
  if (stock >= maxStock) return 100
  return Math.round((stock / maxStock) * 100)
}

/**
 * Obtiene el color CSS para la barra de progreso de stock
 * @param stock - Cantidad actual en stock
 * @returns Clase de Tailwind para el color
 */
export function getStockBarColor(stock: number): string {
  if (stock === 0) return 'bg-gray-400'
  if (stock < 5) return 'bg-red-500'
  if (stock < 10) return 'bg-yellow-500'
  return 'bg-green-500'
}

/**
 * Formatea la cantidad de stock con su unidad
 * @param stock - Cantidad en stock
 * @param unit - Unidad de medida (opcional)
 * @returns String formateado
 */
export function formatStock(stock: number, unit?: string): string {
  if (stock === 0) return 'Agotado'
  return unit ? `${stock} ${unit}${stock !== 1 ? 's' : ''}` : `${stock} unidades`
}

/**
 * Calcula si es necesario reordenar basado en stock y ventas
 * @param stock - Cantidad actual en stock
 * @param averageSales - Ventas promedio por período
 * @param daysToRestock - Días que tarda en llegar nuevo stock (default: 7)
 * @returns true si se debe reordenar
 */
export function shouldReorder(
  stock: number,
  averageSales: number,
  daysToRestock = 7
): boolean {
  const reorderPoint = averageSales * daysToRestock
  return stock <= reorderPoint
}

/**
 * Calcula la cantidad sugerida para reordenar
 * @param stock - Cantidad actual en stock
 * @param averageSales - Ventas promedio por período
 * @param daysToRestock - Días que tarda en llegar nuevo stock
 * @param targetDays - Días de stock que se quieren mantener (default: 30)
 * @returns Cantidad sugerida para reordenar
 */
export function calculateReorderQuantity(
  stock: number,
  averageSales: number,
  daysToRestock = 7,
  targetDays = 30
): number {
  const targetStock = averageSales * targetDays
  const safetyStock = averageSales * daysToRestock
  const reorderQuantity = targetStock + safetyStock - stock
  
  return Math.max(0, Math.ceil(reorderQuantity))
}

/**
 * Verifica si hay suficiente stock para una cantidad solicitada
 * @param stock - Cantidad actual en stock
 * @param requestedQuantity - Cantidad solicitada
 * @returns true si hay suficiente stock
 */
export function hasEnoughStock(stock: number, requestedQuantity: number): boolean {
  return stock >= requestedQuantity
}

/**
 * Obtiene la máxima cantidad disponible para ordenar
 * @param stock - Cantidad actual en stock
 * @param maxOrderQuantity - Límite máximo de orden (opcional)
 * @returns Cantidad máxima disponible
 */
export function getMaxAvailableQuantity(stock: number, maxOrderQuantity?: number): number {
  if (maxOrderQuantity) {
    return Math.min(stock, maxOrderQuantity)
  }
  return stock
}

/**
 * Calcula el valor total del inventario
 * @param stock - Cantidad en stock
 * @param price - Precio por unidad
 * @returns Valor total del inventario
 */
export function calculateInventoryValue(stock: number, price: number): number {
  return stock * price
}

/**
 * Genera estadísticas de stock para múltiples productos
 * @param products - Array de productos con stock y precio
 * @returns Objeto con estadísticas agregadas
 */
export function getStockStatistics(products: Array<{ stock: number; price: number }>) {
  const total = products.length
  const outOfStock = products.filter(p => p.stock === 0).length
  const lowStock = products.filter(p => p.stock > 0 && p.stock < 10).length
  const normalStock = total - outOfStock - lowStock
  const totalValue = products.reduce((sum, p) => sum + calculateInventoryValue(p.stock, p.price), 0)

  return {
    total,
    outOfStock,
    lowStock,
    normalStock,
    totalValue,
    outOfStockPercentage: (outOfStock / total) * 100,
    lowStockPercentage: (lowStock / total) * 100,
    normalStockPercentage: (normalStock / total) * 100
  }
}
