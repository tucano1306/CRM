import {
  signInSchema,
  signUpSchema,
  createClientSchema,
  updateClientSchema,
  createProductSchema,
  updateProductSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  createQuoteSchema,
  acceptQuoteSchema,
  rejectQuoteSchema,
  createReturnSchema,
  approveReturnSchema,
  rejectReturnSchema,
  createRecurringOrderSchema,
  createCreditNoteSchema,
  useCreditNoteSchema,
} from '@/lib/validations'

describe('Validation Schemas', () => {
  describe('signInSchema', () => {
    it('should validate correct sign-in data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
      }

      const result = signInSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'password123',
      }

      const result = signInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Email inválido')
      }
    })

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'short',
      }

      const result = signInSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos 8 caracteres')
      }
    })
  })

  describe('signUpSchema', () => {
    it('should validate correct sign-up data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
        role: 'CLIENT' as const,
      }

      const result = signUpSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should use default role if not provided', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
        name: 'John Doe',
      }

      const result = signUpSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.role).toBe('CLIENT')
      }
    })

    it('should reject short name', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'password123',
        name: 'J',
      }

      const result = signUpSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('createClientSchema', () => {
    it('should validate correct client data', () => {
      const validData = {
        name: 'John Doe',
        address: '123 Main Street',
        phone: '+1234567890',
        email: 'client@example.com',
      }

      const result = createClientSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        name: 'John Doe',
        address: '123 Main Street',
        phone: '+1234567890',
        email: 'invalid',
      }

      const result = createClientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject short address', () => {
      const invalidData = {
        name: 'John Doe',
        address: '123',
        phone: '+1234567890',
        email: 'client@example.com',
      }

      const result = createClientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mínimo 5 caracteres')
      }
    })

    it('should validate phone number format', () => {
      const invalidData = {
        name: 'John Doe',
        address: '123 Main Street',
        phone: 'abc',
        email: 'client@example.com',
      }

      const result = createClientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mínimo 8')
      }
    })

    it('should accept valid phone formats', () => {
      const validFormats = [
        '+507 6789-1234',
        '(507) 6789-1234',
        '6789-1234',
        '+1 234 567 8900',
      ]

      validFormats.forEach((phone) => {
        const data = {
          name: 'John Doe',
          address: '123 Main Street',
          phone,
          email: 'client@example.com',
        }
        const result = createClientSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should use default values for optional boolean fields', () => {
      const data = {
        name: 'John Doe',
        address: '123 Main Street',
        phone: '+1234567890',
        email: 'client@example.com',
      }

      const result = createClientSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.orderConfirmationEnabled).toBe(true)
        expect(result.data.orderConfirmationMethod).toBe('MANUAL')
        expect(result.data.notificationsEnabled).toBe(true)
      }
    })
  })

  describe('updateClientSchema', () => {
    it('should allow partial updates', () => {
      const partialData = {
        name: 'Updated Name',
      }

      const result = updateClientSchema.safeParse(partialData)
      expect(result.success).toBe(true)
    })

    it('should validate updated fields', () => {
      const invalidData = {
        email: 'invalid-email',
      }

      const result = updateClientSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('createProductSchema', () => {
    it('should validate correct product data', () => {
      const validData = {
        name: 'Test Product',
        price: 10.99,
        stock: 100,
        unit: 'case' as const,
      }

      const result = createProductSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject negative price', () => {
      const invalidData = {
        name: 'Test Product',
        price: -10,
        stock: 100,
      }

      const result = createProductSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('mayor a 0')
      }
    })

    it('should reject negative stock', () => {
      const invalidData = {
        name: 'Test Product',
        price: 10.99,
        stock: -5,
      }

      const result = createProductSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('no puede ser negativo')
      }
    })

    it('should reject non-integer stock', () => {
      const invalidData = {
        name: 'Test Product',
        price: 10.99,
        stock: 10.5,
      }

      const result = createProductSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('número entero')
      }
    })

    it('should validate unit enum', () => {
      const validUnits = ['case', 'unit', 'kg', 'lb', 'box', 'pk']

      validUnits.forEach((unit) => {
        const data = {
          name: 'Test Product',
          price: 10.99,
          stock: 100,
          unit,
        }
        const result = createProductSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid unit', () => {
      const invalidData = {
        name: 'Test Product',
        price: 10.99,
        stock: 100,
        unit: 'invalid',
      }

      const result = createProductSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should use default values', () => {
      const data = {
        name: 'Test Product',
        price: 10.99,
        stock: 100,
      }

      const result = createProductSchema.safeParse(data)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.unit).toBe('case')
        expect(result.data.isActive).toBe(true)
      }
    })

    it('should validate imageUrl format', () => {
      const invalidData = {
        name: 'Test Product',
        price: 10.99,
        stock: 100,
        imageUrl: 'not-a-url',
      }

      const result = createProductSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept empty string for imageUrl', () => {
      const data = {
        name: 'Test Product',
        price: 10.99,
        stock: 100,
        imageUrl: '',
      }

      const result = createProductSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('updateProductSchema', () => {
    it('should allow partial updates', () => {
      const partialData = {
        price: 15.99,
      }

      const result = updateProductSchema.safeParse(partialData)
      expect(result.success).toBe(true)
    })
  })

  describe('createOrderSchema', () => {
    it('should validate correct order data', () => {
      const validData = {
        clientId: '123e4567-e89b-12d3-a456-426614174000',
        sellerId: '123e4567-e89b-12d3-a456-426614174001',
        notes: 'Test order',
      }

      const result = createOrderSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const invalidData = {
        clientId: 'not-a-uuid',
      }

      const result = createOrderSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('UUID válido')
      }
    })

    it('should limit notes length', () => {
      const invalidData = {
        notes: 'a'.repeat(501),
      }

      const result = createOrderSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500 caracteres')
      }
    })
  })

  describe('updateOrderStatusSchema', () => {
    it('should validate correct status', () => {
      const validStatuses = [
        'PENDING',
        'CONFIRMED',
        'PREPARING',
        'READY_FOR_PICKUP',
        'IN_DELIVERY',
        'DELIVERED',
        'COMPLETED',
        'CANCELED',
      ]

      validStatuses.forEach((status) => {
        const data = { status }
        const result = updateOrderStatusSchema.safeParse(data)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'INVALID_STATUS',
      }

      const result = updateOrderStatusSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('cancelOrderSchema', () => {
    it('should validate correct cancel reason', () => {
      const validData = {
        reason: 'Customer requested cancellation due to change of plans',
      }

      const result = cancelOrderSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject short reason', () => {
      const invalidData = {
        reason: 'Short',
      }

      const result = cancelOrderSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos 10 caracteres')
      }
    })

    it('should reject long reason', () => {
      const invalidData = {
        reason: 'a'.repeat(501),
      }

      const result = cancelOrderSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500 caracteres')
      }
    })
  })

  describe('Helper Functions', () => {
    const { validateSchema, validateQueryParams } = require('@/lib/validations')

    describe('validateSchema', () => {
      it('should return success for valid data', () => {
        const validData = {
          email: 'test@example.com',
          password: 'password123'
        }

        const result = validateSchema(signInSchema, validData)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toEqual(validData)
        }
      })

      it('should return errors for invalid data', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'short'
        }

        const result = validateSchema(signInSchema, invalidData)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors).toBeInstanceOf(Array)
          expect(result.errors.length).toBeGreaterThan(0)
        }
      })

      it('should format error messages with path', () => {
        const invalidData = {
          email: 'invalid-email',
          password: 'password123'
        }

        const result = validateSchema(signInSchema, invalidData)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors[0]).toContain('email:')
        }
      })

      it('should handle nested object validation errors', () => {
        const invalidData = {
          name: 'J',  // Too short
          address: '123 Main Street',
          phone: '+1234567890',
          email: 'client@example.com'
        }

        const result = validateSchema(createClientSchema, invalidData)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors.length).toBeGreaterThan(0)
        }
      })
    })

    describe('validateQueryParams', () => {
      it('should validate URLSearchParams successfully', () => {
        const searchParams = new URLSearchParams({
          page: '1',
          limit: '10',
          sortOrder: 'desc'
        })

        const { paginationSchema } = require('@/lib/validations')
        const result = validateQueryParams(paginationSchema, searchParams)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.page).toBe(1)
          expect(result.data.limit).toBe(10)
        }
      })

      it('should convert string numbers to numbers', () => {
        const searchParams = new URLSearchParams({
          page: '2',
          limit: '20'
        })

        const { paginationSchema } = require('@/lib/validations')
        const result = validateQueryParams(paginationSchema, searchParams)
        
        expect(result.success).toBe(true)
        if (result.success) {
          expect(typeof result.data.page).toBe('number')
          expect(typeof result.data.limit).toBe('number')
        }
      })

      it('should return errors for invalid query params', () => {
        const searchParams = new URLSearchParams({
          page: 'invalid',
          limit: '-5'
        })

        const { paginationSchema } = require('@/lib/validations')
        const result = validateQueryParams(paginationSchema, searchParams)
        
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.errors.length).toBeGreaterThan(0)
        }
      })

      it('should handle empty URLSearchParams', () => {
        const searchParams = new URLSearchParams()

        const { paginationSchema } = require('@/lib/validations')
        const result = validateQueryParams(paginationSchema, searchParams)
        
        // Should use default values
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.page).toBe(1)
          expect(result.data.limit).toBe(10)
        }
      })
    })
  })

  describe('createQuoteSchema', () => {
    it('should validate correct quote data', () => {
      const validData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Monthly Food Supply Quote',
        description: 'Quote for monthly food supply',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440001',
            productName: 'Fresh Vegetables',
            quantity: 5,
            pricePerUnit: 100.50,
            notes: 'Special request',
          },
        ],
        validUntil: '2025-12-31T23:59:59Z',
        notes: 'Quote notes',
      }

      const result = createQuoteSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject quote without items', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Empty Quote',
        items: [],
      }

      const result = createQuoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('menos')
      }
    })

    it('should reject invalid client ID', () => {
      const invalidData = {
        clientId: 'not-a-uuid',
        title: 'Test Quote',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440001',
            productName: 'Product',
            quantity: 1,
            pricePerUnit: 100,
          },
        ],
      }

      const result = createQuoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('UUID')
      }
    })

    it('should reject invalid product quantity', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Quote',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440001',
            productName: 'Product',
            quantity: 0,
            pricePerUnit: 100,
          },
        ],
      }

      const result = createQuoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject negative prices', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Quote',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440001',
            productName: 'Product',
            quantity: 1,
            pricePerUnit: -50,
          },
        ],
      }

      const result = createQuoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('acceptQuoteSchema', () => {
    it('should validate quote acceptance', () => {
      const validData = {
        status: 'ACCEPTED' as const,
      }

      const result = acceptQuoteSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const invalidData = {
        status: 'INVALID',
      }

      const result = acceptQuoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('rejectQuoteSchema', () => {
    it('should validate quote rejection', () => {
      const validData = {
        status: 'REJECTED' as const,
        reason: 'Price too high for current budget',
      }

      const result = rejectQuoteSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject short rejection reason', () => {
      const invalidData = {
        status: 'REJECTED' as const,
        reason: 'Too short',
      }

      const result = rejectQuoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('10 caracteres')
      }
    })
  })

  describe('createReturnSchema', () => {
    it('should validate correct return data', () => {
      const validData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'DAMAGED' as const,
        reasonDescription: 'Product arrived with significant damage',
        refundType: 'CREDIT' as const,
        items: [
          {
            orderItemId: '550e8400-e29b-41d4-a716-446655440001',
            quantityReturned: 2,
            notes: 'Items were damaged during shipping',
          },
        ],
        notes: 'Please inspect carefully',
      }

      const result = createReturnSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject return without items', () => {
      const invalidData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'DAMAGED',
        refundType: 'CREDIT',
        items: [],
      }

      const result = createReturnSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid return reason', () => {
      const invalidData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'INVALID_REASON',
        refundType: 'CREDIT',
        items: [
          {
            orderItemId: '550e8400-e29b-41d4-a716-446655440001',
            quantityReturned: 1,
          },
        ],
      }

      const result = createReturnSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject zero or negative quantity', () => {
      const invalidData = {
        orderId: '550e8400-e29b-41d4-a716-446655440000',
        reason: 'DAMAGED',
        refundType: 'CREDIT',
        items: [
          {
            orderItemId: '550e8400-e29b-41d4-a716-446655440001',
            quantityReturned: 0,
          },
        ],
      }

      const result = createReturnSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('approveReturnSchema', () => {
    it('should validate return approval', () => {
      const validData = {
        refundMethod: 'CREDIT' as const,
        notes: 'Approved for full credit',
      }

      const result = approveReturnSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should allow approval without notes', () => {
      const validData = {
        refundMethod: 'REFUND' as const,
      }

      const result = approveReturnSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid refund method', () => {
      const invalidData = {
        refundMethod: 'INVALID',
      }

      const result = approveReturnSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('rejectReturnSchema', () => {
    it('should validate return rejection', () => {
      const validData = {
        reason: 'Items not damaged upon inspection, customer error',
        notes: 'Inspection photos attached',
      }

      const result = rejectReturnSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should require rejection reason of minimum length', () => {
      const invalidData = {
        reason: 'Too short',
      }

      const result = rejectReturnSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('20 caracteres')
      }
    })
  })

  describe('createRecurringOrderSchema', () => {
    it('should validate correct recurring order data', () => {
      const validData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Weekly Food Supply',
        frequency: 'WEEKLY' as const,
        dayOfWeek: 1,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440001',
            quantity: 10,
            pricePerUnit: 50.00,
          },
        ],
        deliveryInstructions: 'Leave at back door',
        notes: 'Recurring weekly order',
      }

      const result = createRecurringOrderSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject invalid frequency', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Order',
        frequency: 'INVALID',
        startDate: '2025-01-01T00:00:00Z',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440001',
            quantity: 1,
            pricePerUnit: 10,
          },
        ],
      }

      const result = createRecurringOrderSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid day of week', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Order',
        frequency: 'WEEKLY',
        dayOfWeek: 7, // Should be 0-6
        startDate: '2025-01-01T00:00:00Z',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440001',
            quantity: 1,
            pricePerUnit: 10,
          },
        ],
      }

      const result = createRecurringOrderSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid day of month', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Order',
        frequency: 'MONTHLY',
        dayOfMonth: 32, // Should be 1-31
        startDate: '2025-01-01T00:00:00Z',
        items: [
          {
            productId: '550e8400-e29b-41d4-a716-446655440001',
            quantity: 1,
            pricePerUnit: 10,
          },
        ],
      }

      const result = createRecurringOrderSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject recurring order without items', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Order',
        frequency: 'WEEKLY',
        startDate: '2025-01-01T00:00:00Z',
        items: [],
      }

      const result = createRecurringOrderSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('createCreditNoteSchema', () => {
    it('should validate correct credit note data', () => {
      const validData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 150.75,
        reason: 'Product return approved and processed',
        returnId: '550e8400-e29b-41d4-a716-446655440001',
        expiresAt: '2025-12-31T23:59:59Z',
      }

      const result = createCreditNoteSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject negative amount', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        amount: -50,
        reason: 'Test credit note',
      }

      const result = createCreditNoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject zero amount', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 0,
        reason: 'Test credit note',
      }

      const result = createCreditNoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should require reason of minimum length', () => {
      const invalidData = {
        clientId: '550e8400-e29b-41d4-a716-446655440000',
        amount: 100,
        reason: 'Short',
      }

      const result = createCreditNoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('10 caracteres')
      }
    })
  })

  describe('useCreditNoteSchema', () => {
    it('should validate credit note usage', () => {
      const validData = {
        creditNoteId: '550e8400-e29b-41d4-a716-446655440000',
        orderId: '550e8400-e29b-41d4-a716-446655440001',
        amountUsed: 50.25,
      }

      const result = useCreditNoteSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject negative amount used', () => {
      const invalidData = {
        creditNoteId: '550e8400-e29b-41d4-a716-446655440000',
        orderId: '550e8400-e29b-41d4-a716-446655440001',
        amountUsed: -10,
      }

      const result = useCreditNoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject zero amount used', () => {
      const invalidData = {
        creditNoteId: '550e8400-e29b-41d4-a716-446655440000',
        orderId: '550e8400-e29b-41d4-a716-446655440001',
        amountUsed: 0,
      }

      const result = useCreditNoteSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
