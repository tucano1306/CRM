# Sistema de Rate Limiting - Protección contra DoS

## 📋 Descripción

Sistema completo de límite de requests por IP/usuario para proteger la API contra:
- **DoS (Denial of Service)** attacks
- **Brute-force** attacks en endpoints de autenticación
- **Abuso de API** por usuarios/bots maliciosos

## ⚙️ Componentes

### 1. **RateLimiter Class** (`lib/rateLimit.ts`)

Implementación in-memory de rate limiting con:
- ✅ Ventanas de tiempo deslizantes
- ✅ Contadores por IP/usuario
- ✅ Bloqueo temporal automático
- ✅ Limpieza automática de entradas expiradas
- ✅ Estadísticas en tiempo real

### 2. **Middleware Integration** (`middleware.ts`)

Rate limiting integrado en el middleware principal:
- ✅ Detección automática de IP (incluso detrás de proxies/CDN)
- ✅ Diferentes límites según tipo de ruta
- ✅ Headers de rate limit en responses
- ✅ Mensajes de error informativos

### 3. **Admin API** (`/api/admin/rate-limit`)

Endpoints para administrar rate limiting:
- ✅ Ver estadísticas
- ✅ Desbloquear IPs/usuarios
- ✅ Limpiar limiters (testing)

## 🛡️ Configuraciones de Rate Limit

### General API (Autenticada)
```typescript
generalRateLimiter
- Ventana: 1 minuto
- Máximo: 100 requests
- Bloqueo: 5 minutos
- Aplica a: /api/* (con auth)
```

### Autenticación
```typescript
authRateLimiter
- Ventana: 15 minutos
- Máximo: 10 requests
- Bloqueo: 1 hora
- Aplica a: /sign-in, /sign-up, /api/auth/*
```

### API Pública (Sin auth)
```typescript
publicRateLimiter
- Ventana: 1 minuto
- Máximo: 20 requests
- Bloqueo: 15 minutos
- Aplica a: Rutas públicas
```

### Cron/Webhooks
```typescript
cronRateLimiter
- Ventana: 1 minuto
- Máximo: 1 request
- Bloqueo: 5 minutos
- Aplica a: /api/cron/*, /api/webhooks/*
```

## 🔄 Flujo de Funcionamiento

### 1. Request Entrante

```
Cliente hace request → Middleware intercepta
├─ Obtiene IP del cliente (headers: x-forwarded-for, cf-connecting-ip, etc.)
├─ Obtiene userId si está autenticado
└─ Crea key: "user:abc123" o "ip:192.168.1.1"
```

### 2. Verificación de Rate Limit

```
Middleware selecciona limiter según ruta:
├─ /api/cron/* → cronRateLimiter (1/min)
├─ /sign-in, /sign-up → authRateLimiter (10/15min)
├─ /api/* → generalRateLimiter (100/min)
└─ Rutas públicas → publicRateLimiter (20/min)

RateLimiter.check(key):
├─ ¿Está bloqueado? → 429 Too Many Requests
├─ ¿Ventana expiró? → Resetear contador
├─ Incrementar contador
├─ ¿Excedió límite? → Bloquear temporalmente
└─ Retornar: { allowed, remaining, resetTime, blocked }
```

### 3. Response

```
Si PERMITIDO:
├─ Agregar headers:
│  ├─ X-RateLimit-Limit: 100
│  ├─ X-RateLimit-Remaining: 87
│  └─ X-RateLimit-Reset: 1729534800000
└─ Continuar con request normal

Si BLOQUEADO:
├─ Status: 429 Too Many Requests
├─ Headers:
│  └─ Retry-After: 300 (segundos)
└─ Body: {
     error: "Too many requests",
     message: "You have been temporarily blocked...",
     retryAfter: 300
   }
```

## 📊 Ejemplos de Uso

### Escenario 1: Usuario normal

```
User hace 50 requests en 30 segundos
├─ Requests 1-50: ✅ Permitidos (100/min limit)
├─ Remaining: 50
└─ Headers: X-RateLimit-Remaining: 50

User hace 55 más requests en los próximos 30s
├─ Requests 51-100: ✅ Permitidos
├─ Request 101: ❌ BLOQUEADO (excedió 100/min)
└─ Response: 429 Too Many Requests
    Retry-After: 300 segundos (5 min)

User espera 5 minutos
└─ Bloqueo expirado → puede volver a hacer requests
```

### Escenario 2: Brute-force attack en login

```
Atacante intenta login 15 veces en 5 minutos
├─ Requests 1-10: ✅ Permitidos (10/15min limit)
├─ Request 11: ❌ BLOQUEADO
└─ Bloqueo: 1 hora

Admin desbloquea manualmente:
└─ POST /api/admin/rate-limit/unblock
    Body: { key: "ip:1.2.3.4", limiter: "auth" }
```

### Escenario 3: Bot malicioso

```
Bot hace 500 requests en 10 segundos
├─ Requests 1-100: ✅ Permitidos
├─ Request 101: ❌ BLOQUEADO (5 min)
├─ IP: 1.2.3.4 bloqueada
└─ Log: ⚠️ [RATE LIMIT] Bloqueado: ip:1.2.3.4 - /api/products - api
```

## 🔒 Headers de Rate Limit

Cada response incluye headers informativos:

```http
X-RateLimit-Limit: 100          # Límite máximo de requests
X-RateLimit-Remaining: 87       # Requests restantes en ventana
X-RateLimit-Reset: 1729534800   # Timestamp de reset (ms)
```

Si se excede el límite:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 300
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1729534800

{
  "error": "Too many requests",
  "message": "You have been temporarily blocked due to too many requests",
  "retryAfter": 300
}
```

## 🛠️ Admin API

### Ver Estadísticas

```bash
GET /api/admin/rate-limit/stats
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "stats": {
    "general": {
      "totalEntries": 150,
      "blockedEntries": 3,
      "activeEntries": 120
    },
    "auth": {
      "totalEntries": 20,
      "blockedEntries": 2,
      "activeEntries": 18
    },
    "public": { ... },
    "cron": { ... },
    "timestamp": "2024-10-21T10:30:00.000Z"
  }
}
```

### Desbloquear IP/Usuario

```bash
POST /api/admin/rate-limit/unblock
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "key": "ip:192.168.1.100",
  "limiter": "auth"
}

Response:
{
  "success": true,
  "unblocked": true,
  "message": "Key ip:192.168.1.100 desbloqueada exitosamente"
}
```

### Limpiar Rate Limiter (Testing)

```bash
DELETE /api/admin/rate-limit?limiter=all
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "message": "Rate limiter all limpiado exitosamente"
}
```

## 🧪 Testing

### Prueba 1: Exceder límite API general

```bash
# Hacer 101 requests rápidos
for i in {1..101}; do
  curl http://localhost:3000/api/products
done

# Request 101 debe retornar 429
```

### Prueba 2: Verificar headers

```bash
curl -I http://localhost:3000/api/products

HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1729534860000
```

### Prueba 3: Verificar bloqueo por IP

```bash
# Desde Postman o curl, hacer 101 requests
# Verificar que las siguientes retornan 429

curl http://localhost:3000/api/products
# Response: 429 Too Many Requests
```

### Prueba 4: Admin stats

```bash
# Como admin
curl http://localhost:3000/api/admin/rate-limit/stats \
  -H "Authorization: Bearer <token>"
```

## 🔧 Configuración Personalizada

### Cambiar límites

```typescript
// lib/rateLimit.ts

// Más restrictivo (10 requests por minuto)
export const strictRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  blockDurationMs: 30 * 60 * 1000, // 30 minutos
})

// Más permisivo (1000 requests por minuto)
export const permissiveRateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 1000,
  blockDurationMs: 1 * 60 * 1000, // 1 minuto
})
```

### Aplicar a rutas específicas

```typescript
// middleware.ts

const isSpecialRoute = createRouteMatcher(['/api/special/*'])

if (isSpecialRoute(req)) {
  rateLimitResult = strictRateLimiter.check(key)
}
```

## 📈 Monitoreo

### Logs

```
⚠️ [RATE LIMIT] Quedan 9 requests - user:abc123
⚠️ [RATE LIMIT] Bloqueado: ip:1.2.3.4 - /api/products - api
🧹 [RATE LIMIT] Limpiados 45 entries expirados
✅ [RATE LIMIT] Desbloqueado manualmente: ip:1.2.3.4
```

### Métricas recomendadas

- Total de requests bloqueados por hora
- IPs/usuarios más bloqueados
- Endpoints más atacados
- Duración promedio de bloqueos

## 🚨 Troubleshooting

### Problema: IPs legítimas bloqueadas

**Solución:**
```bash
# Desbloquear manualmente
POST /api/admin/rate-limit/unblock
{ "key": "ip:1.2.3.4", "limiter": "general" }

# O aumentar límite en lib/rateLimit.ts
```

### Problema: Bot evade límites cambiando IP

**Solución:**
- Usar rate limiting por `userId` para usuarios autenticados
- Implementar CAPTCHA en rutas públicas
- Usar servicios como Cloudflare Bot Management

### Problema: Vercel/Cloudflare detrás de proxy

**Verificar headers correctos:**
```typescript
// lib/rateLimit.ts ya maneja:
x-forwarded-for
cf-connecting-ip
x-real-ip
```

## ✅ Checklist de Implementación

- [x] RateLimiter class implementada
- [x] 4 configuraciones predefinidas (general, auth, public, cron)
- [x] Middleware integrado con detección de IP
- [x] Headers de rate limit en responses
- [x] Mensajes de error informativos (429)
- [x] Limpieza automática de entradas expiradas
- [x] Admin API para gestión (stats, unblock, clear)
- [x] Logs de bloqueos y warnings
- [x] Diferentes límites por tipo de ruta
- [x] Soporte para usuarios autenticados y anónimos
- [x] Documentación completa

## 🎯 Beneficios Implementados

✅ **Protección contra DoS**
- Limita requests por IP/usuario
- Bloqueo temporal automático
- Diferentes niveles según criticidad

✅ **Prevención de Brute-Force**
- Auth endpoints con límites muy restrictivos (10/15min)
- Bloqueo de 1 hora en intentos de login

✅ **Optimización de Recursos**
- Reduce carga del servidor
- Evita sobrecarga de base de datos
- Mejora performance para usuarios legítimos

✅ **Visibilidad y Control**
- Logs de todos los bloqueos
- Estadísticas en tiempo real
- Admin puede desbloquear manualmente

---

**Implementado por**: GitHub Copilot
**Fecha**: 21 de Octubre, 2025
**Status**: ✅ Completado y funcional
