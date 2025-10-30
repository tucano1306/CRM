import { test as setup } from '@playwright/test'

const clientAuthFile = 'e2e/.auth/client.json'
const sellerAuthFile = 'e2e/.auth/seller.json'

setup('authenticate as CLIENT', async ({ page }) => {
  // TODO: Implementar login como CLIENT
  // Por ahora, crear mock state
  await page.goto('/')
  
  await page.context().storageState({ path: clientAuthFile })
})

setup('authenticate as SELLER', async ({ page }) => {
  // TODO: Implementar login como SELLER
  // Por ahora, crear mock state
  await page.goto('/')
  
  await page.context().storageState({ path: sellerAuthFile })
})
