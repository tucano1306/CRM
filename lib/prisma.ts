import { PrismaClient } from '@prisma/client'

// Prisma client con modelos: Quote, QuoteItem, QuoteStatus
// Cache invalidation timestamp: 2025-11-05T22:35:00Z
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
  
  // Force fresh connections on every cold start
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 [PRISMA] Creating new Prisma Client instance')
  }
  
  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma