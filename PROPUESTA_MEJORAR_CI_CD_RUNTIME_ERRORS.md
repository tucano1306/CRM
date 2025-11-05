# Propuesta: Mejorar CI/CD para detectar errores de runtime

## 🎯 Objetivo
Detectar errores como el de `isomorphic-dompurify` ANTES de llegar a producción.

---

## 🔧 Opción 1: Agregar Smoke Tests después del deployment

### Modificar `.github/workflows/docker-ci-cd.yml`

```yaml
# Agregar este job después de deploy-vercel
smoke-tests:
  name: Smoke Tests on Preview
  runs-on: ubuntu-latest
  needs: [deploy-vercel]
  if: success()
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Wait for deployment to be ready
      run: sleep 30
    
    - name: Test Critical Endpoints
      run: |
        # Array de endpoints críticos
        ENDPOINTS=(
          "/api/notifications"
          "/api/quotes"
          "/api/products"
          "/api/orders"
          "/api/clients"
        )
        
        # URL de preview (obtener de Vercel)
        PREVIEW_URL="https://food-order-crm.vercel.app"
        
        # Probar cada endpoint
        for endpoint in "${ENDPOINTS[@]}"; do
          echo "Testing $PREVIEW_URL$endpoint"
          
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Authorization: Bearer ${{ secrets.TEST_API_KEY }}" \
            "$PREVIEW_URL$endpoint")
          
          if [ $STATUS -eq 500 ] || [ $STATUS -eq 502 ] || [ $STATUS -eq 503 ]; then
            echo "❌ ERROR: $endpoint returned $STATUS"
            exit 1
          else
            echo "✅ OK: $endpoint returned $STATUS"
          fi
        done
    
    - name: Notify if smoke tests fail
      if: failure()
      run: |
        echo "🚨 Smoke tests failed! Rolling back deployment..."
        # Aquí podrías agregar notificación a Slack/Discord
```

**Ventajas:**
- ✅ Detecta errores 500 inmediatamente después del deploy
- ✅ No requiere cambios en el código
- ✅ Falla el pipeline si hay errores críticos

**Desventajas:**
- ⚠️ Solo detecta después de deployar (no antes)
- ⚠️ Necesitas endpoints autenticados o bypass

---

## 🔧 Opción 2: Tests de Integración con Código Real (SIN mocks)

### Crear `__tests__/integration-real/api/sanitization.test.ts`

```typescript
/**
 * Integration tests SIN MOCKS
 * Importan el código REAL para detectar errores de runtime
 */

// NO USAR jest.mock() - queremos código real
import { sanitizeText } from '@/lib/sanitize'

describe('Real Sanitization Integration', () => {
  it('should sanitize text without throwing ES Module errors', () => {
    const maliciousInput = '<script>alert("XSS")</script>Hello'
    
    // Esto fallará si hay problemas con importaciones
    expect(() => {
      const result = sanitizeText(maliciousInput)
      expect(result).toBe('Hello')
    }).not.toThrow()
  })

  it('should handle HTML entities', () => {
    const input = 'Test &lt;script&gt; &amp; &quot;quotes&quot;'
    const result = sanitizeText(input)
    expect(result).not.toContain('<script>')
  })
})
```

### Agregar script en `package.json`

```json
{
  "scripts": {
    "test:integration-real": "jest --testMatch='**/__tests__/integration-real/**/*.test.ts' --coverage=false",
    "test:all-real": "npm run test:unit && npm run test:integration-real"
  }
}
```

### Modificar workflow

```yaml
# En .github/workflows/docker-ci-cd.yml
test-unit:
  # ... existing config
  - name: Run unit tests with mocks
    run: npm run test:unit -- --coverage

  - name: Run integration tests (NO MOCKS)
    run: npm run test:integration-real
```

**Ventajas:**
- ✅ Detecta errores ANTES de deployar
- ✅ Usa código real, no mocks
- ✅ Más rápido que smoke tests

**Desventajas:**
- ⚠️ Requiere escribir tests adicionales
- ⚠️ No simula exactamente el entorno serverless

---

## 🔧 Opción 3: Vercel Dev + Automated Testing (Más robusto)

### Crear `scripts/test-serverless-locally.sh`

```bash
#!/bin/bash

# Iniciar Vercel Dev en background
echo "🚀 Starting Vercel Dev..."
vercel dev --listen 3001 &
VERCEL_PID=$!

# Esperar a que el servidor esté listo
sleep 10

# Probar endpoints
echo "🧪 Testing endpoints..."

FAILED=0

# Test /api/notifications
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/notifications)
if [ $STATUS -ne 401 ] && [ $STATUS -ne 200 ]; then
  echo "❌ /api/notifications failed with status $STATUS"
  FAILED=1
else
  echo "✅ /api/notifications OK ($STATUS)"
fi

# Test /api/quotes
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/quotes)
if [ $STATUS -ne 401 ] && [ $STATUS -ne 200 ]; then
  echo "❌ /api/quotes failed with status $STATUS"
  FAILED=1
else
  echo "✅ /api/quotes OK ($STATUS)"
fi

# Detener Vercel Dev
kill $VERCEL_PID

# Salir con código de error si hubo fallos
exit $FAILED
```

### Agregar a GitHub Actions

```yaml
test-serverless:
  name: Test Serverless Functions Locally
  runs-on: ubuntu-latest
  needs: [lint]
  
  steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'
    
    - name: Install Vercel CLI
      run: npm i -g vercel
    
    - name: Install dependencies
      run: npm ci
    
    - name: Test serverless functions
      run: bash scripts/test-serverless-locally.sh
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
        CLERK_SECRET_KEY: ${{ secrets.CLERK_SECRET_KEY }}
```

**Ventajas:**
- ✅ Simula entorno serverless exacto
- ✅ Detecta errores de runtime
- ✅ Puede ejecutarse en CI/CD

**Desventajas:**
- ⚠️ Más complejo de configurar
- ⚠️ Toma más tiempo en CI/CD

---

## 🎯 Recomendación: Enfoque Híbrido

Combinar las 3 opciones para máxima cobertura:

```
┌─────────────────────────────────────────────────────────┐
│  1. Tests Unitarios (con mocks)                         │
│     → Rápidos, verifican lógica básica                  │
│     → GitHub Actions: 2-3 minutos                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  2. Tests Integración Real (sin mocks)                  │
│     → Importan código real                              │
│     → Detectan problemas de dependencias                │
│     → GitHub Actions: +1 minuto                         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  3. Vercel Dev Testing (opcional, manual)               │
│     → Solo para PRs importantes                         │
│     → Simula serverless exacto                          │
│     → Local: 5-10 minutos                               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  4. Deploy to Preview                                   │
│     → Vercel genera preview deployment                  │
│     → GitHub Actions: ~3 minutos                        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  5. Smoke Tests (endpoints críticos)                    │
│     → Prueba 5-10 endpoints principales                 │
│     → GitHub Actions: 30 segundos                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementación Rápida (15 minutos)

### Paso 1: Agregar tests sin mocks

```bash
# Crear directorio
mkdir -p __tests__/integration-real/lib

# Crear test
cat > __tests__/integration-real/lib/sanitize.test.ts << 'EOF'
import { sanitizeText, sanitizeHTML, sanitizeURL } from '@/lib/sanitize'

describe('Sanitization Library (Real Code)', () => {
  test('sanitizeText removes HTML tags', () => {
    expect(sanitizeText('<script>alert("xss")</script>Hello'))
      .toBe('Hello')
  })
  
  test('sanitizeHTML allows safe tags', () => {
    const result = sanitizeHTML('<p>Hello <b>World</b></p>')
    expect(result).toContain('<b>')
    expect(result).toContain('</b>')
  })
  
  test('sanitizeURL blocks javascript protocol', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBe('')
  })
})
EOF
```

### Paso 2: Modificar package.json

```json
{
  "scripts": {
    "test:real": "jest --testMatch='**/__tests__/integration-real/**/*.test.ts'"
  }
}
```

### Paso 3: Modificar workflow

```yaml
# En test-unit job, agregar:
- name: Run integration tests (no mocks)
  run: npm run test:real
```

### Paso 4: Commit y push

```bash
git add __tests__/integration-real
git commit -m "test: Add integration tests with real code (no mocks)"
git push
```

---

## 📊 Comparación de Opciones

| Método | Tiempo CI/CD | Detecta Error | Complejidad | Costo |
|--------|--------------|---------------|-------------|-------|
| Tests Unitarios (mocks) | 2 min | ❌ No | Baja | Gratis |
| Tests Integración Real | +1 min | ✅ Sí | Media | Gratis |
| Vercel Dev Testing | +5 min | ✅ Sí | Alta | Gratis |
| Smoke Tests Preview | +30 seg | ✅ Sí | Media | Vercel usage |
| Todo lo anterior | +7 min | ✅✅ Sí | Alta | Vercel usage |

---

## ✅ Conclusión

Para tu caso específico, recomiendo implementar **Opción 2** (Tests Integración Real):

```bash
# 1. Crear tests sin mocks (15 min)
mkdir -p __tests__/integration-real/lib
# Agregar tests para sanitize.ts

# 2. Agregar script en package.json (1 min)
"test:real": "jest --testMatch='**/__tests__/integration-real/**/*.test.ts'"

# 3. Modificar workflow (2 min)
# Agregar step en test-unit job

# TOTAL: 18 minutos de trabajo
# BENEFICIO: Detecta errores de runtime ANTES de deploy
```

¿Quieres que implemente alguna de estas opciones en tu proyecto? 🎯
