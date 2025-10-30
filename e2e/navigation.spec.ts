import { test, expect } from '@playwright/test'

test.describe('Buyer Navigation - Bug Detection', () => {
  test.use({ storageState: 'e2e/.auth/client.json' })

  test('should stay in buyer area when navigating between sections', async ({ page }) => {
    // Ir a dashboard de buyer
    await page.goto('/buyer/dashboard')
    await expect(page).toHaveURL(/\/buyer\/dashboard/)

    // Navegar a Catálogo
    const catalogLink = page.locator('a[href*="/buyer/catalog"]').first()
    if (await catalogLink.isVisible()) {
      await catalogLink.click()
      await page.waitForURL(/\/buyer\/catalog/)
      
      // ✅ DEBE permanecer en /buyer/catalog
      await expect(page).toHaveURL(/\/buyer\/catalog/)
      // ❌ NO debe redirigir a /dashboard (seller area)
      await expect(page).not.toHaveURL(/^\/dashboard$/)
    }

    // Navegar a Órdenes
    const ordersLink = page.locator('a[href*="/buyer/orders"]').first()
    if (await ordersLink.isVisible()) {
      await ordersLink.click()
      await page.waitForURL(/\/buyer\/orders/)
      
      await expect(page).toHaveURL(/\/buyer\/orders/)
      await expect(page).not.toHaveURL(/^\/dashboard$/)
    }

    // Navegar a Órdenes Recurrentes
    const recurringLink = page.locator('a[href*="/buyer/recurring-orders"]').first()
    if (await recurringLink.isVisible()) {
      await recurringLink.click()
      await page.waitForURL(/\/buyer\/recurring-orders/)
      
      await expect(page).toHaveURL(/\/buyer\/recurring-orders/)
      await expect(page).not.toHaveURL(/^\/dashboard$/)
    }

    // Navegar a Cotizaciones
    const quotesLink = page.locator('a[href*="/buyer/quotes"]').first()
    if (await quotesLink.isVisible()) {
      await quotesLink.click()
      await page.waitForURL(/\/buyer\/quotes/)
      
      await expect(page).toHaveURL(/\/buyer\/quotes/)
      await expect(page).not.toHaveURL(/^\/dashboard$/)
    }

    // Navegar a Devoluciones
    const returnsLink = page.locator('a[href*="/buyer/returns"]').first()
    if (await returnsLink.isVisible()) {
      await returnsLink.click()
      await page.waitForURL(/\/buyer\/returns/)
      
      await expect(page).toHaveURL(/\/buyer\/returns/)
      await expect(page).not.toHaveURL(/^\/dashboard$/)
    }
  })

  test('buyer should not access seller routes', async ({ page }) => {
    // Intentar acceder directamente a rutas de seller
    await page.goto('/dashboard')
    
    // Debería redirigir a buyer dashboard
    await page.waitForURL(/\/buyer\/dashboard/)
    await expect(page).toHaveURL(/\/buyer\/dashboard/)
  })

  test('buyer navigation bar should be visible', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Verificar que hay navegación de buyer
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
    
    // Verificar links de navegación buyer
    await expect(page.locator('text=Dashboard')).toBeVisible()
  })
})

test.describe('Seller Navigation', () => {
  test.use({ storageState: 'e2e/.auth/seller.json' })

  test('seller should stay in seller area', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    // Navegar a Clientes
    const clientsLink = page.locator('a[href*="/clients"]').first()
    if (await clientsLink.isVisible()) {
      await clientsLink.click()
      await page.waitForURL(/\/clients/)
      
      await expect(page).toHaveURL(/\/clients/)
      await expect(page).not.toHaveURL(/\/buyer/)
    }

    // Navegar a Productos
    const productsLink = page.locator('a[href*="/products"]').first()
    if (await productsLink.isVisible()) {
      await productsLink.click()
      await page.waitForURL(/\/products/)
      
      await expect(page).toHaveURL(/\/products/)
      await expect(page).not.toHaveURL(/\/buyer/)
    }
  })

  test('seller should not access buyer routes', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Debería redirigir a seller dashboard
    await page.waitForURL(/\/dashboard/)
    await expect(page).toHaveURL(/^\/dashboard$/)
  })
})

test.describe('Role-based redirects', () => {
  test('CLIENT role redirects to buyer from root', async ({ page }) => {
    // Simular CLIENT
    await page.goto('/')
    await page.waitForURL(/\/buyer\/dashboard/)
    await expect(page).toHaveURL(/\/buyer\/dashboard/)
  })

  test('unauthorized access shows appropriate redirect', async ({ page }) => {
    // Test que las rutas protegidas redirigen correctamente
    await page.goto('/buyer/catalog')
    
    // Debe estar en una ruta válida (buyer o login)
    await page.waitForLoadState('networkidle')
    const url = page.url()
    const isValidRoute = url.includes('/buyer/') || url.includes('/sign-in')
    expect(isValidRoute).toBe(true)
  })
})
