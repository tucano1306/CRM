# ⏱️ Sistema de Timeouts para APIs

## Descripción General

Sistema de timeouts de 5 segundos para todas las operaciones API, con manejo especial para operaciones de base de datos lentas y logging integrado.

---

## Características

✅ **Timeout de 5 segundos por defecto** para todas las operaciones  
✅ **Detección de operaciones lentas** (> 3 segundos)  
✅ **Logging integrado** con categorías DATABASE y API  
✅ **Respuestas HTTP apropiadas** (504 Gateway Timeout)  
✅ **Type-safe** con TypeScript genéricos  
✅ **Compatible con Prisma** y cualquier promesa  

---

## Archivo Principal

**Ubicación**: `lib/timeout.ts`

### Exports

```typescript
export class TimeoutError extends Error
export function withTimeout<T>(promise: Promise<T>, ms?: number): Promise<T>
export function withPrismaTimeout<T>(operation: () => Promise<T>, ms?: number): Promise<T>
export function handleTimeoutError(error: unknown): { error: string; code: string; status: number }
export function withApiTimeout<T>(handler: () => Promise<T>, timeoutMs?: number): Promise<T>
```

---

## API Reference

### TimeoutError

Custom error class para identificar timeouts.

```typescript
class TimeoutError extends Error {
  constructor(message: string = 'Request timed out')
  name: 'TimeoutError'
}
```

**Uso**:
```typescript
if (error instanceof TimeoutError) {
  // Manejar timeout específicamente
}
```

---

### withTimeout

Envuelve cualquier promesa con un timeout.

```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  ms: number = 5000
): Promise<T>
```

**Parámetros**:
- `promise`: Promesa a ejecutar con timeout
- `ms`: Tiempo máximo en milisegundos (default: 5000)

**Retorna**: La promesa original o rechaza con `TimeoutError`

**Ejemplo**:
```typescript
import { withTimeout } from '@/lib/timeout'

try {
  const result = await withTimeout(
    fetch('https://api.example.com/data'),
    3000 // 3 segundos
  )
  console.log(result)
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Request timed out after 3 seconds')
  }
}
```

---

### withPrismaTimeout

Wrapper específico para operaciones de Prisma con timeout y logging automático.

```typescript
async function withPrismaTimeout<T>(
  operation: () => Promise<T>,
  ms: number = 5000
): Promise<T>
```

**Parámetros**:
- `operation`: Función que retorna una promesa de Prisma
- `ms`: Tiempo máximo en milisegundos (default: 5000)

**Características**:
- ✅ Mide duración de la operación
- ✅ Log WARN si > 3 segundos (operación lenta)
- ✅ Log ERROR si timeout
- ✅ Incluye duración en logs

**Ejemplo**:
```typescript
import { withPrismaTimeout } from '@/lib/timeout'
import { prisma } from '@/lib/prisma'

// En lugar de:
const users = await prisma.user.findMany()

// Usar:
const users = await withPrismaTimeout(() =>
  prisma.user.findMany()
)
```

**Logs generados**:
```typescript
// Si operación tarda > 3 segundos pero < 5 segundos:
// WARN [DATABASE] Slow database operation { duration: 3200, threshold: 3000 }

// Si operación tarda > 5 segundos:
// ERROR [DATABASE] Database operation timeout { duration: 5001, timeout: 5000 }
```

---

### handleTimeoutError

Maneja errores de timeout y retorna respuesta apropiada para APIs.

```typescript
function handleTimeoutError(error: unknown): {
  error: string
  code: string
  status: number
}
```

**Retorna**:
- Para `TimeoutError`:
  ```typescript
  {
    error: 'La operación tardó demasiado tiempo. Por favor, intenta de nuevo.',
    code: 'TIMEOUT_ERROR',
    status: 504
  }
  ```
- Para otros errores:
  ```typescript
  {
    error: 'Error interno del servidor',
    code: 'INTERNAL_ERROR',
    status: 500
  }
  ```

**Ejemplo en API Route**:
```typescript
export async function GET(request: NextRequest) {
  try {
    const data = await withPrismaTimeout(() =>
      prisma.order.findMany()
    )
    return NextResponse.json({ success: true, data })
  } catch (error) {
    const errorResponse = handleTimeoutError(error)
    return NextResponse.json(
      { 
        success: false, 
        error: errorResponse.error, 
        code: errorResponse.code 
      },
      { status: errorResponse.status }
    )
  }
}
```

---

### withApiTimeout

Helper para aplicar timeout a handlers completos de API.

```typescript
function withApiTimeout<T>(
  handler: () => Promise<T>,
  timeoutMs: number = 5000
): Promise<T>
```

**Nota**: Es un alias de `withTimeout`, provisto para claridad semántica.

**Ejemplo**:
```typescript
export async function POST(request: NextRequest) {
  try {
    return await withApiTimeout(async () => {
      // Todo el handler aquí
      const body = await request.json()
      const result = await processData(body)
      return NextResponse.json({ success: true, result })
    }, 10000) // 10 segundos para operaciones complejas
  } catch (error) {
    const errorResponse = handleTimeoutError(error)
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.status }
    )
  }
}
```

---

## Implementación en Endpoints

### Order Schedules API

**Archivo**: `app/api/order-schedules/route.ts`

**Operaciones con timeout**:
1. GET - `prisma.orderSchedule.findMany()`
2. POST - `prisma.orderSchedule.upsert()`
3. DELETE - `prisma.orderSchedule.findUnique()` y `prisma.orderSchedule.update()`

**Código**:
```typescript
import { withPrismaTimeout, handleTimeoutError } from '@/lib/timeout'

// GET
const schedules = await withPrismaTimeout(() => 
  prisma.orderSchedule.findMany({
    where: { sellerId, isActive: true },
    orderBy: { dayOfWeek: 'asc' }
  })
)

// POST
const schedule = await withPrismaTimeout(() =>
  prisma.orderSchedule.upsert({
    where: { sellerId_dayOfWeek: { sellerId, dayOfWeek } },
    update: { startTime, endTime, isActive },
    create: { sellerId, dayOfWeek, startTime, endTime, isActive }
  })
)

// Error handling
catch (error) {
  const errorResponse = handleTimeoutError(error)
  return NextResponse.json(
    { success: false, error: errorResponse.error, code: errorResponse.code },
    { status: errorResponse.status }
  )
}
```

---

### Chat Schedules API

**Archivo**: `app/api/chat-schedules/route.ts`

Implementación idéntica a Order Schedules:
- GET con timeout
- POST con timeout
- DELETE con timeout
- Error handling con `handleTimeoutError()`

---

## Comportamiento por Operación

### Operación Normal (< 3 segundos)

```
Cliente → API → Prisma → DB
         ↓
    Respuesta exitosa
    (sin logs especiales)
```

### Operación Lenta (3-5 segundos)

```
Cliente → API → Prisma → DB (3.2 segundos)
         ↓
    ⚠️ LOG: "Slow database operation: 3200ms"
         ↓
    Respuesta exitosa
```

### Timeout (> 5 segundos)

```
Cliente → API → Prisma → DB (> 5 segundos)
         ↓
    ❌ TimeoutError lanzado
         ↓
    LOG: "Database operation timeout after 5001ms"
         ↓
    Respuesta 504 Gateway Timeout
```

---

## Ejemplos de Uso

### Ejemplo 1: Query Simple

```typescript
import { withPrismaTimeout } from '@/lib/timeout'

export async function GET() {
  try {
    const products = await withPrismaTimeout(() =>
      prisma.product.findMany({
        where: { isActive: true }
      })
    )
    
    return NextResponse.json({ success: true, data: products })
  } catch (error) {
    const errorResponse = handleTimeoutError(error)
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.status }
    )
  }
}
```

### Ejemplo 2: Query Compleja con Include

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('orderId')
  
  try {
    const order = await withPrismaTimeout(() =>
      prisma.order.findUnique({
        where: { id: orderId },
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          client: true,
          seller: true
        }
      }),
      7000 // Timeout extendido para query compleja
    )
    
    return NextResponse.json({ success: true, data: order })
  } catch (error) {
    const errorResponse = handleTimeoutError(error)
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.status }
    )
  }
}
```

### Ejemplo 3: Transacción con Timeout

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  try {
    const result = await withPrismaTimeout(async () => {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({ data: body.order })
        
        for (const item of body.items) {
          await tx.orderItem.create({
            data: { ...item, orderId: order.id }
          })
        }
        
        return order
      })
    }, 10000) // 10 segundos para transacción compleja
    
    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    const errorResponse = handleTimeoutError(error)
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.status }
    )
  }
}
```

### Ejemplo 4: Multiple Queries en Paralelo

```typescript
export async function GET() {
  try {
    const [orders, products, clients] = await Promise.all([
      withPrismaTimeout(() => prisma.order.findMany()),
      withPrismaTimeout(() => prisma.product.findMany()),
      withPrismaTimeout(() => prisma.client.findMany())
    ])
    
    return NextResponse.json({
      success: true,
      data: { orders, products, clients }
    })
  } catch (error) {
    const errorResponse = handleTimeoutError(error)
    return NextResponse.json(
      { success: false, error: errorResponse.error },
      { status: errorResponse.status }
    )
  }
}
```

---

## Testing

### Script de Testing Manual

```powershell
# Test timeout con operación lenta simulada
# Crear archivo: scripts/test-timeout.ps1

$baseUrl = "http://localhost:3000"

Write-Host "Testing Timeout System" -ForegroundColor Cyan

# Test 1: Operación normal (debería completar)
Write-Host "`nTest 1: Normal operation..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules?sellerId=550e8400-e29b-41d4-a716-446655440000" `
        -Method GET `
        -TimeoutSec 10
    
    Write-Host "✓ Completed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Operación con muchos datos (verificar logs de slow operation)
Write-Host "`nTest 2: Large query (check for slow operation warnings)..." -ForegroundColor Yellow
# Revisar logs de aplicación para ver warnings de operaciones lentas
```

### Unit Tests

```typescript
// __tests__/lib/timeout.test.ts
import { withTimeout, withPrismaTimeout, TimeoutError } from '@/lib/timeout'

describe('Timeout Utilities', () => {
  it('should complete fast operations', async () => {
    const fastOp = () => new Promise(resolve => setTimeout(() => resolve('done'), 100))
    const result = await withTimeout(fastOp(), 1000)
    expect(result).toBe('done')
  })

  it('should throw TimeoutError for slow operations', async () => {
    const slowOp = () => new Promise(resolve => setTimeout(() => resolve('done'), 2000))
    await expect(withTimeout(slowOp(), 1000)).rejects.toThrow(TimeoutError)
  })

  it('should log slow database operations', async () => {
    const slowDbOp = () => new Promise(resolve => setTimeout(() => resolve('data'), 3500))
    
    // Mock logger
    const warnSpy = jest.spyOn(console, 'warn')
    
    await withPrismaTimeout(slowDbOp, 5000)
    
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Slow database operation')
    )
  })
})
```

---

## Configuración de Timeouts

### Timeouts Recomendados por Tipo de Operación

| Tipo de Operación | Timeout Recomendado | Razón |
|-------------------|---------------------|-------|
| `findUnique()` | 2-3 segundos | Query simple con índice |
| `findMany()` (< 100 items) | 3-5 segundos | Query con filtros básicos |
| `findMany()` (> 100 items) | 5-7 segundos | Query con muchos resultados |
| `create()` | 2-3 segundos | Insert simple |
| `update()` | 2-3 segundos | Update simple |
| `delete()` | 2-3 segundos | Delete simple |
| Query con `include` | 5-7 segundos | Joins múltiples |
| Transacción simple | 5-7 segundos | Multiple operations |
| Transacción compleja | 10-15 segundos | Many operations |

### Variables de Entorno (Opcional)

Para configurar timeouts dinámicamente:

```env
# .env.local
API_TIMEOUT_MS=5000
DB_TIMEOUT_MS=5000
SLOW_QUERY_THRESHOLD_MS=3000
```

```typescript
// Uso en código
const timeout = parseInt(process.env.API_TIMEOUT_MS || '5000')
const result = await withPrismaTimeout(operation, timeout)
```

---

## Monitoreo y Alertas

### Logs a Monitorear

1. **Slow Operations** (WARNING):
   ```
   [DATABASE] Slow database operation { duration: 3200, threshold: 3000 }
   ```
   **Acción**: Optimizar query (índices, select específico, etc.)

2. **Timeouts** (ERROR):
   ```
   [DATABASE] Database operation timeout { duration: 5001, timeout: 5000 }
   ```
   **Acción**: Investigar query, aumentar timeout si necesario

### Métricas a Rastrear

- **Tasa de timeouts**: Número de timeouts / total requests
- **Duración promedio**: Tiempo promedio de queries
- **Queries lentas**: Número de queries > 3 segundos
- **Endpoints afectados**: Qué endpoints tienen más timeouts

### Ejemplo de Query para Logs

```bash
# Grep para encontrar operaciones lentas
grep "Slow database operation" logs/app.log | wc -l

# Grep para encontrar timeouts
grep "Database operation timeout" logs/app.log | wc -l

# Analizar duración promedio
grep "Slow database operation" logs/app.log | grep -oP 'duration: \K[0-9]+' | awk '{sum+=$1; count++} END {print sum/count}'
```

---

## Troubleshooting

### Problema: Muchos Timeouts

**Síntomas**: Múltiples requests fallan con 504

**Posibles causas**:
1. Base de datos lenta o sobrecargada
2. Query mal optimizado (falta índice)
3. Timeout muy corto para la operación
4. Conexiones de DB agotadas

**Soluciones**:
1. Revisar índices en Prisma schema
2. Optimizar queries (usar `select` específico)
3. Aumentar timeout para operaciones complejas
4. Revisar pool de conexiones de Prisma

### Problema: Operaciones Lentas Frecuentes

**Síntomas**: Muchos warnings de "Slow database operation"

**Soluciones**:
1. Agregar índices en campos filtrados
2. Usar `select` para limitar campos retornados
3. Paginar resultados con `take` y `skip`
4. Usar `cursor`-based pagination para datasets grandes

### Problema: False Positives en Timeouts

**Síntomas**: Operaciones legítimas fallan por timeout

**Solución**:
```typescript
// Aumentar timeout para operaciones específicas
const result = await withPrismaTimeout(
  () => prisma.complexQuery(),
  15000 // 15 segundos en lugar de 5
)
```

---

## Mejores Prácticas

### 1. Siempre Usar withPrismaTimeout para Operaciones de DB

❌ **Mal**:
```typescript
const users = await prisma.user.findMany()
```

✅ **Bien**:
```typescript
const users = await withPrismaTimeout(() =>
  prisma.user.findMany()
)
```

### 2. Ajustar Timeout según Complejidad

```typescript
// Query simple: 3 segundos
await withPrismaTimeout(() => prisma.user.findUnique({ where: { id } }), 3000)

// Query con includes: 7 segundos
await withPrismaTimeout(() => 
  prisma.order.findMany({ include: { items: { include: { product: true } } } }),
  7000
)

// Transacción compleja: 15 segundos
await withPrismaTimeout(() => prisma.$transaction([...]), 15000)
```

### 3. Siempre Manejar TimeoutError

```typescript
try {
  const result = await withPrismaTimeout(operation)
  return NextResponse.json({ success: true, data: result })
} catch (error) {
  // Usa handleTimeoutError para respuestas consistentes
  const errorResponse = handleTimeoutError(error)
  return NextResponse.json(
    { success: false, error: errorResponse.error, code: errorResponse.code },
    { status: errorResponse.status }
  )
}
```

### 4. Optimizar Queries Lentas

```typescript
// ❌ Mal: Sin select, sin índice
const orders = await prisma.order.findMany({
  where: { clientName: 'John' },
  include: { items: true, client: true, seller: true }
})

// ✅ Bien: Con select específico, usar campo indexado
const orders = await prisma.order.findMany({
  where: { clientId: 'uuid' }, // Campo indexado
  select: {
    id: true,
    orderNumber: true,
    status: true,
    items: { select: { id: true, productName: true, quantity: true } }
  }
})
```

---

## Próximos Pasos

### Mejoras Futuras

1. **Circuit Breaker**: Abrir circuito después de X timeouts consecutivos
2. **Retry Logic**: Reintentar operaciones fallidas automáticamente
3. **Adaptive Timeouts**: Ajustar timeouts dinámicamente según histórico
4. **Metrics Dashboard**: Visualizar timeouts y operaciones lentas en tiempo real
5. **Query Profiling**: Identificar automáticamente queries a optimizar

---

**Última actualización**: 2024-01-15  
**Versión**: 1.0.0  
**Endpoints implementados**: Order Schedules, Chat Schedules
