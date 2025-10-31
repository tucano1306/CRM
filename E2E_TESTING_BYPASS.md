# E2E Testing con Bypass de Autenticación

## Problema Original

Las pruebas E2E con Clerk no funcionaban porque el componente `<SignIn />` no se renderizaba correctamente en Playwright (0 inputs detectados).

## Solución Implementada

### ✅ **Bypass de Autenticación para Testing**

Modificamos el `middleware.ts` para permitir **bypass de autenticación** mediante headers HTTP especiales:

```typescript
// Headers necesarios para bypass
'X-Test-Bypass-Auth': 'true'
'X-Test-User-Role': 'CLIENT' | 'SELLER' | 'ADMIN'
'X-Test-User-Id': 'test-user-id'
```

### 🔒 **Seguridad**

El bypass **SOLO funciona** cuando:
1. `NODE_ENV === 'test'` O
2. `process.env.E2E_TESTING === 'true'`

**Nunca en producción.**

---

## 📝 Cómo Usar

### 1. Habilitar modo E2E testing

En tu `.env.local`:

```bash
E2E_TESTING=true
```

### 2. Ejecutar tests con bypass

```bash
# Script NPM recomendado (configura E2E_TESTING automáticamente)
npm run test:e2e:bypass

# Ejecutar con Playwright directamente
npx playwright test navigation-with-bypass.spec.ts

# Solo buyer tests
npx playwright test navigation-with-bypass.spec.ts -g "Buyer Navigation"

# Solo seller tests
npx playwright test navigation-with-bypass.spec.ts -g "Seller Navigation"

# Con UI mode
npx playwright test navigation-with-bypass.spec.ts --ui

# Ver reporte
npx playwright show-report
```

### 3. CI/CD Pipeline (GitHub Actions)

Los tests E2E están **completamente integrados** en el pipeline de CI/CD:

**Pipeline Flow:**
```
lint → (test-unit + test-e2e + database) → build
```

**Job: test-e2e**
- ✅ Ejecuta en Ubuntu latest con Node.js 22
- ✅ PostgreSQL 16 en service container
- ✅ Instala Playwright browsers (Chromium)
- ✅ Ejecuta `npx prisma migrate deploy`
- ✅ Seed de base de datos (opcional)
- ✅ Corre tests con `E2E_TESTING=true`
- ✅ Sube artifacts:
  - `playwright-report/` - Reporte HTML (siempre)
  - `test-results/` - Screenshots (solo si fallan tests)

**Para ver resultados en GitHub:**
1. Ve a la pestaña "Actions" en tu repositorio
2. Click en el workflow run
3. Descarga los artifacts (playwright-report, e2e-screenshots)

### 4. Estructura de un Test con Bypass

```typescript
import { test, expect } from '@playwright/test'

test.describe('Mi Feature Test', () => {
  
  // Configurar headers de bypass para todos los tests
  test.use({
    extraHTTPHeaders: {
      'X-Test-Bypass-Auth': 'true',
      'X-Test-User-Role': 'CLIENT',
      'X-Test-User-Id': 'test-client-123'
    }
  })
  
  test('debería acceder al dashboard', async ({ page }) => {
    await page.goto('/buyer/dashboard')
    
    // NO redirige a /sign-in
    expect(page.url()).toContain('/buyer/dashboard')
    
    // Verificar contenido
    await expect(page.locator('h1')).toBeVisible()
  })
})
```

---

## 📂 Archivos Creados

### Tests E2E con Bypass

1. **`e2e/navigation-with-bypass.spec.ts`** ✅
   - Tests de navegación CLIENT/SELLER
   - Verificación de redirects
   - Tests de APIs

2. **`e2e/bypass-auth.spec.ts`** 🧪
   - Test experimental de rutas públicas
   - Tests de middleware behavior

3. **`e2e/auth-mock.setup.ts`** 📋
   - Setup alternativo (no usado actualmente)
   - Mock de storage state

### Modificaciones

1. **`middleware.ts`** ⚙️
   - Lógica de bypass agregada
   - Headers `X-Test-*` detectados
   - Solo activo en testing

2. **`playwright.config.ts`** 🎭
   - Tests de bypass habilitados
   - Auth setup deshabilitado temporalmente

3. **`.env.example`** 📝
   - Variable `E2E_TESTING` documentada

---

## 🎯 Qué Tests Podemos Hacer

### ✅ Tests que FUNCIONAN con Bypass

- ✅ **Navegación entre rutas** (buyer/seller)
- ✅ **Redirects basados en roles**
- ✅ **Protección de rutas** (CLIENT no accede a seller)
- ✅ **Redirects desde root** (/ → dashboard correcto)
- ✅ **APIs con headers de autenticación**
- ✅ **Visual regression** (screenshots, comparaciones)
- ✅ **Interacciones UI** (clicks, forms, etc.)

### ❌ Tests que NO podemos hacer

- ❌ **Login/Logout real con Clerk UI**
- ❌ **Session persistence real**
- ❌ **OAuth flows**
- ❌ **Webhook de Clerk**

---

## 🔄 Migración de Tests Existentes

### Antes (con Clerk bloqueado)

```typescript
test.describe.skip('Buyer Navigation', () => {
  // Tests deshabilitados por Clerk issue
})
```

### Después (con bypass)

```typescript
test.describe('Buyer Navigation', () => {
  
  test.use({
    extraHTTPHeaders: {
      'X-Test-Bypass-Auth': 'true',
      'X-Test-User-Role': 'CLIENT',
    }
  })
  
  test('should navigate to catalog', async ({ page }) => {
    await page.goto('/buyer/catalog')
    expect(page.url()).toContain('/buyer/catalog')
  })
})
```

---

## 📊 Ventajas vs. Desventajas

### ✅ Ventajas

1. **No dependemos de Clerk UI** - Evita el blocker de formulario no renderizado
2. **Tests más rápidos** - Sin esperar login visual
3. **Control total del rol** - Cambiar CLIENT/SELLER fácilmente
4. **CI/CD friendly** - No necesita credenciales reales
5. **Debugging más fácil** - Sin side effects de sesión

### ⚠️ Desventajas

1. **No testea el flujo de login real**
2. **Bypass introduce código específico de testing**
3. **Necesita variable de entorno para habilitar**
4. **No valida integración con Clerk completamente**

---

## 🚀 Próximos Pasos

1. **Ejecutar tests con bypass** - Validar que funcionan
2. **Migrar tests existentes** - Quitar `.skip` y usar bypass
3. **Agregar más tests** - Coverage de features críticos
4. **Habilitar en CI/CD** - Agregar `E2E_TESTING=true` en GitHub Actions
5. **Visual regression** - Screenshots comparativos

---

## 🐛 Troubleshooting

### Test falla con redirect a /sign-in

**Causa:** Variable `E2E_TESTING` no está configurada

**Solución:**
```bash
# En .env.local
E2E_TESTING=true
```

### Headers no se están enviando

**Causa:** Configuración incorrecta en `test.use()`

**Solución:**
```typescript
// Usar extraHTTPHeaders, no headers
test.use({
  extraHTTPHeaders: {
    'X-Test-Bypass-Auth': 'true',
    'X-Test-User-Role': 'CLIENT'
  }
})
```

### Middleware no detecta el bypass

**Causa:** `NODE_ENV` no es 'test' y `E2E_TESTING` no está configurada

**Solución:**
```bash
# Ejecutar con
E2E_TESTING=true npx playwright test

# O agregar a playwright.config.ts
use: {
  baseURL: 'http://localhost:3000',
}
```

---

## 📚 Referencias

- [Playwright Request Context](https://playwright.dev/docs/api/class-request)
- [Playwright extraHTTPHeaders](https://playwright.dev/docs/api/class-browser#browser-new-context-option-extra-http-headers)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)

---

## ✅ Tests Actualmente Implementados

### `navigation-with-bypass.spec.ts`

- [x] Buyer Navigation (CLIENT role)
  - [x] Access buyer dashboard
  - [x] Redirect seller routes to buyer equivalent
  - [x] Access buyer catalog
  - [x] Access buyer orders
  - [x] Redirect /products to /buyer/catalog
- [x] Seller Navigation (SELLER role)
  - [x] Access seller dashboard
  - [x] Access products page
  - [x] Access clients page
  - [x] Access orders page
  - [x] NOT redirect seller to buyer routes
- [x] Root Redirect Behavior
  - [x] Redirect CLIENT from / to /buyer/dashboard
  - [x] Redirect SELLER from / to /dashboard
- [x] API Endpoints with Auth Bypass
  - [x] Access buyer API as CLIENT
  - [x] Access seller API as SELLER

**Total:** 14 tests implementados ✅
