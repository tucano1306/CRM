import {
  isLowStock,
  isOutOfStock,
  isCriticalStock,
  getStockAlertMessage,
  getStockAlert,
  getStockPercentage,
  getStockBarColor,
  formatStock,
  shouldReorder,
  calculateReorderQuantity,
  hasEnoughStock,
  getMaxAvailableQuantity,
  calculateInventoryValue,
  getStockStatistics,
} from '@/lib/stockUtils'

describe('Stock Utilities', () => {
  describe('isLowStock', () => {
    it('should return true when stock is low', () => {
      expect(isLowStock(5)).toBe(true)
      expect(isLowStock(9)).toBe(true)
    })

    it('should return false when stock is 0', () => {
      expect(isLowStock(0)).toBe(false)
    })

    it('should return false when stock is sufficient', () => {
      expect(isLowStock(10)).toBe(false)
      expect(isLowStock(50)).toBe(false)
    })

    it('should respect custom threshold', () => {
      expect(isLowStock(15, 20)).toBe(true)
      expect(isLowStock(25, 20)).toBe(false)
    })

    it('should return false for exactly threshold value', () => {
      expect(isLowStock(10, 10)).toBe(false)
    })
  })

  describe('isOutOfStock', () => {
    it('should return true when stock is 0', () => {
      expect(isOutOfStock(0)).toBe(true)
    })

    it('should return false when stock is greater than 0', () => {
      expect(isOutOfStock(1)).toBe(false)
      expect(isOutOfStock(100)).toBe(false)
    })

    it('should handle negative values', () => {
      expect(isOutOfStock(-1)).toBe(false)
    })
  })

  describe('isCriticalStock', () => {
    it('should return true for critical stock levels', () => {
      expect(isCriticalStock(1)).toBe(true)
      expect(isCriticalStock(4)).toBe(true)
    })

    it('should return false when stock is 0', () => {
      expect(isCriticalStock(0)).toBe(false)
    })

    it('should return false when stock is sufficient', () => {
      expect(isCriticalStock(5)).toBe(false)
      expect(isCriticalStock(10)).toBe(false)
    })

    it('should respect custom critical threshold', () => {
      expect(isCriticalStock(7, 10)).toBe(true)
      expect(isCriticalStock(12, 10)).toBe(false)
    })
  })

  describe('getStockAlertMessage', () => {
    it('should return "Sin stock" when stock is 0', () => {
      expect(getStockAlertMessage(0)).toBe('Sin stock')
    })

    it('should return "Stock crítico" for very low stock', () => {
      expect(getStockAlertMessage(1)).toBe('Stock crítico')
      expect(getStockAlertMessage(4)).toBe('Stock crítico')
    })

    it('should return "Stock bajo" for low stock', () => {
      expect(getStockAlertMessage(5)).toBe('Stock bajo')
      expect(getStockAlertMessage(9)).toBe('Stock bajo')
    })

    it('should return "Stock suficiente" for normal stock', () => {
      expect(getStockAlertMessage(10)).toBe('Stock suficiente')
      expect(getStockAlertMessage(100)).toBe('Stock suficiente')
    })
  })

  describe('getStockAlert', () => {
    it('should return out-of-stock alert when stock is 0', () => {
      const alert = getStockAlert(0)

      expect(alert.level).toBe('out')
      expect(alert.message).toContain('agotado')
      expect(alert.color).toBe('gray')
      expect(alert.bgColor).toBe('bg-gray-100')
      expect(alert.textColor).toBe('text-gray-700')
      expect(alert.borderColor).toBe('border-gray-300')
    })

    it('should return critical alert for very low stock', () => {
      const alert = getStockAlert(3)

      expect(alert.level).toBe('critical')
      expect(alert.message).toContain('crítico')
      expect(alert.color).toBe('red')
      expect(alert.bgColor).toBe('bg-red-50')
    })

    it('should return low stock alert', () => {
      const alert = getStockAlert(7)

      expect(alert.level).toBe('low')
      expect(alert.message).toContain('bajo')
      expect(alert.color).toBe('yellow')
      expect(alert.bgColor).toBe('bg-yellow-50')
    })

    it('should return normal stock alert', () => {
      const alert = getStockAlert(50)

      expect(alert.level).toBe('normal')
      expect(alert.message).toContain('suficiente')
      expect(alert.color).toBe('green')
      expect(alert.bgColor).toBe('bg-green-50')
    })

    it('should include all required properties', () => {
      const alert = getStockAlert(10)

      expect(alert).toHaveProperty('level')
      expect(alert).toHaveProperty('message')
      expect(alert).toHaveProperty('color')
      expect(alert).toHaveProperty('bgColor')
      expect(alert).toHaveProperty('textColor')
      expect(alert).toHaveProperty('borderColor')
    })
  })

  describe('hasEnoughStock', () => {
    it('should return true when stock is sufficient', () => {
      expect(hasEnoughStock(10, 5)).toBe(true)
      expect(hasEnoughStock(100, 50)).toBe(true)
    })

    it('should return true when stock exactly matches quantity', () => {
      expect(hasEnoughStock(10, 10)).toBe(true)
    })

    it('should return false when stock is insufficient', () => {
      expect(hasEnoughStock(5, 10)).toBe(false)
      expect(hasEnoughStock(0, 1)).toBe(false)
    })

    it('should handle 0 quantity', () => {
      expect(hasEnoughStock(10, 0)).toBe(true)
    })

    it('should handle negative values correctly', () => {
      expect(hasEnoughStock(-5, 10)).toBe(false)
      expect(hasEnoughStock(10, -5)).toBe(true)
    })
  })

  describe('getStockPercentage', () => {
    it('should calculate correct percentage', () => {
      expect(getStockPercentage(50, 100)).toBe(50)
      expect(getStockPercentage(25, 100)).toBe(25)
      expect(getStockPercentage(75, 100)).toBe(75)
    })

    it('should return 100 when current meets max', () => {
      expect(getStockPercentage(100, 100)).toBe(100)
    })

    it('should return 0 when stock is 0', () => {
      expect(getStockPercentage(0, 100)).toBe(0)
    })

    it('should cap at 100 when current exceeds max', () => {
      expect(getStockPercentage(150, 100)).toBe(100)
    })

    it('should use default max of 100', () => {
      expect(getStockPercentage(30)).toBe(30)
      expect(getStockPercentage(75)).toBe(75)
    })

    it('should handle decimal results', () => {
      const percentage = getStockPercentage(33, 100)
      
      expect(percentage).toBe(33)
    })

    it('should handle division by zero - returns 100 when max is 0', () => {
      // La implementación actual retorna >= maxStock = 100
      expect(getStockPercentage(50, 0)).toBe(100)
    })
  })

  describe('formatStock', () => {
    it('should return "Agotado" when stock is 0', () => {
      expect(formatStock(0)).toBe('Agotado')
      expect(formatStock(0, 'units')).toBe('Agotado')
    })

    it('should format with plural units', () => {
      expect(formatStock(5, 'box')).toBe('5 boxs')
      expect(formatStock(10, 'item')).toBe('10 items')
    })

    it('should format with singular unit for 1', () => {
      expect(formatStock(1, 'box')).toBe('1 box')
    })

    it('should use default "unidades" when no unit provided', () => {
      expect(formatStock(10)).toBe('10 unidades')
    })

    it('should handle large numbers', () => {
      expect(formatStock(1000, 'kg')).toBe('1000 kgs')
    })
  })

  describe('shouldReorder', () => {
    it('should return true when stock is below reorder point', () => {
      // averageSales: 10, daysToRestock: 7 => reorderPoint: 70
      expect(shouldReorder(50, 10, 7)).toBe(true)
    })

    it('should return false when stock is above reorder point', () => {
      expect(shouldReorder(100, 10, 7)).toBe(false)
    })

    it('should use default daysToRestock of 7', () => {
      expect(shouldReorder(60, 10)).toBe(true) // 60 < 70
    })

    it('should return true when stock equals reorder point', () => {
      expect(shouldReorder(70, 10, 7)).toBe(true)
    })
  })

  describe('calculateReorderQuantity', () => {
    it('should calculate correct reorder quantity', () => {
      // stock: 50, averageSales: 10, daysToRestock: 7, targetDays: 30
      // targetStock: 300, safetyStock: 70, reorderQuantity: 320
      const quantity = calculateReorderQuantity(50, 10, 7, 30)
      
      expect(quantity).toBe(320)
    })

    it('should return 0 when stock is sufficient', () => {
      const quantity = calculateReorderQuantity(500, 10, 7, 30)
      
      expect(quantity).toBe(0)
    })

    it('should use default values', () => {
      const quantity = calculateReorderQuantity(0, 10)
      
      expect(quantity).toBeGreaterThan(0)
    })

    it('should round up quantities', () => {
      const quantity = calculateReorderQuantity(100, 7.5, 7, 30)
      
      expect(Number.isInteger(quantity)).toBe(true)
    })
  })

  describe('getMaxAvailableQuantity', () => {
    it('should return stock when no max order quantity', () => {
      expect(getMaxAvailableQuantity(100)).toBe(100)
    })

    it('should return min of stock and max order quantity', () => {
      expect(getMaxAvailableQuantity(100, 50)).toBe(50)
      expect(getMaxAvailableQuantity(30, 50)).toBe(30)
    })

    it('should handle 0 stock', () => {
      expect(getMaxAvailableQuantity(0, 50)).toBe(0)
    })
  })

  describe('calculateInventoryValue', () => {
    it('should calculate total inventory value', () => {
      expect(calculateInventoryValue(10, 5)).toBe(50)
      expect(calculateInventoryValue(100, 2.5)).toBe(250)
    })

    it('should return 0 when stock is 0', () => {
      expect(calculateInventoryValue(0, 100)).toBe(0)
    })

    it('should handle decimal prices', () => {
      expect(calculateInventoryValue(7, 1.99)).toBeCloseTo(13.93)
    })
  })

  describe('getStockStatistics', () => {
    it('should calculate statistics correctly', () => {
      const products = [
        { stock: 0, price: 10 },
        { stock: 5, price: 20 },
        { stock: 50, price: 15 },
        { stock: 100, price: 25 },
      ]

      const stats = getStockStatistics(products)

      expect(stats.total).toBe(4)
      expect(stats.outOfStock).toBe(1)
      expect(stats.lowStock).toBe(1)
      expect(stats.normalStock).toBe(2)
      expect(stats.totalValue).toBe(0 + 100 + 750 + 2500)
    })

    it('should calculate percentages', () => {
      const products = [
        { stock: 0, price: 10 },
        { stock: 0, price: 10 },
        { stock: 5, price: 10 },
        { stock: 50, price: 10 },
      ]

      const stats = getStockStatistics(products)

      expect(stats.outOfStockPercentage).toBe(50)
      expect(stats.lowStockPercentage).toBe(25)
      expect(stats.normalStockPercentage).toBe(25)
    })

    it('should handle empty array', () => {
      const stats = getStockStatistics([])

      expect(stats.total).toBe(0)
      expect(isNaN(stats.outOfStockPercentage)).toBe(true)
    })
  })

  describe('getStockBarColor', () => {
    it('should return gray for 0 stock', () => {
      expect(getStockBarColor(0)).toBe('bg-gray-400')
    })

    it('should return red for critical stock', () => {
      expect(getStockBarColor(4)).toBe('bg-red-500')
    })

    it('should return yellow for low stock', () => {
      expect(getStockBarColor(7)).toBe('bg-yellow-500')
    })

    it('should return green for normal stock', () => {
      expect(getStockBarColor(50)).toBe('bg-green-500')
    })
  })
})
