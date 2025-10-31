import {
  INVOICE_CONFIG,
  getSellerInfo,
  getInvoiceDefaults,
  getInvoiceTerms,
} from '@/lib/invoice-config'

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

  describe('getSellerInfo', () => {
    it('should return default seller info when no overrides', () => {
      const result = getSellerInfo()

      expect(result).toEqual({
        sellerName: 'Food Orders CRM',
        sellerAddress: '123 Calle Principal, Ciudad, Estado, CP 00000',
        sellerPhone: '(000) 000-0000',
        sellerEmail: 'contacto@foodorderscrm.com',
        sellerTaxId: 'RFC: XXXX000000XXX',
      })
    })

    it('should override seller name when provided', () => {
      const result = getSellerInfo({ name: 'Custom Company' })

      expect(result.sellerName).toBe('Custom Company')
      expect(result.sellerAddress).toBe(INVOICE_CONFIG.company.address)
      expect(result.sellerPhone).toBe(INVOICE_CONFIG.company.phone)
      expect(result.sellerEmail).toBe(INVOICE_CONFIG.company.email)
      expect(result.sellerTaxId).toBe(INVOICE_CONFIG.company.taxId)
    })

    it('should override seller email when provided', () => {
      const result = getSellerInfo({ email: 'custom@example.com' })

      expect(result.sellerName).toBe(INVOICE_CONFIG.company.name)
      expect(result.sellerEmail).toBe('custom@example.com')
    })

    it('should override seller phone when provided', () => {
      const result = getSellerInfo({ phone: '555-1234' })

      expect(result.sellerName).toBe(INVOICE_CONFIG.company.name)
      expect(result.sellerPhone).toBe('555-1234')
    })

    it('should override multiple fields when provided', () => {
      const result = getSellerInfo({
        name: 'Multi Override Co.',
        email: 'multi@example.com',
        phone: '555-9999',
      })

      expect(result).toEqual({
        sellerName: 'Multi Override Co.',
        sellerAddress: INVOICE_CONFIG.company.address,
        sellerPhone: '555-9999',
        sellerEmail: 'multi@example.com',
        sellerTaxId: INVOICE_CONFIG.company.taxId,
      })
    })

    it('should handle empty string overrides', () => {
      const result = getSellerInfo({ name: '' })

      // Empty string is falsy, so should use default
      expect(result.sellerName).toBe(INVOICE_CONFIG.company.name)
    })
  })

  describe('getInvoiceDefaults', () => {
    it('should return all invoice defaults', () => {
      const result = getInvoiceDefaults()

      expect(result).toEqual({
        taxRate: 0.10,
        paymentTermsDays: 30,
        currency: 'MXN',
        currencySymbol: '$',
      })
    })

    it('should return correct tax rate', () => {
      const result = getInvoiceDefaults()

      expect(result.taxRate).toBe(INVOICE_CONFIG.invoice.defaultTaxRate)
      expect(typeof result.taxRate).toBe('number')
      expect(result.taxRate).toBeGreaterThanOrEqual(0)
    })

    it('should return correct payment terms', () => {
      const result = getInvoiceDefaults()

      expect(result.paymentTermsDays).toBe(INVOICE_CONFIG.invoice.defaultPaymentTerms)
      expect(typeof result.paymentTermsDays).toBe('number')
      expect(Number.isInteger(result.paymentTermsDays)).toBe(true)
    })

    it('should return correct currency info', () => {
      const result = getInvoiceDefaults()

      expect(result.currency).toBe(INVOICE_CONFIG.invoice.currency)
      expect(result.currencySymbol).toBe(INVOICE_CONFIG.invoice.currencySymbol)
    })
  })

  describe('getInvoiceTerms', () => {
    it('should return all invoice terms', () => {
      const result = getInvoiceTerms()

      expect(result).toHaveProperty('paymentTerms')
      expect(result).toHaveProperty('termsAndConditions')
      expect(result).toHaveProperty('notes')
    })

    it('should return payment terms string', () => {
      const result = getInvoiceTerms()

      expect(result.paymentTerms).toBe(INVOICE_CONFIG.terms.payment)
      expect(typeof result.paymentTerms).toBe('string')
      expect(result.paymentTerms.length).toBeGreaterThan(0)
    })

    it('should join conditions with newlines', () => {
      const result = getInvoiceTerms()

      expect(result.termsAndConditions).toContain('\n')
      
      const lines = result.termsAndConditions.split('\n')
      expect(lines).toHaveLength(INVOICE_CONFIG.terms.conditions.length)
      
      INVOICE_CONFIG.terms.conditions.forEach((condition, index) => {
        expect(lines[index]).toBe(condition)
      })
    })

    it('should return notes string', () => {
      const result = getInvoiceTerms()

      expect(result.notes).toBe(INVOICE_CONFIG.terms.notes)
      expect(typeof result.notes).toBe('string')
      expect(result.notes.length).toBeGreaterThan(0)
    })

    it('should include all original conditions in joined string', () => {
      const result = getInvoiceTerms()

      INVOICE_CONFIG.terms.conditions.forEach(condition => {
        expect(result.termsAndConditions).toContain(condition)
      })
    })
  })
})
