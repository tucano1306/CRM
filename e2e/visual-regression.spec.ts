import { test, expect } from '@playwright/test'

// ⚠️ TESTS DESHABILITADOS: Requieren autenticación con Clerk
// Issue: El componente <SignIn /> de Clerk no carga en Playwright
// TODO: Resolver integración Clerk + Playwright antes de habilitar

test.describe.skip('Visual Regression Tests - Estilos UI', () => {
  test('buyer dashboard visual snapshot', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Screenshot completo
    await expect(page).toHaveScreenshot('buyer-dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('seller dashboard visual snapshot', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('seller-dashboard.png', {
      fullPage: true,
      maxDiffPixels: 100,
    })
  })

  test('responsive design - mobile view', async ({ page }) => {
    // Simular mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/buyer/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Verificar que el menú hamburguesa existe en mobile
    const mobileMenu = page.locator('[aria-label="Menu"], button[aria-expanded]')
    await expect(mobileMenu).toBeVisible()
    
    // Screenshot mobile
    await expect(page).toHaveScreenshot('buyer-dashboard-mobile.png', {
      fullPage: true,
    })
  })

  test('responsive design - tablet view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await page.goto('/buyer/dashboard')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('buyer-dashboard-tablet.png', {
      fullPage: true,
    })
  })

  test('responsive design - desktop view', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    await page.goto('/buyer/dashboard')
    await page.waitForLoadState('networkidle')
    
    await expect(page).toHaveScreenshot('buyer-dashboard-desktop.png', {
      fullPage: true,
    })
  })

  test('dark mode toggle (if implemented)', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Buscar toggle de dark mode
    const darkModeToggle = page.locator('[aria-label*="dark"], [aria-label*="theme"]').first()
    
    if (await darkModeToggle.isVisible()) {
      // Screenshot light mode
      await expect(page).toHaveScreenshot('dashboard-light-mode.png')
      
      // Activar dark mode
      await darkModeToggle.click()
      await page.waitForTimeout(500) // Wait for transition
      
      // Screenshot dark mode
      await expect(page).toHaveScreenshot('dashboard-dark-mode.png')
    }
  })

  test('verify critical UI elements have correct styles', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Verificar que botones principales tengan estilos correctos
    const primaryButton = page.locator('button').first()
    if (await primaryButton.isVisible()) {
      const styles = await primaryButton.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          padding: computed.padding,
          borderRadius: computed.borderRadius,
        }
      })
      
      // Verificar que tiene background color (no transparente)
      expect(styles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')
      
      // Verificar que tiene padding
      expect(styles.padding).not.toBe('0px')
    }
  })

  test('verify typography consistency', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Verificar headings
    const h1 = page.locator('h1').first()
    if (await h1.isVisible()) {
      const fontSize = await h1.evaluate((el) => 
        window.getComputedStyle(el).fontSize
      )
      
      // H1 debe ser mayor a 20px
      const size = parseInt(fontSize)
      expect(size).toBeGreaterThan(20)
    }
  })

  test('verify color contrast for accessibility', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Verificar contraste de texto
    const textElements = page.locator('p, span, div').filter({ hasText: /.+/ })
    const firstText = textElements.first()
    
    if (await firstText.isVisible()) {
      const contrast = await firstText.evaluate((el) => {
        const style = window.getComputedStyle(el)
        const color = style.color
        const bgColor = style.backgroundColor
        
        // Función simple de contraste
        const getLuminance = (rgb: string) => {
          const matches = rgb.match(/\d+/g)
          if (!matches) return 0
          const [r, g, b] = matches.map(Number)
          return (0.299 * r + 0.587 * g + 0.114 * b) / 255
        }
        
        return {
          color,
          bgColor,
          colorLuminance: getLuminance(color),
          bgLuminance: getLuminance(bgColor),
        }
      })
      
      // Debe haber diferencia de luminancia
      const diff = Math.abs(contrast.colorLuminance - contrast.bgLuminance)
      expect(diff).toBeGreaterThan(0.1)
    }
  })

  test('verify no horizontal scrollbar on standard viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.goto('/buyer/dashboard')
    await page.waitForLoadState('networkidle')
    
    // Verificar que no hay scroll horizontal
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth)
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5) // 5px tolerance
  })

  test('verify animations are smooth', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Buscar elementos con transition
    const hasTransitions = await page.evaluate(() => {
      const elements = document.querySelectorAll('*')
      let count = 0
      
      elements.forEach((el) => {
        const style = window.getComputedStyle(el)
        if (style.transition !== 'all 0s ease 0s' && style.transition !== 'none') {
          count++
        }
      })
      
      return count > 0
    })
    
    // Debe tener al menos algunas transiciones
    expect(hasTransitions).toBe(true)
  })
})

test.describe.skip('Component Visual Tests', () => {
  test('modal renders correctly', async ({ page }) => {
    await page.goto('/buyer/orders')
    
    // Buscar y abrir modal (si existe)
    const orderButton = page.locator('button:has-text("Ver"), button:has-text("Detalles")').first()
    
    if (await orderButton.isVisible()) {
      await orderButton.click()
      await page.waitForTimeout(300) // Wait for modal animation
      
      // Screenshot del modal
      const modal = page.locator('[role="dialog"], .modal').first()
      if (await modal.isVisible()) {
        await expect(modal).toHaveScreenshot('order-modal.png')
      }
    }
  })

  test('form inputs have consistent styling', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Buscar inputs
    const inputs = page.locator('input[type="text"], input[type="email"], textarea')
    const firstInput = inputs.first()
    
    if (await firstInput.isVisible()) {
      const styles = await firstInput.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          border: computed.border,
          padding: computed.padding,
          borderRadius: computed.borderRadius,
        }
      })
      
      // Debe tener border
      expect(styles.border).not.toBe('0px none rgb(0, 0, 0)')
      
      // Debe tener padding
      expect(styles.padding).not.toBe('0px')
    }
  })

  test('cards have shadow and proper spacing', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // Buscar cards
    const cards = page.locator('[class*="card"], [class*="Card"]')
    const firstCard = cards.first()
    
    if (await firstCard.isVisible()) {
      const styles = await firstCard.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          boxShadow: computed.boxShadow,
          margin: computed.margin,
          padding: computed.padding,
        }
      })
      
      // Debe tener algo de sombra o borde
      const hasStyling = styles.boxShadow !== 'none' || styles.padding !== '0px'
      expect(hasStyling).toBe(true)
    }
  })
})
