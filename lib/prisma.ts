import { PrismaClient } from '@prisma/client'

/**
 * Prisma Client singleton for consistent database connections.
 * 
 * - Uses DATABASE_URL from environment (Vercel Neon integration provides this automatically)
 * - In development: caches a single instance globally to avoid connection storms
 * - In production: creates fresh instance per serverless function invocation
 * 
 * Models: Client, Seller, Product, Order, Quote, Return, CreditNote, etc.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const createPrismaClient = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
  
  if (process.env.NODE_ENV === 'production') {
    console.log('🔄 [PRISMA] Creating new Prisma Client instance')
  }
  
  return client
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Cache singleton in development to prevent connection exhaustion during hot-reload
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma