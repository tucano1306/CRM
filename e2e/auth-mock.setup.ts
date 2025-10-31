/**
 * Mock authentication setup for E2E tests
 * Bypasses Clerk UI by directly creating authentication storage state
 * 
 * Strategy: Use Clerk's API to get session tokens programmatically
 */

import { test as setup } from '@playwright/test'

// Mock storage state for CLIENT role
const clientStorageState = 'e2e/.auth/client-mock.json'
// Mock storage state for SELLER role
const sellerStorageState = 'e2e/.auth/seller-mock.json'

/**
 * Setup CLIENT authentication using Clerk API tokens
 */
setup('authenticate as CLIENT (mock)', async ({ request }) => {
  // TODO: Obtener token de Clerk API programáticamente
  // Por ahora, creamos un storage state básico
  
  const mockClientState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: '__clerk_db_jwt',
            value: 'mock-client-token', // Necesitaríamos un token real de Clerk API
          },
          {
            name: '__clerk_client_jwt',
            value: 'mock-client-session',
          }
        ]
      }
    ]
  }
  
  // Guardar storage state
  const fs = require('fs')
  const path = require('path')
  const authDir = path.dirname(clientStorageState)
  
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }
  
  fs.writeFileSync(clientStorageState, JSON.stringify(mockClientState, null, 2))
  
  console.log('✅ CLIENT mock authentication created')
})

/**
 * Setup SELLER authentication using Clerk API tokens
 */
setup('authenticate as SELLER (mock)', async ({ request }) => {
  const mockSellerState = {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: '__clerk_db_jwt',
            value: 'mock-seller-token',
          },
          {
            name: '__clerk_client_jwt',
            value: 'mock-seller-session',
          }
        ]
      }
    ]
  }
  
  const fs = require('fs')
  const path = require('path')
  const authDir = path.dirname(sellerStorageState)
  
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true })
  }
  
  fs.writeFileSync(sellerStorageState, JSON.stringify(mockSellerState, null, 2))
  
  console.log('✅ SELLER mock authentication created')
})

export { clientStorageState, sellerStorageState }
