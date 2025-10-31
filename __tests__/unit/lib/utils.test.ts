import { cn, formatNumber, formatPrice } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className merger)', () => {
    it('should merge class names', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'active', false && 'hidden')
      expect(result).toBe('base active')
    })

    it('should merge Tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4')
      expect(result).toBe('py-1 px-4')
    })

    it('should handle arrays', () => {
      const result = cn(['class1', 'class2'], 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle objects', () => {
      const result = cn({ active: true, hidden: false })
      expect(result).toBe('active')
    })

    it('should handle empty input', () => {
      const result = cn()
      expect(result).toBe('')
    })

    it('should handle null and undefined', () => {
      const result = cn('class1', null, undefined, 'class2')
      expect(result).toBe('class1 class2')
    })
  })

  describe('formatNumber', () => {
    it('should format number with thousands separator', () => {
      expect(formatNumber(1000)).toBe('1.000,00')
      expect(formatNumber(1000000)).toBe('1.000.000,00')
    })

    it('should format number with 2 decimals by default', () => {
      expect(formatNumber(1234.56)).toBe('1.234,56')
      expect(formatNumber(1234.5)).toBe('1.234,50')
    })

    it('should handle custom decimal places', () => {
      expect(formatNumber(1234.567, 0)).toBe('1.235')
      expect(formatNumber(1234.567, 1)).toBe('1.234,6')
      expect(formatNumber(1234.567, 3)).toBe('1.234,567')
    })

    it('should handle string input', () => {
      expect(formatNumber('1234.56')).toBe('1.234,56')
      expect(formatNumber('1000')).toBe('1.000,00')
    })

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0,00')
      expect(formatNumber('0')).toBe('0,00')
    })

    it('should handle negative numbers', () => {
      expect(formatNumber(-1234.56)).toBe('-1.234,56')
      expect(formatNumber(-1000000)).toBe('-1.000.000,00')
    })

    it('should handle invalid input', () => {
      expect(formatNumber('invalid')).toBe('0')
      expect(formatNumber(NaN)).toBe('0')
    })

    it('should handle very large numbers', () => {
      expect(formatNumber(123456789.99)).toBe('123.456.789,99')
    })

    it('should handle very small numbers', () => {
      expect(formatNumber(0.01)).toBe('0,01')
      expect(formatNumber(0.001, 3)).toBe('0,001')
    })

    it('should round correctly', () => {
      expect(formatNumber(1234.555, 2)).toBe('1.234,56') // Rounds up
      expect(formatNumber(1234.554, 2)).toBe('1.234,55') // Rounds down
    })
  })

  describe('formatPrice', () => {
    it('should format price with default currency symbol', () => {
      expect(formatPrice(1234.56)).toBe('$1.234,56')
      expect(formatPrice(1000)).toBe('$1.000,00')
    })

    it('should format price with custom currency symbol', () => {
      expect(formatPrice(1234.56, '€')).toBe('€1.234,56')
      expect(formatPrice(1234.56, 'B/.')).toBe('B/.1.234,56')
      expect(formatPrice(1234.56, 'USD ')).toBe('USD 1.234,56')
    })

    it('should handle string input', () => {
      expect(formatPrice('1234.56')).toBe('$1.234,56')
    })

    it('should handle zero', () => {
      expect(formatPrice(0)).toBe('$0,00')
    })

    it('should handle negative prices', () => {
      expect(formatPrice(-1234.56)).toBe('$-1.234,56')
    })

    it('should always show 2 decimals', () => {
      expect(formatPrice(10)).toBe('$10,00')
      expect(formatPrice(10.5)).toBe('$10,50')
      expect(formatPrice(10.999)).toBe('$11,00')
    })

    it('should handle invalid input', () => {
      const result = formatPrice('invalid')
      // formatPrice calls formatNumber which returns '0' for invalid input
      // then adds '$' prefix, so result could be '$0' or '$0,00' depending on implementation
      expect(result.startsWith('$')).toBe(true)
      expect(result).toMatch(/^\$0/)
    })

    it('should handle very large amounts', () => {
      expect(formatPrice(123456789.99)).toBe('$123.456.789,99')
    })

    it('should handle very small amounts', () => {
      expect(formatPrice(0.01)).toBe('$0,01')
      expect(formatPrice(0.99)).toBe('$0,99')
    })

    it('should work with empty currency symbol', () => {
      expect(formatPrice(1234.56, '')).toBe('1.234,56')
    })
  })

  describe('Edge cases and integration', () => {
    it('should handle formatNumber with 0 decimals', () => {
      expect(formatNumber(1234.56, 0)).toBe('1.235')
      expect(formatNumber(1234.44, 0)).toBe('1.234')
    })

    it('should maintain precision for financial calculations', () => {
      const value = 10.5
      const formatted = formatNumber(value)
      expect(formatted).toBe('10,50')
      
      const price = formatPrice(value)
      expect(price).toBe('$10,50')
    })

    it('should handle boundary values', () => {
      expect(formatNumber(Number.MAX_SAFE_INTEGER)).not.toBe('0')
      expect(formatNumber(Number.MIN_SAFE_INTEGER)).not.toBe('0')
      expect(formatNumber(0.000001, 6)).toBe('0,000001')
    })
  })
})
