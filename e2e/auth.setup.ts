import { test as setup, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const clientAuthFile = 'e2e/.auth/client.json'
const sellerAuthFile = 'e2e/.auth/seller.json'

// Asegurar que el directorio .auth existe
const authDir = path.dirname(clientAuthFile)
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true })
}

setup('authenticate as CLIENT', async ({ page }) => {
  console.log('🔐 Autenticando como CLIENT...')
  
  // Ir a la página de login
  await page.goto('http://localhost:3000/sign-in')
  
  // Esperar a que cargue el formulario de Clerk
  await page.waitForSelector('input[name="identifier"]', { timeout: 10000 })
  
  // Llenar credenciales
  await page.fill('input[name="identifier"]', 'test-client@crm-test.com')
  await page.click('button:has-text("Continue")')
  
  // Esperar el campo de password
  await page.waitForSelector('input[name="password"]', { timeout: 5000 })
  await page.fill('input[name="password"]', 'Test123456!')
  
  // Click en Sign In
  await page.click('button:has-text("Continue")')
  
  // Esperar redirección a buyer dashboard
  await page.waitForURL('**/buyer/**', { timeout: 15000 })
  
  // Verificar que estamos autenticados
  const url = page.url()
  expect(url).toContain('/buyer')
  
  console.log(`✅ CLIENT autenticado: ${url}`)
  
  // Guardar estado de autenticación
  await page.context().storageState({ path: clientAuthFile })
  
  console.log(`💾 Estado guardado en: ${clientAuthFile}`)
  
  // Esperar 3 segundos antes de siguiente login para evitar rate limit
  await page.waitForTimeout(3000)
})

setup('authenticate as SELLER', async ({ page }) => {
  console.log('🔐 Autenticando como SELLER...')
  
  // Ir a la página de login
  await page.goto('http://localhost:3000/sign-in')
  
  // Esperar a que cargue el formulario de Clerk
  await page.waitForSelector('input[name="identifier"]', { timeout: 10000 })
  
  // Llenar credenciales
  await page.fill('input[name="identifier"]', 'test-seller@crm-test.com')
  await page.click('button:has-text("Continue")')
  
  // Esperar el campo de password
  await page.waitForSelector('input[name="password"]', { timeout: 5000 })
  await page.fill('input[name="password"]', 'Test123456!')
  
  // Click en Sign In
  await page.click('button:has-text("Continue")')
  
  // Esperar redirección a seller dashboard
  await page.waitForURL('**/dashboard**', { timeout: 15000 })
  
  // Verificar que estamos autenticados
  const url = page.url()
  expect(url).toMatch(/\/dashboard/)
  
  console.log(`✅ SELLER autenticado: ${url}`)
  
  // Guardar estado de autenticación
  await page.context().storageState({ path: sellerAuthFile })
  
  console.log(`💾 Estado guardado en: ${sellerAuthFile}`)
})
