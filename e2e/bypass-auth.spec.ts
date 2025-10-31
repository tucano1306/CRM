/**
 * E2E Tests WITHOUT Clerk Authentication
 * 
 * Strategy: Test public routes and API endpoints that don't require auth
 * or use a test environment variable to bypass middleware checks
 */

import { test, expect } from '@playwright/test'

test.describe('Public Routes (No Auth Required)', () => {
  
  test('should load sign-in page', async ({ page }) => {
    await page.goto('/sign-in')
    
    // Verificar que la página carga
    await expect(page).toHaveTitle(/Food Order CRM/i)
    
    // Tomar screenshot para verificar
    await page.screenshot({ path: 'test-results/public-signin.png' })
  })
  
  test('should load sign-up page', async ({ page }) => {
    await page.goto('/sign-up')
    
    await expect(page).toHaveTitle(/Food Order CRM/i)
  })
})

test.describe('Middleware Behavior (Auth Edge Cases)', () => {
  
  test('should redirect to sign-in when accessing protected route without auth', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Debe redirigir a /sign-in
    await page.waitForURL('**/sign-in**')
    
    expect(page.url()).toContain('/sign-in')
  })
  
  test('should redirect buyer route when not authenticated', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Debe redirigir a /sign-in
    await page.waitForURL('**/sign-in**')
  })
})

/**
 * OPCIÓN 2: Tests con bypass de autenticación via ENV variable
 * Requiere modificar middleware.ts para detectar process.env.E2E_BYPASS_AUTH
 */
test.describe.skip('Protected Routes (with auth bypass)', () => {
  
  test.use({
    // Esto solo funcionaría si modificamos el middleware
    extraHTTPHeaders: {
      'X-Test-Bypass-Auth': 'true',
      'X-Test-User-Role': 'CLIENT'
    }
  })
  
  test('should access buyer dashboard with bypass', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Si el bypass funciona, deberíamos ver el dashboard
    await expect(page.locator('h1')).toContainText(/dashboard/i)
  })
})
