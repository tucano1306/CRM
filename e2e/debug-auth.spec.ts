import { test } from '@playwright/test'

test('debug sign-in page', async ({ page }) => {
  await page.goto('http://localhost:3000/sign-in')
  
  // Esperar 5 segundos para que cargue completamente
  await page.waitForTimeout(5000)
  
  // Tomar screenshot
  await page.screenshot({ path: 'test-results/sign-in-page.png', fullPage: true })
  
  // Imprimir el HTML
  const html = await page.content()
  console.log('=== HTML CONTENT ===')
  console.log(html)
  
  // Buscar inputs
  const inputs = await page.locator('input').all()
  console.log(`\n=== FOUND ${inputs.length} INPUTS ===`)
  for (const input of inputs) {
    const name = await input.getAttribute('name')
    const type = await input.getAttribute('type')
    const id = await input.getAttribute('id')
    console.log(`  - name="${name}" type="${type}" id="${id}"`)
  }
})
