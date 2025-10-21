# Logging/Monitoring Centralizado

## 📋 Índice

- [Descripción](#descripción)
- [Características](#características)
- [Niveles de Log](#niveles-de-log)
- [Categorías](#categorías)
- [Uso Básico](#uso-básico)
- [Contexto Estructurado](#contexto-estructurado)
- [Métodos de Utilidad](#métodos-de-utilidad)
- [Integración en API Routes](#integración-en-api-routes)
- [Configuración](#configuración)
- [Servicios Externos](#servicios-externos)
- [Performance Monitoring](#performance-monitoring)
- [Testing](#testing)
- [Ejemplos Completos](#ejemplos-completos)

---

## 🎯 Descripción

Sistema de logging/monitoring centralizado que proporciona:

- ✅ **Logging estructurado** con contexto rico
- ✅ **5 niveles de severidad** (DEBUG, INFO, WARN, ERROR, FATAL)
- ✅ **12 categorías** para organizar logs
- ✅ **Formato pretty** en desarrollo, JSON en producción
- ✅ **Helpers especializados** para API, Auth, Performance, etc.
- ✅ **Preparado para Sentry, Logtail, Datadog, etc.**
- ✅ **Buffer de logs** para batch processing
- ✅ **Request tracking** con IDs únicos

---

## 🚀 Características

### Antes vs Después

| Feature | ❌ Antes | ✅ Después |
|---------|---------|-----------|
| Logging | `console.error()` básico | Logger estructurado |
| Niveles | Solo error | DEBUG, INFO, WARN, ERROR, FATAL |
| Contexto | Ninguno | userId, IP, endpoint, duration, etc. |
| Categorías | Ninguna | 12 categorías organizadas |
| Formato | String plano | Pretty dev / JSON prod |
| Servicios externos | No | Sentry, Logtail, Datadog ready |
| Request tracking | No | Request IDs automáticos |
| Performance | No | Timers y thresholds |

---

## 📊 Niveles de Log

### LogLevel Enum

```typescript
enum LogLevel {
  DEBUG = 'debug',    // Información de debugging (solo dev)
  INFO = 'info',      // Información general
  WARN = 'warn',      // Advertencias no críticas
  ERROR = 'error',    // Errores recuperables
  FATAL = 'fatal'     // Errores críticos no recuperables
}
```

### Prioridad y Filtrado

```typescript
DEBUG (0) < INFO (1) < WARN (2) < ERROR (3) < FATAL (4)
```

- **Desarrollo**: Muestra desde DEBUG en adelante
- **Producción**: Muestra desde INFO en adelante

---

## 🏷️ Categorías

```typescript
enum LogCategory {
  API = 'api',                    // Requests/responses API
  AUTH = 'auth',                  // Autenticación/autorización
  DATABASE = 'database',          // Queries de base de datos
  RATE_LIMIT = 'rate_limit',      // Rate limiting
  CORS = 'cors',                  // CORS headers
  EVENTS = 'events',              // Sistema de eventos
  CRON = 'cron',                  // Cron jobs
  WEBHOOK = 'webhook',            // Webhooks externos
  VALIDATION = 'validation',      // Validación de inputs
  PERFORMANCE = 'performance',    // Performance monitoring
  SECURITY = 'security',          // Eventos de seguridad
  SYSTEM = 'system'               // Sistema general
}
```

---

## 📝 Uso Básico

### Importar Logger

```typescript
import logger, { LogCategory } from '@/lib/logger'
```

### Logs por Nivel

```typescript
// DEBUG - Información de debugging
logger.debug(LogCategory.API, 'Fetching users from database', {
  userId: 'user_123',
  endpoint: '/api/users'
})

// INFO - Información general
logger.info(LogCategory.API, 'User created successfully', {
  userId: 'user_123',
  email: 'user@example.com'
})

// WARN - Advertencias
logger.warn(LogCategory.RATE_LIMIT, 'Rate limit approaching', {
  userId: 'user_123',
  remaining: 5
})

// ERROR - Errores recuperables
logger.error(LogCategory.API, 'Failed to create user', error, {
  userId: 'user_123',
  endpoint: '/api/users'
})

// FATAL - Errores críticos
logger.fatal(LogCategory.DATABASE, 'Database connection lost', error, {
  database: 'postgres'
})
```

---

## 🔍 Contexto Estructurado

### LogContext Interface

```typescript
interface LogContext {
  userId?: string          // ID del usuario
  userRole?: string        // Rol del usuario
  ip?: string              // IP del cliente
  userAgent?: string       // User agent
  requestId?: string       // ID único del request
  endpoint?: string        // Endpoint de la API
  method?: string          // Método HTTP
  duration?: number        // Duración en ms
  statusCode?: number      // Status code HTTP
  [key: string]: any       // Campos adicionales
}
```

### Ejemplo con Contexto

```typescript
logger.info(LogCategory.API, 'Order created', {
  userId: 'user_123',
  userRole: 'CLIENT',
  ip: '192.168.1.1',
  endpoint: '/api/orders',
  method: 'POST',
  requestId: 'req_abc123'
}, {
  orderId: 'order_456',
  amount: 150.00,
  items: 5
})
```

### Output (Development)

```
14:30:45 ℹ️ [API] Order created
  📋 Context: userId=user_123, userRole=CLIENT, ip=192.168.1.1, endpoint=/api/orders, method=POST, requestId=req_abc123
  📦 Metadata: {
    "orderId": "order_456",
    "amount": 150.00,
    "items": 5
  }
```

### Output (Production - JSON)

```json
{
  "timestamp": "2025-10-21T14:30:45.123Z",
  "level": "info",
  "category": "api",
  "message": "Order created",
  "context": {
    "userId": "user_123",
    "userRole": "CLIENT",
    "ip": "192.168.1.1",
    "endpoint": "/api/orders",
    "method": "POST",
    "requestId": "req_abc123"
  },
  "metadata": {
    "orderId": "order_456",
    "amount": 150.00,
    "items": 5
  }
}
```

---

## 🛠️ Métodos de Utilidad

### 1. Request Logger

Rastrea requests de API completos con timing:

```typescript
import { createRequestLogger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const requestLogger = createRequestLogger({
    userId: 'user_123',
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined
  })

  requestLogger.start('/api/products', 'GET')

  try {
    const products = await fetchProducts()
    
    requestLogger.end('/api/products', 'GET', 200)
    return NextResponse.json({ data: products })
  } catch (error) {
    requestLogger.error('/api/products', 'GET', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

### 2. Performance Timer

Mide duración de operaciones:

```typescript
import { createPerformanceTimer } from '@/lib/logger'

async function complexOperation() {
  const timer = createPerformanceTimer('complex-calculation', 1000) // threshold 1s

  // Operación compleja...
  await doSomething()

  const duration = timer.end({ userId: 'user_123' })
  // Si duration > 1000ms, log será WARN, sino DEBUG
}
```

### 3. Métodos Especializados

#### API Logging

```typescript
// Inicio de request
logger.apiStart('/api/clients', 'POST', { userId: 'user_123' })

// Fin de request
logger.apiEnd('/api/clients', 'POST', 201, 150, { userId: 'user_123' })

// Error en request
logger.apiError('/api/clients', 'POST', error, { userId: 'user_123' })
```

#### Auth Events

```typescript
// Login exitoso
logger.authEvent('login', 'user_123', { ip: '192.168.1.1' })

// Login fallido
logger.authEvent('failed', undefined, { 
  ip: '192.168.1.1',
  email: 'user@example.com' 
})

// Signup
logger.authEvent('signup', 'user_456', { email: 'new@example.com' })

// Logout
logger.authEvent('logout', 'user_123')
```

#### Database Queries

```typescript
const startTime = Date.now()
const users = await prisma.user.findMany()
const duration = Date.now() - startTime

logger.dbQuery('findMany', 'User', duration, { count: users.length })
```

#### Event System

```typescript
logger.eventEmitted('ORDER_CREATED', {
  userId: 'user_123',
  orderId: 'order_456'
}, {
  amount: 150.00,
  items: 5
})
```

#### Performance Monitoring

```typescript
logger.performance('database-query', 250, 100, {
  query: 'SELECT * FROM orders',
  rows: 1500
})
// Si duration (250ms) > threshold (100ms), log será WARN
```

#### Security Events

```typescript
// Bajo
logger.security('password-changed', 'low', { userId: 'user_123' })

// Medio
logger.security('failed-login-attempts', 'medium', { 
  ip: '192.168.1.1',
  attempts: 3 
})

// Alto
logger.security('suspicious-activity', 'high', { 
  userId: 'user_123',
  action: 'mass-delete-attempt' 
})

// Crítico
logger.security('sql-injection-attempt', 'critical', { 
  ip: '192.168.1.1',
  payload: 'malicious sql' 
})
```

---

## 🔌 Integración en API Routes

### Template Completo

```typescript
import { NextRequest, NextResponse } from 'next/server'
import logger, { LogCategory, createRequestLogger } from '@/lib/logger'
import { auth } from '@clerk/nextjs/server'

export async function GET(request: NextRequest) {
  // 1. Crear request logger
  const { userId } = await auth()
  const requestLogger = createRequestLogger({
    userId: userId || undefined,
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined
  })

  requestLogger.start('/api/resource', 'GET')

  try {
    // 2. Lógica del endpoint
    const data = await fetchData()

    // 3. Log de éxito
    requestLogger.end('/api/resource', 'GET', 200)
    logger.debug(LogCategory.API, 'Resource fetched successfully', {
      userId,
      endpoint: '/api/resource',
      count: data.length
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    // 4. Log de error
    requestLogger.error('/api/resource', 'GET', error)
    logger.error(LogCategory.API, 'Failed to fetch resource', error, {
      userId,
      endpoint: '/api/resource'
    })

    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 }
    )
  }
}
```

---

## ⚙️ Configuración

### Variables de Entorno

```env
# Nivel mínimo de log (debug, info, warn, error, fatal)
LOG_LEVEL=info

# Servicio de logging externo
LOGGING_SERVICE=sentry
# LOGGING_SERVICE=logtail
# LOGGING_SERVICE=datadog

# Tokens de servicios externos
SENTRY_DSN=https://...
LOGTAIL_SOURCE_TOKEN=...
DATADOG_API_KEY=...

# Ambiente
NODE_ENV=production
```

### Configuración Programática

```typescript
import logger from '@/lib/logger'

// Actualizar configuración
logger.updateConfig({
  minLevel: LogLevel.DEBUG,
  enableConsole: true,
  enableExternal: false,
  prettyPrint: true,
  includeStackTrace: true
})
```

---

## 🌐 Servicios Externos

### Integración con Sentry

```typescript
// lib/logger.ts (ya preparado, solo instalar Sentry)

// 1. Instalar Sentry
npm install @sentry/nextjs

// 2. Configurar en .env
LOGGING_SERVICE=sentry
SENTRY_DSN=https://your-dsn@sentry.io/project-id

// 3. El logger enviará automáticamente logs ERROR y FATAL a Sentry
```

### Integración con Logtail

```typescript
// 1. Instalar Logtail
npm install @logtail/node

// 2. Configurar en .env
LOGGING_SERVICE=logtail
LOGTAIL_SOURCE_TOKEN=your_token_here

// 3. El logger enviará logs automáticamente a Logtail
```

### Implementación Manual (Ejemplo Sentry)

```typescript
// lib/logger.ts - Descomentar y modificar:

private async sendToSentry(entry: LogEntry): Promise<void> {
  if (entry.level === LogLevel.ERROR || entry.level === LogLevel.FATAL) {
    const Sentry = await import('@sentry/nextjs')
    
    if (entry.error) {
      Sentry.captureException(entry.error, {
        level: entry.level as any,
        tags: { 
          category: entry.category,
          endpoint: entry.context?.endpoint
        },
        extra: { 
          ...entry.context, 
          ...entry.metadata 
        }
      })
    } else {
      Sentry.captureMessage(entry.message, {
        level: entry.level as any,
        tags: { category: entry.category },
        extra: { ...entry.context, ...entry.metadata }
      })
    }
  }
}
```

---

## ⚡ Performance Monitoring

### Monitoring de Operaciones Lentas

```typescript
import { createPerformanceTimer } from '@/lib/logger'

async function processLargeFile(fileId: string) {
  const timer = createPerformanceTimer('file-processing', 5000) // 5s threshold

  try {
    const file = await loadFile(fileId)
    const result = await processFile(file)
    
    timer.end({ fileId, size: file.size })
    return result
  } catch (error) {
    timer.end({ fileId, error: true })
    throw error
  }
}
```

### Monitoring de Queries

```typescript
async function complexQuery() {
  const timer = createPerformanceTimer('complex-query', 500)

  const result = await prisma.$queryRaw`
    SELECT * FROM orders 
    WHERE created_at > NOW() - INTERVAL '30 days'
  `

  const duration = timer.end({ rows: result.length })
  
  if (duration > 1000) {
    logger.warn(LogCategory.PERFORMANCE, 'Slow query detected', {
      query: 'complex-query',
      duration,
      rows: result.length
    })
  }

  return result
}
```

---

## 🧪 Testing

### Script de Testing

```powershell
# scripts/test-logger.ps1

Write-Host "🧪 Testing Logger System`n" -ForegroundColor Cyan

# Test 1: Logger básico
node -e "
  const logger = require('./lib/logger').default;
  const { LogCategory } = require('./lib/logger');
  
  logger.debug(LogCategory.SYSTEM, 'Debug message');
  logger.info(LogCategory.SYSTEM, 'Info message');
  logger.warn(LogCategory.SYSTEM, 'Warning message');
  logger.error(LogCategory.SYSTEM, 'Error message', new Error('Test error'));
  logger.fatal(LogCategory.SYSTEM, 'Fatal message', new Error('Critical error'));
"

# Test 2: Request logger
node -e "
  const { createRequestLogger } = require('./lib/logger');
  
  const reqLogger = createRequestLogger({
    userId: 'user_123',
    ip: '192.168.1.1'
  });
  
  reqLogger.start('/api/test', 'GET');
  setTimeout(() => reqLogger.end('/api/test', 'GET', 200), 100);
"

# Test 3: Performance timer
node -e "
  const { createPerformanceTimer } = require('./lib/logger');
  
  const timer = createPerformanceTimer('test-operation', 50);
  setTimeout(() => timer.end({ testId: '123' }), 75);
"
```

### Testing en Código

```typescript
import logger, { LogCategory } from '@/lib/logger'

// Test manual
function testLogger() {
  logger.debug(LogCategory.SYSTEM, 'Test debug log')
  logger.info(LogCategory.SYSTEM, 'Test info log')
  logger.warn(LogCategory.SYSTEM, 'Test warning log')
  logger.error(LogCategory.SYSTEM, 'Test error log', new Error('Test'))
  
  // Ver buffer
  const buffer = logger.getBuffer()
  console.log(`Buffer tiene ${buffer.length} logs`)
  
  // Limpiar buffer
  logger.clearBuffer()
}
```

---

## 📚 Ejemplos Completos

### Ejemplo 1: API Route Completo

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import logger, { LogCategory, createRequestLogger, createPerformanceTimer } from '@/lib/logger'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  
  const requestLogger = createRequestLogger({
    userId: userId || undefined,
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || undefined
  })

  requestLogger.start('/api/products', 'GET')
  const timer = createPerformanceTimer('fetch-products', 1000)

  try {
    const products = await prisma.product.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    })

    const duration = timer.end({ count: products.length })
    requestLogger.end('/api/products', 'GET', 200)

    logger.info(LogCategory.API, 'Products fetched successfully', {
      userId,
      endpoint: '/api/products',
      count: products.length,
      duration
    })

    return NextResponse.json({
      success: true,
      data: products,
      meta: { count: products.length, duration }
    })
  } catch (error) {
    timer.end({ error: true })
    requestLogger.error('/api/products', 'GET', error)

    logger.error(LogCategory.API, 'Failed to fetch products', error, {
      userId,
      endpoint: '/api/products'
    })

    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}
```

### Ejemplo 2: Event Handler con Logging

```typescript
// lib/events/handlers/order.handler.ts
import logger, { LogCategory, createPerformanceTimer } from '@/lib/logger'
import { OrderEvent, EventType } from '../types/event.types'
import { eventEmitter } from '../eventEmitter'

export class OrderEventHandler {
  private static async handleOrderCreated(event: OrderEvent): Promise<void> {
    const timer = createPerformanceTimer('order-created-handler', 500)

    logger.eventEmitted('ORDER_CREATED', {
      userId: event.userId,
      orderId: event.data.orderId
    }, event.data)

    try {
      // Enviar notificación
      await eventEmitter.emit({
        type: EventType.NOTIFICATION_CREATED,
        timestamp: new Date(),
        userId: event.userId,
        data: {
          title: 'Nueva Orden Creada',
          message: `Orden #${event.data.orderId} creada exitosamente`
        }
      })

      timer.end({ orderId: event.data.orderId })

      logger.info(LogCategory.EVENTS, 'Order created event handled', {
        userId: event.userId,
        orderId: event.data.orderId
      })
    } catch (error) {
      timer.end({ error: true })

      logger.error(LogCategory.EVENTS, 'Failed to handle order created event', error, {
        userId: event.userId,
        orderId: event.data.orderId
      })
    }
  }
}
```

### Ejemplo 3: Middleware con Logging

```typescript
// middleware.ts (extracto)
import logger, { LogCategory } from '@/lib/logger'

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const ip = getClientIp(req)

  // Log de autenticación
  logger.debug(LogCategory.AUTH, 'Middleware authentication check', {
    userId: userId || undefined,
    endpoint: req.nextUrl.pathname,
    method: req.method,
    ip
  })

  // Rate limiting con logging
  const rateLimitResult = generalRateLimiter.check(`user:${userId}:${ip}`)

  if (!rateLimitResult.allowed) {
    logger.warn(LogCategory.RATE_LIMIT, 'Rate limit exceeded', {
      userId: userId || undefined,
      ip,
      endpoint: req.nextUrl.pathname
    }, {
      remaining: rateLimitResult.remaining,
      blocked: rateLimitResult.blocked
    })

    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  // Log de acceso denegado
  if (isSellerRoute(req) && userRole !== 'SELLER') {
    logger.security('unauthorized-route-access', 'medium', {
      userId: userId || undefined,
      userRole,
      endpoint: req.nextUrl.pathname,
      ip
    }, {
      attemptedAccess: 'seller-route',
      actualRole: userRole
    })

    return NextResponse.redirect(new URL('/unauthorized', req.url))
  }

  return NextResponse.next()
})
```

---

## 🔒 Security Best Practices

### 1. No Loggear Información Sensible

```typescript
// ❌ MAL - Loggea información sensible
logger.info(LogCategory.AUTH, 'User login', {
  email: 'user@example.com',
  password: 'secret123',  // ❌ NUNCA
  creditCard: '1234-5678'  // ❌ NUNCA
})

// ✅ BIEN - Solo loggea información necesaria
logger.info(LogCategory.AUTH, 'User login', {
  userId: 'user_123',
  email: 'user@example.com',
  ip: '192.168.1.1'
})
```

### 2. Sanitizar Inputs antes de Loggear

```typescript
function sanitizeForLogging(data: any): any {
  const sensitive = ['password', 'token', 'secret', 'creditCard', 'ssn']
  
  if (typeof data === 'object') {
    const sanitized = { ...data }
    sensitive.forEach(key => {
      if (sanitized[key]) sanitized[key] = '[REDACTED]'
    })
    return sanitized
  }
  
  return data
}

logger.info(LogCategory.API, 'User data', {
  userId: 'user_123'
}, sanitizeForLogging(userData))
```

### 3. Limitar Tamaño de Logs

```typescript
function truncateString(str: string, maxLength: number = 1000): string {
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '... [truncated]'
}

logger.error(LogCategory.API, 'Large payload error', error, {
  payload: truncateString(JSON.stringify(largePayload))
})
```

---

## 📊 Monitoring Dashboard (Futuro)

Con el sistema estructurado, puedes crear dashboards en servicios externos:

### Sentry

- Ver todos los errores por categoría
- Filtrar por userId, endpoint, etc.
- Performance monitoring automático
- Alertas en tiempo real

### Logtail

- Búsqueda full-text en logs
- Dashboards personalizados
- Alertas basadas en patrones
- Retención de logs configurable

### Datadog

- APM (Application Performance Monitoring)
- Métricas en tiempo real
- Distributed tracing
- Alertas inteligentes

---

## ✅ Checklist de Implementación

- [x] `lib/logger.ts` creado con sistema completo
- [x] Logging agregado en `/api/clients` (ejemplo)
- [x] Logging agregado en `middleware.ts`
- [x] Logging agregado en event handlers
- [x] Helpers: `createRequestLogger`, `createPerformanceTimer`
- [x] Documentación completa
- [ ] **Probar logger localmente** (`npm run dev`)
- [ ] **Instalar servicio externo** (Sentry/Logtail)
- [ ] **Agregar logging a todos los endpoints**
- [ ] **Configurar alertas en servicio externo**
- [ ] **Deploy a producción**

---

**Última actualización**: Octubre 21, 2025  
**Versión**: 1.0.0
