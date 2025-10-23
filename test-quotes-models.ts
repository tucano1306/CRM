// Test script to verify Prisma client has Quote models
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testQuoteModels() {
  try {
    console.log('Testing Quote models...')
    
    // This should compile if the models exist
    const quoteCount = await prisma.quote.count()
    const quoteItemCount = await prisma.quoteItem.count()
    
    console.log('✅ Quote model exists - Count:', quoteCount)
    console.log('✅ QuoteItem model exists - Count:', quoteItemCount)
    console.log('✅ Prisma client successfully regenerated with Quote models!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testQuoteModels()
