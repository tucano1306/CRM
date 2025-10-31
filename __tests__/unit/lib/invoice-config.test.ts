import { INVOICE_CONFIG } from '@/lib/invoice-config'

describe('Invoice Configuration', () => {
  describe('INVOICE_CONFIG', () => {
    it('should have company information', () => {
      expect(INVOICE_CONFIG.company).toBeDefined()
      expect(INVOICE_CONFIG.company.name).toBe('Food Orders CRM')
      expect(INVOICE_CONFIG.company.legalName).toBeDefined()
      expect(INVOICE_CONFIG.company.address).toBeDefined()
      expect(INVOICE_CONFIG.company.phone).toBeDefined()
      expect(INVOICE_CONFIG.company.email).toBeDefined()
      expect(INVOICE_CONFIG.company.taxId).toBeDefined()
    })

    it('should have invoice settings', () => {
      expect(INVOICE_CONFIG.invoice).toBeDefined()
      expect(INVOICE_CONFIG.invoice.defaultTaxRate).toBe(0.10)
      expect(INVOICE_CONFIG.invoice.defaultPaymentTerms).toBe(30)
      expect(INVOICE_CONFIG.invoice.currency).toBe('MXN')
      expect(INVOICE_CONFIG.invoice.currencySymbol).toBe('$')
    })

    it('should have terms and conditions', () => {
      expect(INVOICE_CONFIG.terms).toBeDefined()
      expect(INVOICE_CONFIG.terms.payment).toBeDefined()
      expect(Array.isArray(INVOICE_CONFIG.terms.conditions)).toBe(true)
      expect(INVOICE_CONFIG.terms.conditions.length).toBeGreaterThan(0)
      expect(INVOICE_CONFIG.terms.notes).toBeDefined()
    })

    it('should have banking information', () => {
      expect(INVOICE_CONFIG.banking).toBeDefined()
      expect(INVOICE_CONFIG.banking.bankName).toBeDefined()
      expect(INVOICE_CONFIG.banking.accountNumber).toBeDefined()
      expect(INVOICE_CONFIG.banking.clabe).toBeDefined()
    })

    it('should have valid tax rate', () => {
      const taxRate = INVOICE_CONFIG.invoice.defaultTaxRate
      
      expect(typeof taxRate).toBe('number')
      expect(taxRate).toBeGreaterThanOrEqual(0)
      expect(taxRate).toBeLessThanOrEqual(1)
    })

    it('should have valid payment terms', () => {
      const paymentTerms = INVOICE_CONFIG.invoice.defaultPaymentTerms
      
      expect(typeof paymentTerms).toBe('number')
      expect(paymentTerms).toBeGreaterThan(0)
    })

    it('should have valid email format', () => {
      const email = INVOICE_CONFIG.company.email
      
      expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    })

    it('should have all required company fields', () => {
      expect(INVOICE_CONFIG.company.name).toBeTruthy()
      expect(INVOICE_CONFIG.company.legalName).toBeTruthy()
      expect(INVOICE_CONFIG.company.address).toBeTruthy()
      expect(INVOICE_CONFIG.company.phone).toBeTruthy()
      expect(INVOICE_CONFIG.company.email).toBeTruthy()
      expect(INVOICE_CONFIG.company.website).toBeTruthy()
      expect(INVOICE_CONFIG.company.taxId).toBeTruthy()
      expect(INVOICE_CONFIG.company.logo).toBeTruthy()
    })

    it('should have non-empty terms conditions', () => {
      INVOICE_CONFIG.terms.conditions.forEach((condition) => {
        expect(condition).toBeTruthy()
        expect(condition.length).toBeGreaterThan(0)
      })
    })

    it('should have valid currency code', () => {
      expect(INVOICE_CONFIG.invoice.currency).toBe('MXN')
      expect(INVOICE_CONFIG.invoice.currencySymbol).toBe('$')
    })
  })
})
