import { getSeller, getClient, validateSellerClientRelation, validateSellerOrderRelation, validateClientOrderRelation, validateSellerProductRelation, UnauthorizedError } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    seller: {
      findFirst: jest.fn(),
    },
    client: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
    },
    productSeller: {
      findFirst: jest.fn(),
    },
    authenticated_users: {
      findFirst: jest.fn(),
    },
  },
}))

describe('auth-helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('UnauthorizedError', () => {
    it('should create error with default status code 403', () => {
      const error = new UnauthorizedError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(403)
      expect(error).toBeInstanceOf(Error)
    })

    it('should create error with custom status code', () => {
      const error = new UnauthorizedError('Test error', 401)
      expect(error.message).toBe('Test error')
      expect(error.statusCode).toBe(401)
    })
  })

  describe('getSeller', () => {
    it('should return seller when found', async () => {
      const mockSeller = {
        id: 'seller-123',
        businessName: 'Test Business',
      }

      ;(prisma.seller.findFirst as jest.Mock).mockResolvedValue(mockSeller)

      const result = await getSeller('user-123')

      expect(result).toEqual(mockSeller)
      expect(prisma.seller.findFirst).toHaveBeenCalledWith({
        where: {
          authenticated_users: {
            some: { authId: 'user-123' },
          },
        },
        include: {
          authenticated_users: true,
        },
      })
    })

    it('should throw UnauthorizedError when seller not found', async () => {
      ;(prisma.seller.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(getSeller('user-123')).rejects.toThrow(UnauthorizedError)
      await expect(getSeller('user-123')).rejects.toThrow('No tienes permisos')
    })

    it('should throw UnauthorizedError with 403 status code', async () => {
      ;(prisma.seller.findFirst as jest.Mock).mockResolvedValue(null)

      try {
        await getSeller('user-123')
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError)
        expect((error as UnauthorizedError).statusCode).toBe(403)
      }
    })
  })

  describe('getClient', () => {
    it('should return client when found', async () => {
      const mockAuthUser = {
        authId: 'user-123',
        clients: [{ id: 'client-123', fullName: 'Test Client' }],
      }

      ;(prisma.authenticated_users.findFirst as jest.Mock).mockResolvedValue(mockAuthUser)

      const result = await getClient('user-123')

      expect(result).toEqual(mockAuthUser.clients[0])
    })

    it('should throw UnauthorizedError when client not found', async () => {
      ;(prisma.authenticated_users.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(getClient('user-123')).rejects.toThrow(UnauthorizedError)
      await expect(getClient('user-123')).rejects.toThrow('No tienes permisos')
    })
  })

  describe('validateSellerClientRelation', () => {
    it('should return client when relation is valid', async () => {
      const mockClient = { id: 'client-123', sellerId: 'seller-123', name: 'Test Client' }

      ;(prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient)

      const result = await validateSellerClientRelation('seller-123', 'client-123')

      expect(result).toEqual(mockClient)
    })

    it('should throw UnauthorizedError when client not found', async () => {
      ;(prisma.client.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(validateSellerClientRelation('seller-123', 'client-456')).rejects.toThrow(UnauthorizedError)
      await expect(validateSellerClientRelation('seller-123', 'client-456')).rejects.toThrow('Cliente no encontrado')
    })

    it('should throw UnauthorizedError when client belongs to different seller', async () => {
      const mockClient = { id: 'client-123', sellerId: 'seller-999', name: 'Test Client' }

      ;(prisma.client.findUnique as jest.Mock).mockResolvedValue(mockClient)

      await expect(validateSellerClientRelation('seller-123', 'client-123')).rejects.toThrow(UnauthorizedError)
      await expect(validateSellerClientRelation('seller-123', 'client-123')).rejects.toThrow('No tienes permisos')
    })
  })

  describe('validateSellerOrderRelation', () => {
    it('should return order when relation is valid', async () => {
      const mockOrder = {
        id: 'order-123',
        sellerId: 'seller-123',
        orderNumber: 'ORD-001',
        client: { name: 'Test Client' }
      }

      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)

      const result = await validateSellerOrderRelation('seller-123', 'order-123')

      expect(result).toEqual(mockOrder)
      expect(result.sellerId).toBe('seller-123')
    })

    it('should throw UnauthorizedError when order not found', async () => {
      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(validateSellerOrderRelation('seller-123', 'order-456')).rejects.toThrow(UnauthorizedError)
      await expect(validateSellerOrderRelation('seller-123', 'order-456')).rejects.toThrow('Orden no encontrada')
    })

    it('should throw UnauthorizedError when order does not belong to seller', async () => {
      const mockOrder = {
        id: 'order-123',
        sellerId: 'seller-999',
        orderNumber: 'ORD-001',
        client: { name: 'Test Client' }
      }

      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)

      await expect(validateSellerOrderRelation('seller-123', 'order-123')).rejects.toThrow(UnauthorizedError)
      await expect(validateSellerOrderRelation('seller-123', 'order-123')).rejects.toThrow('No tienes permisos')
    })
  })

  describe('validateClientOrderRelation', () => {
    it('should return order when relation is valid', async () => {
      const mockOrder = {
        id: 'order-123',
        clientId: 'client-123',
        orderNumber: 'ORD-001'
      }

      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)

      const result = await validateClientOrderRelation('client-123', 'order-123')

      expect(result).toEqual(mockOrder)
      expect(result.clientId).toBe('client-123')
    })

    it('should throw UnauthorizedError when order not found', async () => {
      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(validateClientOrderRelation('client-123', 'order-456')).rejects.toThrow(UnauthorizedError)
      await expect(validateClientOrderRelation('client-123', 'order-456')).rejects.toThrow('Orden no encontrada')
    })

    it('should throw UnauthorizedError when order does not belong to client', async () => {
      const mockOrder = {
        id: 'order-123',
        clientId: 'client-999',
        orderNumber: 'ORD-001'
      }

      ;(prisma.order.findUnique as jest.Mock).mockResolvedValue(mockOrder)

      await expect(validateClientOrderRelation('client-123', 'order-123')).rejects.toThrow(UnauthorizedError)
      await expect(validateClientOrderRelation('client-123', 'order-123')).rejects.toThrow('No tienes permisos')
    })
  })

  describe('validateSellerProductRelation', () => {
    it('should return product when seller has access', async () => {
      const mockProductSeller = {
        sellerId: 'seller-123',
        productId: 'product-123',
        product: {
          id: 'product-123',
          name: 'Test Product',
          sku: 'SKU-123'
        }
      }

      ;(prisma.productSeller.findFirst as jest.Mock).mockResolvedValue(mockProductSeller)

      const result = await validateSellerProductRelation('seller-123', 'product-123')

      expect(result).toEqual(mockProductSeller.product)
      expect(result.name).toBe('Test Product')
    })

    it('should throw UnauthorizedError when seller does not have access to product', async () => {
      ;(prisma.productSeller.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(validateSellerProductRelation('seller-123', 'product-456')).rejects.toThrow(UnauthorizedError)
      await expect(validateSellerProductRelation('seller-123', 'product-456')).rejects.toThrow('No tienes permisos')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty userId in getSeller', async () => {
      ;(prisma.seller.findFirst as jest.Mock).mockResolvedValue(null)

      await expect(getSeller('')).rejects.toThrow(UnauthorizedError)
    })

    it('should throw when client not found in validation', async () => {
      ;(prisma.client.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(validateSellerClientRelation('seller-123', 'client-456')).rejects.toThrow(UnauthorizedError)
      await expect(validateSellerClientRelation('seller-123', 'client-456')).rejects.toThrow('Cliente no encontrado')
    })

    it('should handle database errors gracefully', async () => {
      ;(prisma.seller.findFirst as jest.Mock).mockRejectedValue(new Error('Database error'))

      await expect(getSeller('user-123')).rejects.toThrow('Database error')
    })
  })
})
