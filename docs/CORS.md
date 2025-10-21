# CORS (Cross-Origin Resource Sharing) Configuration

## 📋 Índice

- [Descripción](#descripción)
- [Configuración](#configuración)
- [Headers CORS](#headers-cors)
- [Flujo de Requests](#flujo-de-requests)
- [Configuraciones Predefinidas](#configuraciones-predefinidas)
- [Uso en API Routes](#uso-en-api-routes)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Descripción

El sistema implementa **CORS (Cross-Origin Resource Sharing)** para controlar qué orígenes (dominios) pueden acceder a la API. Esto es esencial para:

- ✅ Permitir requests desde tu frontend en diferentes dominios
- ✅ Proteger contra requests no autorizados de otros sitios
- ✅ Soportar credenciales (cookies, auth headers) de forma segura
- ✅ Manejar preflight requests (OPTIONS) correctamente

---

## ⚙️ Configuración

### Variables de Entorno

Configura el origen permitido en `.env.local`:

```env
# URL de tu aplicación (production)
NEXT_PUBLIC_APP_URL=https://tu-dominio.com

# Ambiente
NODE_ENV=production
```

### Orígenes Permitidos

**Desarrollo** (`NODE_ENV !== 'production'`):
- `http://localhost:3000`
- `http://localhost:3001`
- `http://127.0.0.1:3000`

**Producción** (`NODE_ENV === 'production'`):
- Valor de `NEXT_PUBLIC_APP_URL`
- Dominios adicionales configurados en `lib/cors.ts`

---

## 📡 Headers CORS

### Headers de Request Permitidos

```
Content-Type
Authorization
X-Requested-With
Accept
Origin
X-CSRF-Token
X-Idempotency-Key
```

### Headers de Response Expuestos

```
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
Retry-After
```

### Métodos HTTP Permitidos

```
GET, POST, PUT, PATCH, DELETE, OPTIONS
```

---

## 🔄 Flujo de Requests

### 1. Preflight Request (OPTIONS)

Cuando el navegador detecta un request "complejo" (con headers custom o métodos no-GET/POST), envía primero un **preflight request**:

```
REQUEST:
OPTIONS /api/clients HTTP/1.1
Origin: http://localhost:3001
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type,authorization

RESPONSE:
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, ...
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### 2. Actual Request

Después del preflight exitoso, se envía el request real:

```
REQUEST:
POST /api/clients HTTP/1.1
Origin: http://localhost:3001
Content-Type: application/json
Authorization: Bearer token123

RESPONSE:
HTTP/1.1 200 OK
Access-Control-Allow-Origin: http://localhost:3001
Access-Control-Allow-Credentials: true
Content-Type: application/json
```

---

## 🎨 Configuraciones Predefinidas

### 1. Default (Estricto con Credenciales)

```typescript
// Automático en middleware.ts
// Permite orígenes configurados con credenciales
```

### 2. Public (CORS Abierto)

```typescript
import { corsConfigs } from '@/lib/cors'

// En un API route específico
const corsHeaders = getCorsHeaders(origin, corsConfigs.public)
// Permite: origin: '*', credentials: false
```

### 3. Strict (Un Solo Origen)

```typescript
import { corsConfigs } from '@/lib/cors'

const corsHeaders = getCorsHeaders(origin, corsConfigs.strict)
// Permite: solo NEXT_PUBLIC_APP_URL, credentials: true
```

### 4. Public API (Solo GET/POST)

```typescript
import { corsConfigs } from '@/lib/cors'

const corsHeaders = getCorsHeaders(origin, corsConfigs.publicApi)
// Permite: origin: '*', methods: ['GET', 'POST'], credentials: false
```

### 5. Webhook (Dominios Específicos)

```typescript
import { corsConfigs } from '@/lib/cors'

const corsHeaders = getCorsHeaders(origin, corsConfigs.webhook)
// Permite: svix.com, stripe.com, clerk.dev, methods: ['POST']
```

---

## 🔧 Uso en API Routes

### Opción 1: CORS Global (Ya Configurado)

El middleware ya maneja CORS para todas las rutas. No necesitas hacer nada adicional.

```typescript
// app/api/productos/route.ts
export async function GET(request: Request) {
  // CORS headers ya agregados por middleware
  return NextResponse.json({ data: productos })
}
```

### Opción 2: CORS Personalizado por Ruta

Si necesitas configuración CORS específica para una ruta:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { handleCorsPreflightRequest, addCorsHeaders, corsConfigs } from '@/lib/cors'

// Manejar OPTIONS
export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request, corsConfigs.publicApi)
}

// GET con CORS personalizado
export async function GET(request: NextRequest) {
  const response = NextResponse.json({ data: 'public data' })
  return addCorsHeaders(response, request, corsConfigs.publicApi)
}
```

### Opción 3: CORS Completamente Abierto (No Recomendado)

```typescript
import { corsConfigs } from '@/lib/cors'

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightRequest(request, corsConfigs.public)
}

export async function GET(request: NextRequest) {
  const response = NextResponse.json({ data: 'open data' })
  return addCorsHeaders(response, request, corsConfigs.public)
}
```

---

## 🧪 Testing

### Test 1: Verificar Headers CORS

```bash
# PowerShell
curl.exe -X OPTIONS http://localhost:3000/api/clients `
  -H "Origin: http://localhost:3001" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type" `
  -v
```

Verifica que la respuesta incluya:
- `Access-Control-Allow-Origin: http://localhost:3001`
- `Access-Control-Allow-Methods: GET, POST, ...`
- `Access-Control-Allow-Credentials: true`

### Test 2: Request desde Origen Permitido

```javascript
// En tu frontend (React/Next.js)
fetch('http://localhost:3000/api/clients', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  credentials: 'include', // Importante para cookies
  body: JSON.stringify({ name: 'Test Client' })
})
  .then(res => res.json())
  .then(data => console.log('✅ CORS funciona:', data))
  .catch(err => console.error('❌ Error CORS:', err))
```

### Test 3: Request desde Origen NO Permitido

```bash
# PowerShell - Simular request desde origen no permitido
curl.exe http://localhost:3000/api/clients `
  -H "Origin: http://malicious-site.com" `
  -v
```

Verifica que NO incluya `Access-Control-Allow-Origin: http://malicious-site.com`

### Test 4: Test Automatizado

```javascript
// tests/cors.test.ts
import { getCorsHeaders, isOriginAllowed } from '@/lib/cors'

describe('CORS Configuration', () => {
  it('permite orígenes configurados', () => {
    const headers = getCorsHeaders('http://localhost:3000')
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000')
  })

  it('bloquea orígenes no permitidos', () => {
    const headers = getCorsHeaders('http://malicious.com')
    expect(headers['Access-Control-Allow-Origin']).toBeUndefined()
  })

  it('permite credenciales', () => {
    const headers = getCorsHeaders('http://localhost:3000')
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
  })
})
```

---

## 🐛 Troubleshooting

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Causa**: El origen no está en la lista permitida.

**Solución**:
1. Verifica que `NEXT_PUBLIC_APP_URL` esté configurado
2. En desarrollo, verifica que uses `localhost:3000`, `3001` o `127.0.0.1:3000`
3. Agrega el origen en `lib/cors.ts`:

```typescript
const DEFAULT_CORS_OPTIONS: CorsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://tu-nuevo-dominio.com' // ⬅️ Agregar aquí
  ]
}
```

### Error: "CORS policy: Response to preflight request doesn't pass"

**Causa**: El preflight request (OPTIONS) falló.

**Solución**:
1. Verifica que el middleware esté manejando OPTIONS:
```typescript
if (req.method === 'OPTIONS') {
  return handleCorsPreflightRequest(req)
}
```

2. Verifica que los headers solicitados estén permitidos en `allowedHeaders`

### Error: Credentials not included

**Causa**: `credentials: 'include'` no está configurado en el fetch.

**Solución**:
```javascript
fetch(url, {
  credentials: 'include', // ⬅️ Agregar esto
  headers: { ... }
})
```

### Error: CORS funciona en dev pero no en producción

**Causa**: `NEXT_PUBLIC_APP_URL` no está configurado en Vercel.

**Solución**:
1. Ve a Vercel → Settings → Environment Variables
2. Agrega: `NEXT_PUBLIC_APP_URL=https://tu-dominio.com`
3. Redeploy

### Preflight request tarda mucho

**Causa**: El navegador está haciendo preflight en cada request.

**Solución**: Aumenta `maxAge` en `lib/cors.ts`:
```typescript
maxAge: 86400 // 24 horas (navegador cachea preflight)
```

---

## 🔒 Seguridad

### ✅ Mejores Prácticas

1. **No uses `origin: '*'` con credenciales**
```typescript
// ❌ MALO - Inseguro
{ origin: '*', credentials: true }

// ✅ BUENO - Orígenes específicos
{ origin: ['https://tu-app.com'], credentials: true }
```

2. **Especifica orígenes exactos en producción**
```typescript
// ❌ MALO - Muy permisivo
{ origin: '*' }

// ✅ BUENO - Solo tu dominio
{ origin: process.env.NEXT_PUBLIC_APP_URL }
```

3. **Limita headers expuestos**
Solo expone headers que el frontend realmente necesita.

4. **Usa HTTPS en producción**
CORS sin HTTPS es vulnerable a man-in-the-middle attacks.

---

## 📚 Referencias

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [W3C CORS Spec](https://www.w3.org/TR/cors/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

---

## ✅ Checklist de Implementación

- [x] `lib/cors.ts` creado con configuración CORS
- [x] Middleware actualizado para manejar OPTIONS
- [x] Middleware actualizado para agregar CORS headers
- [x] Configuraciones predefinidas (`public`, `strict`, etc.)
- [x] Headers de rate limiting expuestos
- [x] Documentación completa
- [ ] Testing con frontend real
- [ ] Verificar en producción (Vercel)
- [ ] Configurar `NEXT_PUBLIC_APP_URL` en Vercel

---

**Última actualización**: Octubre 21, 2025  
**Versión**: 1.0.0
