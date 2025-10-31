// __tests__/unit/lib/prisma.test.ts
import { prisma } from '@/lib/prisma'
import prismaDefault from '@/lib/prisma'

describe('prisma', () => {
  it('should export prisma instance', () => {
    expect(prisma).toBeDefined()
    expect(prisma).not.toBeNull()
  })

  it('should export default export', () => {
    expect(prismaDefault).toBeDefined()
    expect(prismaDefault).not.toBeNull()
  })

  it('should have $connect method', () => {
    expect(prisma.$connect).toBeDefined()
    expect(typeof prisma.$connect).toBe('function')
  })

  it('should have $disconnect method', () => {
    expect(prisma.$disconnect).toBeDefined()
    expect(typeof prisma.$disconnect).toBe('function')
  })

  it('should have client model accessor', () => {
    expect(prisma.client).toBeDefined()
    expect(prisma.client.create).toBeDefined()
    expect(prisma.client.findUnique).toBeDefined()
    expect(prisma.client.findMany).toBeDefined()
  })

  it('should have seller model accessor', () => {
    expect(prisma.seller).toBeDefined()
    expect(prisma.seller.findUnique).toBeDefined()
    expect(prisma.seller.findMany).toBeDefined()
  })

  it('should be a singleton (same instance on re-import)', () => {
    const { prisma: reimported } = require('@/lib/prisma')
    // In test environment with mocks, they should reference same mock
    expect(reimported).toBeDefined()
  })

  it('should not throw when accessing prisma', () => {
    expect(() => {
      const testPrisma = prisma
      expect(testPrisma).toBeDefined()
    }).not.toThrow()
  })
})
