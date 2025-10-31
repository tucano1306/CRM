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
})
