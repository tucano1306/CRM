# ¿Por qué Vercel detectó el error pero GitHub Actions no?

## 📊 Comparación de Ambientes

### GitHub Actions (CI/CD Pipeline)
```
✅ Lint & Type Check: PASÓ
✅ Unit Tests (497): PASÓ  
✅ Database Validation: PASÓ
✅ E2E Tests: PASÓ (con continue-on-error)
✅ Docker Build: PASÓ
✅ Security Scan: PASÓ
```

### Vercel (Producción)
```
❌ Runtime Error: ERR_REQUIRE_ESM
❌ /api/notifications: 500 Internal Server Error
```

---

## 🔍 Diferencias Clave

### 1. **GitHub Actions NO ejecuta el código en runtime**

El pipeline de GitHub Actions hace:
- ✅ **Compilación** (`npm run build`) - Verifica TypeScript, sintaxis
- ✅ **Tests unitarios** - Ejecuta código con **mocks** y datos de prueba
- ✅ **Validación de esquema** - Prisma genera client sin errores
- ✅ **Linting** - ESLint revisa código estático

**LO QUE NO HACE:**
- ❌ No ejecuta las API routes en un entorno serverless real
- ❌ No importa dinámicamente `isomorphic-dompurify` en runtime
- ❌ No detecta conflictos ES Module vs CommonJS en Vercel

### 2. **Vercel SÍ ejecuta el código en runtime serverless**

Cuando Vercel recibe una petición a `/api/notifications`:

```typescript
// 1. Vercel intenta cargar el módulo
import DOMPurify from 'isomorphic-dompurify'

// 2. isomorphic-dompurify intenta importar jsdom
const { JSDOM } = require('jsdom')

// 3. jsdom intenta importar parse5
const parse5 = require('parse5')  // ❌ ERROR!

// 4. parse5 es ES Module puro, no compatible con require()
// Error: require() of ES Module not supported
```

---

## 🧪 ¿Por qué los tests NO lo detectaron?

### Test Unitarios
```typescript
// __tests__/app/api/notifications/route.test.ts
jest.mock('isomorphic-dompurify', () => ({
  default: {
    sanitize: jest.fn(text => text.trim())  // Mock simple
  }
}))
```

**Los tests usan MOCKS**, no cargan la librería real. Por eso:
- ✅ Tests pasan sin problema
- ❌ Pero el código real falla en producción

### Build de Next.js
```bash
npm run build
```

El build **compila** el código pero:
- ✅ Verifica TypeScript types
- ✅ Genera archivos .next optimizados
- ❌ **NO ejecuta** las funciones serverless
- ❌ **NO detecta** conflictos de importación en runtime

---

## 🏗️ Ambientes de Ejecución

### GitHub Actions (Ubuntu Linux)
```
Node.js 22
npm ci
npm run build  ← Solo compilación
npm test       ← Mocks de Jest
```

### Vercel Serverless (AWS Lambda)
```
Node.js 20.x (runtime específico)
Vercel Build System
Serverless Functions (CommonJS por defecto)
Edge Runtime (opcional)

→ AQUÍ se ejecuta el código REAL
→ AQUÍ falla la importación de parse5
```

---

## 🔧 ¿Cómo se podría haber detectado antes?

### Opción 1: Tests de Integración Reales
```typescript
// __tests__/integration/api/notifications.test.ts
import { GET } from '@/app/api/notifications/route'

// No usar mocks, importar la función REAL
test('should sanitize notification text', async () => {
  const request = new Request('http://localhost/api/notifications')
  const response = await GET(request)
  // Esto fallaría con el error ERR_REQUIRE_ESM
})
```

### Opción 2: Local Serverless Testing
```bash
# Ejecutar Vercel dev localmente (simula serverless)
vercel dev

# Probar el endpoint
curl http://localhost:3000/api/notifications
# Aquí SÍ se habría visto el error
```

### Opción 3: Preview Deployments
```yaml
# .github/workflows/preview-deploy.yml
- name: Deploy to Vercel Preview
  run: vercel deploy --token=${{ secrets.VERCEL_TOKEN }}

- name: Test Preview Deployment
  run: |
    curl https://preview-deployment.vercel.app/api/notifications
    # Si devuelve 500, fallar el workflow
```

---

## 📈 Comparación Visual

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                            │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐            │
│  │  Lint  │→ │  Test  │→ │  Build │→ │ Docker │            │
│  └────────┘  └────────┘  └────────┘  └────────┘            │
│       ✅         ✅          ✅          ✅                   │
│                                                              │
│  🔍 Análisis estático del código                            │
│  🧪 Tests con mocks                                         │
│  📦 Compilación sin ejecución                               │
│  ❌ NO detecta errores de runtime serverless                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                         Vercel                               │
│  ┌────────┐  ┌──────────┐  ┌─────────────┐                 │
│  │  Build │→ │  Deploy  │→ │ HTTP Request│                 │
│  └────────┘  └──────────┘  └─────────────┘                 │
│       ✅         ✅              ❌                           │
│                              │                               │
│                              ↓                               │
│                      ┌──────────────┐                        │
│                      │ Serverless   │                        │
│                      │ Function     │                        │
│                      │ Runtime      │                        │
│                      │              │                        │
│                      │ require()    │                        │
│                      │ parse5       │                        │
│                      │ ❌ ERROR     │                        │
│                      └──────────────┘                        │
│                                                              │
│  🚀 Código ejecutándose REALMENTE                           │
│  ⚡ Serverless environment (AWS Lambda)                     │
│  📡 Peticiones HTTP reales                                  │
│  ✅ DETECTA errores de runtime                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Lecciones Aprendidas

### 1. **Los tests unitarios no reemplazan tests de integración**
- Los mocks ocultan problemas de dependencias reales
- Necesitamos tests que importen código real

### 2. **Build ≠ Runtime**
- Compilar exitosamente no garantiza que funcione en producción
- El entorno serverless puede tener restricciones específicas

### 3. **Vercel dev es tu amigo**
```bash
vercel dev  # Simula el entorno serverless localmente
```

### 4. **Preview deployments son cruciales**
- Probar en un ambiente idéntico a producción
- Detectar errores antes del deployment final

---

## ✅ Solución Aplicada

Para evitar este tipo de problemas en el futuro:

### 1. **Usar librerías compatible con serverless**
```typescript
// ❌ Evitar: Librerías que dependen de jsdom/browser APIs
import DOMPurify from 'isomorphic-dompurify'

// ✅ Usar: Utilidades server-side puras
import { sanitizeText } from '@/lib/sanitize'
```

### 2. **Tests de integración con código real**
```typescript
// Agregar a package.json
"test:integration:real": "jest --testMatch='**/__tests__/integration-real/**/*.test.ts' --no-coverage"
```

### 3. **CI/CD mejorado** (opcional)
```yaml
# Agregar job de preview deployment
preview-deploy:
  name: Preview Deployment Test
  runs-on: ubuntu-latest
  steps:
    - name: Deploy Preview
      run: vercel deploy --token=${{ secrets.VERCEL_TOKEN }}
    
    - name: Smoke Test APIs
      run: |
        curl -f https://preview.vercel.app/api/notifications || exit 1
        curl -f https://preview.vercel.app/api/quotes || exit 1
```

---

## 📚 Referencias

- [Vercel Serverless Functions Runtime](https://vercel.com/docs/functions/runtimes)
- [CommonJS vs ES Modules in Node.js](https://nodejs.org/api/esm.html)
- [Jest Mocking Best Practices](https://jestjs.io/docs/manual-mocks)
- [Integration Testing in Next.js](https://nextjs.org/docs/app/building-your-application/testing)

---

**Conclusión:** GitHub Actions validó que el código **compila** correctamente, pero solo Vercel (ejecutando el código REAL en serverless) detectó que **falla en runtime** debido al conflicto ES Module. Por eso es importante combinar tests unitarios + integración + preview deployments. 🎯
