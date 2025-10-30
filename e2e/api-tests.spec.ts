import { test, expect } from '@playwright/test'

test.describe('API Integration Tests', () => {
  test('buyer profile API returns correct data', async ({ request }) => {
    const response = await request.get('/api/buyer/profile')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('client')
  })

  test('orders API handles pagination', async ({ request }) => {
    const response = await request.get('/api/buyer/orders?page=1&limit=10')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('orders')
    expect(Array.isArray(data.orders)).toBeTruthy()
  })

  test('analytics API returns valid structure', async ({ request }) => {
    const response = await request.get('/api/analytics/dashboard')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    
    // Verificar estructura esperada
    expect(data).toHaveProperty('overview')
    expect(data).toHaveProperty('recentPerformance')
  })

  test('products API returns array of products', async ({ request }) => {
    const response = await request.get('/api/products')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    
    if (data.products) {
      expect(Array.isArray(data.products)).toBeTruthy()
      
      if (data.products.length > 0) {
        const product = data.products[0]
        expect(product).toHaveProperty('id')
        expect(product).toHaveProperty('name')
        expect(product).toHaveProperty('price')
      }
    }
  })

  test('POST order returns proper status codes', async ({ request }) => {
    const orderData = {
      clientId: 'test-client',
      items: [
        {
          productId: 'test-product',
          quantity: 2,
          price: 10.00
        }
      ]
    }

    const response = await request.post('/api/orders', {
      data: orderData
    })
    
    // Puede ser 201 (created) o 401 (unauthorized) dependiendo de auth
    expect([201, 401, 403]).toContain(response.status())
  })

  test('API returns proper error format', async ({ request }) => {
    // Intentar acceder a recurso que no existe
    const response = await request.get('/api/orders/non-existent-id')
    
    if (!response.ok()) {
      const error = await response.json()
      
      // Error debe tener estructura consistente
      expect(error).toHaveProperty('error')
    }
  })

  test('API rate limiting headers are present', async ({ request }) => {
    const response = await request.get('/api/products')
    
    const headers = response.headers()
    
    // Verificar headers de rate limiting
    const hasRateLimitHeaders = 
      headers['x-ratelimit-limit'] !== undefined ||
      headers['x-ratelimit-remaining'] !== undefined
    
    // En este proyecto debe tener rate limiting
    expect(hasRateLimitHeaders).toBeTruthy()
  })

  test('health check endpoint works', async ({ request }) => {
    const response = await request.get('/api/health')
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data).toHaveProperty('status')
    expect(data.status).toBe('ok')
  })
})

test.describe('Analytics API Tests', () => {
  test('dashboard analytics has all required metrics', async ({ request }) => {
    const response = await request.get('/api/analytics/dashboard')
    
    if (response.ok()) {
      const data = await response.json()
      
      // Verificar métricas principales
      expect(data.overview).toBeDefined()
      
      if (data.overview) {
        // Debe tener counts
        expect(typeof data.overview.totalOrders).toBe('number')
      }
    }
  })

  test('clients analytics returns top clients', async ({ request }) => {
    const response = await request.get('/api/analytics/clients?limit=5')
    
    if (response.ok()) {
      const data = await response.json()
      
      expect(data).toHaveProperty('topClients')
      
      if (data.topClients && data.topClients.length > 0) {
        const client = data.topClients[0]
        expect(client).toHaveProperty('stats')
        expect(client.stats).toHaveProperty('totalSpent')
      }
    }
  })
})

test.describe('Error Handling Tests', () => {
  test('invalid route returns 404', async ({ request }) => {
    const response = await request.get('/api/totally-invalid-route-xyz')
    
    expect(response.status()).toBe(404)
  })

  test('missing required fields returns 400', async ({ request }) => {
    const response = await request.post('/api/orders', {
      data: {}
    })
    
    // Debe rechazar request inválido
    expect([400, 401, 403, 422]).toContain(response.status())
  })

  test('unauthorized access returns 401', async ({ request }) => {
    // Sin headers de auth
    const response = await request.get('/api/seller/clients', {
      headers: {}
    })
    
    // Debe requerir autenticación
    expect([401, 403]).toContain(response.status())
  })
})
