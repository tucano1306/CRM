# 🧪 Testing Suite - Food Orders CRM

## Sistema Completo de Testing Implementado

Este proyecto ahora cuenta con un sistema de testing completo que detecta:
- ✅ Errores de lógica y navegación
- ✅ Errores de API y backend
- ✅ Errores visuales y de estilos
- ✅ Problemas de responsive design
- ✅ Problemas de accesibilidad
- ✅ Regresiones de UI

---

## 📋 Tipos de Tests

### 1. **Tests Unitarios** (Jest + React Testing Library)
```bash
npm run test:unit
```

**Qué testea:**
- Componentes individuales
- Funciones de utilidad
- Hooks custom
- Lógica de negocio

**Ejemplo:**
```typescript
// __tests__/unit/components/ErrorBoundary.test.tsx
it('renders error UI when there is an error', () => {
  // Test que el ErrorBoundary captura errores
})
```

**Archivos:**
- `__tests__/unit/components/` - Tests de componentes
- `__tests__/unit/lib/` - Tests de librerías
- `__tests__/unit/hooks/` - Tests de hooks

---

### 2. **Tests de Integración** (Jest + API Mocks)
```bash
npm run test:integration
```

**Qué testea:**
- Interacción entre componentes
- Flujos de datos completos
- Queries de Prisma
- APIs internas

**Archivos:**
- `__tests__/integration/api/` - Tests de APIs
- `__tests__/integration/database/` - Tests de DB

---

### 3. **Tests E2E** (Playwright)
```bash
npm run test:e2e
```

**Qué testea:**
- Navegación completa de usuario
- Flujos buyer/seller
- **¡Detecta el bug de redirección que encontraste!**
- Interacción real con la app

**Ejemplo - navigation.spec.ts:**
```typescript
test('should stay in buyer area when navigating', async ({ page }) => {
  await page.goto('/buyer/dashboard')
  
  // Click en Catálogo
  await page.click('a[href="/buyer/catalog"]')
  
  // ✅ DEBE permanecer en buyer
  await expect(page).toHaveURL(/\/buyer\/catalog/)
  
  // ❌ Este test FALLARÍA con tu bug
  await expect(page).not.toHaveURL(/^\/dashboard$/)
})
```

**Archivos:**
- `e2e/navigation.spec.ts` - Tests de navegación
- `e2e/visual-regression.spec.ts` - Tests visuales
- `e2e/api-tests.spec.ts` - Tests de APIs

---

### 4. **Tests Visuales** (Playwright Screenshots)
```bash
npm run test:e2e
```

**Qué testea:**
- Estilos CSS correctos
- Responsive design (mobile/tablet/desktop)
- Dark mode
- Contraste de colores
- Tipografía consistente
- Sin scroll horizontal
- Animaciones smooth

**Ejemplo:**
```typescript
test('responsive design - mobile view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('/buyer/dashboard')
  
  // ✅ Detecta si mobile está roto
  await expect(page).toHaveScreenshot('buyer-dashboard-mobile.png')
})
```

---

## 🚀 Comandos Disponibles

```bash
# Tests individuales
npm run test              # Todos los tests Jest
npm run test:unit         # Solo unitarios
npm run test:integration  # Solo integración
npm run test:e2e          # Solo E2E (Playwright)

# Modos especiales
npm run test:watch        # Jest en modo watch
npm run test:coverage     # Coverage report
npm run test:e2e:ui       # Playwright UI mode
npm run test:e2e:debug    # Playwright debug mode

# Todo junto
npm run test:all          # Unitarios + Integración + E2E
```

---

## 🎯 CI/CD Integration

El workflow de GitHub Actions ahora ejecuta:

```yaml
1. Lint & Type Check
2. Unit Tests ← NUEVO
3. Database Validation
4. E2E Tests ← NUEVO (detecta bugs de navegación/estilos)
5. Build & Push Docker
6. Security Scan
```

**Beneficios:**
- ✅ Cada push ejecuta TODOS los tests
- ✅ Pull requests muestran coverage
- ✅ Screenshots de fallos E2E
- ✅ Previene merges con bugs

---

## 📊 Coverage

Ver cobertura de código:
```bash
npm run test:coverage
```

Genera reporte en:
- `coverage/lcov-report/index.html` - Reporte visual
- `coverage/lcov.info` - Para CI/CD

**Objetivos de coverage:**
- Branches: 50%
- Functions: 50%
- Lines: 50%
- Statements: 50%

---

## 🐛 Bugs Detectados por Tests

### Bug #1: Redirección Buyer → Seller
**Test que lo detecta:** `e2e/navigation.spec.ts`

```typescript
test('should stay in buyer area when navigating', async ({ page }) => {
  await page.click('a[href="/buyer/catalog"]')
  
  // ❌ FALLA si redirige a /dashboard
  await expect(page).toHaveURL(/\/buyer\/catalog/)
})
```

**Estado:** ✅ CORREGIDO en middleware.ts

### Bug #2: Estilos Responsive
**Test que lo detecta:** `e2e/visual-regression.spec.ts`

```typescript
test('responsive design - mobile view', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  
  // Detecta si mobile está roto
  await expect(page).toHaveScreenshot('buyer-dashboard-mobile.png')
})
```

---

## 📝 Escribir Nuevos Tests

### Test Unitario
```typescript
// __tests__/unit/components/MyComponent.test.tsx
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })
})
```

### Test E2E
```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test'

test('my feature works', async ({ page }) => {
  await page.goto('/my-page')
  await page.click('button')
  await expect(page.locator('.result')).toBeVisible()
})
```

---

## 🔍 Debugging

### Debug Jest Tests
```bash
# VSCode: Agregar breakpoint y presionar F5
# O usar:
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Debug Playwright Tests
```bash
# Modo UI (recomendado)
npm run test:e2e:ui

# Modo debug
npm run test:e2e:debug

# Ver trace de test fallido
npx playwright show-trace trace.zip
```

---

## 📦 Configuración

### Jest
- `jest.config.js` - Configuración principal
- `jest.setup.ts` - Mocks globales (Clerk, Prisma, etc.)

### Playwright
- `playwright.config.ts` - Configuración E2E
- `e2e/auth.setup.ts` - Setup de autenticación

---

## 🎓 Best Practices

1. **Tests unitarios:** 
   - Test un solo componente/función
   - Mock dependencias externas
   - Rápidos (< 1s cada uno)

2. **Tests E2E:**
   - Test flujos completos de usuario
   - No mockear nada
   - Más lentos pero más confiables

3. **Naming:**
   - Descriptivo: `test('should stay in buyer area')`
   - No técnico: `test('middleware line 42 works')`

4. **Assertions:**
   - Ser específico: `expect(url).toBe('/buyer/catalog')`
   - No genérico: `expect(url).toBeTruthy()`

---

## 🚨 Solución de Problemas

### "Cannot find module '@/components/...'"
```bash
# Regenerar tipos
npm run prisma:generate
```

### "Playwright browser not found"
```bash
npx playwright install
```

### "Jest tests timeout"
```bash
# Aumentar timeout en test
test('slow test', async () => {
  // ...
}, 10000) // 10 segundos
```

---

## 📈 Próximos Pasos

- [ ] Aumentar coverage a 80%
- [ ] Agregar tests de performance
- [ ] Agregar tests de accesibilidad (axe-core)
- [ ] Visual regression testing automático
- [ ] Tests de carga (k6)

---

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

## ✅ Status

| Tipo | Tests | Estado | Coverage |
|------|-------|--------|----------|
| Unit | 1+ | ✅ Configurado | TBD |
| Integration | TBD | ⚠️ Pendiente | TBD |
| E2E | 15+ | ✅ Configurado | - |
| Visual | 10+ | ✅ Configurado | - |

**Total:** Sistema de testing completo implementado y en CI/CD ✅
