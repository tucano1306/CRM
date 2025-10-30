# Plan de Testing para CI/CD

## Estado Actual
- ✅ Lint & Type Check
- ✅ Database Validation
- ✅ Build & Push Docker Image
- ✅ Security Scan
- ❌ **Tests Unitarios** (NO EXISTEN)
- ❌ **Tests de Integración** (NO EXISTEN)
- ❌ **Tests E2E** (NO EXISTEN)

---

## 🎯 Plan de Implementación

### Fase 1: Tests Unitarios (Básico)
**Herramientas**: Jest + React Testing Library

**Archivos a crear**:
```
__tests__/
  ├── unit/
  │   ├── components/
  │   │   ├── ErrorBoundary.test.tsx
  │   │   ├── ClientProfileCard.test.tsx
  │   │   └── OrderDetailModal.test.tsx
  │   ├── lib/
  │   │   ├── prisma.test.ts
  │   │   ├── rateLimit.test.ts
  │   │   └── logger.test.ts
  │   └── utils/
  │       └── formatters.test.ts
  └── setup.ts
```

**Configuración**:
```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.1.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

**Agregar al CI/CD**:
```yaml
# .github/workflows/docker-ci-cd.yml
test:
  name: Run Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 22
        cache: 'npm'
    - run: npm ci
    - run: npm run test -- --coverage
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

---

### Fase 2: Tests de Integración API
**Herramientas**: Jest + Supertest

**Archivos a crear**:
```
__tests__/
  └── integration/
      ├── api/
      │   ├── auth.test.ts
      │   ├── orders.test.ts
      │   ├── clients.test.ts
      │   └── analytics.test.ts
      └── database/
          └── prisma-queries.test.ts
```

**Configuración**:
```typescript
// __tests__/integration/setup.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

beforeAll(async () => {
  // Setup test database
  await prisma.$executeRaw`TRUNCATE TABLE "Order" CASCADE`
})

afterAll(async () => {
  await prisma.$disconnect()
})
```

**Agregar al CI/CD**:
```yaml
integration-test:
  name: Integration Tests
  needs: database
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_DB: test_db
        POSTGRES_USER: test
        POSTGRES_PASSWORD: test
  steps:
    - run: npm run test:integration
```

---

### Fase 3: Tests E2E (Playwright)
**Herramientas**: Playwright

**Archivos a crear**:
```
e2e/
  ├── buyer/
  │   ├── navigation.spec.ts    ← DETECTARÍA TU BUG
  │   ├── catalog.spec.ts
  │   └── orders.spec.ts
  ├── seller/
  │   ├── dashboard.spec.ts
  │   └── clients.spec.ts
  └── auth/
      └── login.spec.ts
```

**Ejemplo - e2e/buyer/navigation.spec.ts**:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Buyer Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login como CLIENT
    await page.goto('/sign-in')
    await page.fill('[name="email"]', 'client@test.com')
    await page.fill('[name="password"]', 'test123')
    await page.click('button[type="submit"]')
  })

  test('should stay in buyer area when navigating', async ({ page }) => {
    // Ir a dashboard
    await expect(page).toHaveURL('/buyer/dashboard')
    
    // Click en Catálogo
    await page.click('a[href="/buyer/catalog"]')
    await expect(page).toHaveURL('/buyer/catalog')
    
    // Click en Órdenes
    await page.click('a[href="/buyer/orders"]')
    await expect(page).toHaveURL('/buyer/orders')
    
    // ✅ Este test HUBIERA DETECTADO tu bug
    // Si redirecciona a /dashboard, el test falla
  })

  test('should not redirect seller routes', async ({ page }) => {
    // Intentar acceder a ruta seller
    await page.goto('/dashboard')
    
    // Debería redirigir a buyer
    await expect(page).toHaveURL('/buyer/dashboard')
  })
})
```

**Configuración**:
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
```

**Agregar al CI/CD**:
```yaml
e2e-test:
  name: E2E Tests
  needs: build
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run build
    - run: npm run test:e2e
    - uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
```

---

## 📊 CI/CD Completo con Tests

```yaml
# .github/workflows/docker-ci-cd.yml (ACTUALIZADO)

jobs:
  lint:
    name: Lint & Type Check
    # ... (existente)

  test-unit:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  test-integration:
    name: Integration Tests
    needs: [lint]
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: test_crm
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/test_crm
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npx prisma migrate deploy
      - run: npm run test:integration

  test-e2e:
    name: E2E Tests (Playwright)
    needs: [lint, test-unit]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  database:
    name: Database Validation
    # ... (existente)

  build:
    name: Build & Push Docker Image
    needs: [lint, test-unit, test-integration, test-e2e, database]
    # ... (existente)

  security:
    name: Security Scan
    needs: build
    # ... (existente)
```

---

## 🚀 Implementación por Prioridad

### Alta Prioridad (Esta semana)
1. ✅ **Tests Unitarios básicos** (2-3 horas)
   - Componentes críticos
   - Funciones de utilidad
   - Agregar al CI/CD

### Media Prioridad (Próxima semana)
2. **Tests de Integración** (1 día)
   - APIs principales
   - Queries de Prisma
   - Agregar al CI/CD

### Baja Prioridad (Cuando sea necesario)
3. **Tests E2E** (2-3 días)
   - Flujos críticos
   - Navegación (hubiera detectado tu bug)
   - Agregar al CI/CD

---

## 📈 Beneficios

Con tests en CI/CD:
- ✅ **Detecta bugs de navegación** (como el que encontraste)
- ✅ **Previene regresiones** (cambios que rompen funcionalidad)
- ✅ **Documenta comportamiento esperado**
- ✅ **Mayor confianza en deploys**
- ✅ **Cobertura de código visible**

---

## 🎯 Siguiente Paso

¿Quieres que implemente:
- **A)** Tests Unitarios básicos + agregar al CI/CD (2-3 horas)
- **B)** Solo la configuración de testing (sin tests aún)
- **C)** Tests E2E de navegación (detectaría bugs como el tuyo)
- **D)** Todo gradualmente empezando por (A)
