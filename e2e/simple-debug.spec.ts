import { test } from '@playwright/test'

test.describe('Simple debug', () => {
  test('visit sign-in and take screenshot', async ({ page }) => {
    console.log('📍 Navegando a /sign-in')
    await page.goto('http://localhost:3000/sign-in')
    
    // Esperar 5 segundos
    await page.waitForTimeout(5000)
    
    console.log(`📍 URL actual: ${page.url()}`)
    
    // Tomar screenshot
    await page.screenshot({ path: 'test-results/sign-in-debug.png', fullPage: true })
    
    // Buscar todos los inputs
    const inputs = await page.locator('input').all()
    console.log(`\n=== FOUND ${inputs.length} INPUTS ===`)
    
    for (let i = 0; i < inputs.length && i < 10; i++) {
      const input = inputs[i]
      const name = await input.getAttribute('name')
      const type = await input.getAttribute('type')
      const placeholder = await input.getAttribute('placeholder')
      console.log(`  ${i+1}. name="${name}" type="${type}" placeholder="${placeholder}"`)
    }
  })
})
