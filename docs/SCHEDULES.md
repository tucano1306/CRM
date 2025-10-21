# 📅 Sistema de Horarios (Schedules)

## Índice
- [Descripción General](#descripción-general)
- [Modelos de Datos](#modelos-de-datos)
- [API Endpoints](#api-endpoints)
  - [Order Schedules API](#order-schedules-api)
  - [Chat Schedules API](#chat-schedules-api)
- [Validación de Horarios](#validación-de-horarios)
- [Funciones Helper](#funciones-helper)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Testing](#testing)

---

## Descripción General

El sistema de horarios permite a los vendedores configurar:
- **Order Schedules**: Horarios en los que aceptan pedidos
- **Chat Schedules**: Horarios en los que están disponibles para chat

Estos horarios se validan automáticamente cuando:
- Un cliente intenta crear un pedido (`POST /api/buyer/orders`)
- Un usuario intenta enviar un mensaje de chat (`POST /api/chat-messages`)

### Características Principales

✅ **Configuración por día de la semana**: Cada vendedor puede tener horarios diferentes para cada día  
✅ **Validación de formato**: Tiempos en formato HH:MM (00:00 - 23:59)  
✅ **Validación de rango**: startTime debe ser menor que endTime  
✅ **Soft Delete**: Los schedules se desactivan en lugar de eliminarse  
✅ **Upsert**: Actualización automática si ya existe schedule para el día  
✅ **Logging completo**: Todas las operaciones se registran  

---

## Modelos de Datos

### OrderSchedule

```prisma
model OrderSchedule {
  id        String    @id @default(uuid())
  sellerId  String
  dayOfWeek DayOfWeek
  startTime String    // "08:00"
  endTime   String    // "17:00"
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  seller    Seller    @relation(fields: [sellerId], references: [id])
  
  @@unique([sellerId, dayOfWeek])
  @@map("order_schedules")
}
```

### ChatSchedule

```prisma
model ChatSchedule {
  id        String    @id @default(uuid())
  sellerId  String
  dayOfWeek DayOfWeek
  startTime String    // "09:00"
  endTime   String    // "18:00"
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  seller    Seller    @relation(fields: [sellerId], references: [id])
  
  @@unique([sellerId, dayOfWeek])
  @@map("chat_schedules")
}
```

### DayOfWeek Enum

```prisma
enum DayOfWeek {
  MONDAY
  TUESDAY
  WEDNESDAY
  THURSDAY
  FRIDAY
  SATURDAY
  SUNDAY
}
```

---

## API Endpoints

### Order Schedules API

#### GET /api/order-schedules

Obtener todos los horarios de pedidos de un vendedor.

**Query Parameters**:
- `sellerId` (required): UUID del vendedor

**Response 200**:
```json
{
  "success": true,
  "schedules": [
    {
      "id": "uuid",
      "sellerId": "seller-uuid",
      "dayOfWeek": "MONDAY",
      "startTime": "08:00",
      "endTime": "17:00",
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

**Errores**:
- `400`: sellerId no proporcionado
- `500`: Error del servidor

**Ejemplo cURL**:
```bash
curl "http://localhost:3000/api/order-schedules?sellerId=550e8400-e29b-41d4-a716-446655440000"
```

---

#### POST /api/order-schedules

Crear o actualizar un horario de pedidos.

**Request Body**:
```json
{
  "sellerId": "550e8400-e29b-41d4-a716-446655440000",
  "dayOfWeek": "MONDAY",
  "startTime": "08:00",
  "endTime": "17:00",
  "isActive": true
}
```

**Validaciones**:
- `sellerId`: UUID válido, seller debe existir
- `dayOfWeek`: Uno de MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
- `startTime`: Formato HH:MM, 00:00-23:59
- `endTime`: Formato HH:MM, 00:00-23:59
- `startTime < endTime`: startTime debe ser menor que endTime
- `isActive`: Boolean (opcional, default: true)

**Response 200** (creación):
```json
{
  "success": true,
  "message": "Horario de pedidos creado exitosamente",
  "schedule": {
    "id": "uuid",
    "sellerId": "seller-uuid",
    "dayOfWeek": "MONDAY",
    "startTime": "08:00",
    "endTime": "17:00",
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Response 200** (actualización):
```json
{
  "success": true,
  "message": "Horario de pedidos actualizado exitosamente",
  "schedule": { /* ... */ }
}
```

**Errores**:
- `400`: Datos inválidos (ver detalles en mensaje)
- `404`: Seller no encontrado
- `500`: Error del servidor

**Ejemplo cURL**:
```bash
curl -X POST http://localhost:3000/api/order-schedules \
  -H "Content-Type: application/json" \
  -d '{
    "sellerId": "550e8400-e29b-41d4-a716-446655440000",
    "dayOfWeek": "MONDAY",
    "startTime": "08:00",
    "endTime": "17:00"
  }'
```

---

#### DELETE /api/order-schedules

Desactivar (soft delete) un horario de pedidos.

**Query Parameters**:
- `sellerId` (required): UUID del vendedor
- `dayOfWeek` (required): Día de la semana

**Response 200**:
```json
{
  "success": true,
  "message": "Horario de pedidos eliminado exitosamente"
}
```

**Errores**:
- `400`: sellerId o dayOfWeek no proporcionados
- `404`: Horario no encontrado
- `500`: Error del servidor

**Ejemplo cURL**:
```bash
curl -X DELETE "http://localhost:3000/api/order-schedules?sellerId=550e8400-e29b-41d4-a716-446655440000&dayOfWeek=MONDAY"
```

---

### Chat Schedules API

La API de Chat Schedules es idéntica a la de Order Schedules, pero en el endpoint `/api/chat-schedules`.

#### GET /api/chat-schedules
#### POST /api/chat-schedules
#### DELETE /api/chat-schedules

Los parámetros, validaciones y respuestas son los mismos que Order Schedules.

---

## Validación de Horarios

### Validación Automática en Pedidos

Cuando un cliente crea un pedido, el sistema valida automáticamente el horario:

```typescript
// En POST /api/buyer/orders
const scheduleValidation = await validateOrderTime(sellerId)

if (!scheduleValidation.isValid) {
  // Obtener próximo horario disponible
  const nextAvailable = await getNextAvailableOrderTime(sellerId)
  
  return NextResponse.json({
    error: "Los pedidos para este vendedor solo se aceptan de 08:00 a 17:00",
    schedule: {
      dayOfWeek: "MONDAY",
      startTime: "08:00",
      endTime: "17:00"
    },
    nextAvailable: {
      dayOfWeek: "TUESDAY",
      startTime: "08:00"
    }
  }, { status: 400 })
}
```

### Validación Automática en Chat

Cuando un usuario envía un mensaje a un seller, el sistema valida el horario:

```typescript
// En POST /api/chat-messages
const scheduleValidation = await validateChatTime(sellerId)

if (!scheduleValidation.isValid) {
  return NextResponse.json({
    success: false,
    error: "El chat está disponible de 09:00 a 18:00",
    schedule: {
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "18:00"
    }
  }, { status: 403 })
}
```

### Comportamiento sin Schedule Configurado

Si un vendedor NO tiene schedules configurados:
- ✅ Se permiten pedidos en cualquier horario
- ✅ Se permite chat en cualquier horario
- 📝 Se registra un log DEBUG indicando que no hay restricciones

---

## Funciones Helper

### `lib/scheduleValidation.ts`

#### validateOrderTime

Valida si se puede crear un pedido en el horario actual.

```typescript
import { validateOrderTime } from '@/lib/scheduleValidation'

const result = await validateOrderTime(sellerId, new Date())

// Resultado:
{
  isValid: boolean
  message?: string
  schedule?: {
    dayOfWeek: string
    startTime: string
    endTime: string
  }
}
```

**Parámetros**:
- `sellerId` (string): UUID del vendedor
- `date` (Date, opcional): Fecha/hora a validar (default: ahora)

**Retorna**:
- `isValid`: true si el pedido es válido
- `message`: Mensaje descriptivo
- `schedule`: Schedule aplicado (si existe)

---

#### validateChatTime

Valida si se puede enviar un mensaje de chat en el horario actual.

```typescript
import { validateChatTime } from '@/lib/scheduleValidation'

const result = await validateChatTime(sellerId, new Date())
```

Misma estructura de parámetros y retorno que `validateOrderTime`.

---

#### getNextAvailableOrderTime

Obtiene el próximo horario disponible para pedidos.

```typescript
import { getNextAvailableOrderTime } from '@/lib/scheduleValidation'

const next = await getNextAvailableOrderTime(sellerId)

// Resultado:
{
  dayOfWeek: "TUESDAY",
  startTime: "08:00"
}
// o null si no hay horarios configurados
```

---

#### getSellerSchedules

Obtiene todos los schedules de un vendedor (pedidos y chat).

```typescript
import { getSellerSchedules } from '@/lib/scheduleValidation'

const schedules = await getSellerSchedules(sellerId)

// Resultado:
{
  orderSchedules: [...],
  chatSchedules: [...]
}
```

---

#### isSellerAvailableNow

Verifica disponibilidad completa del vendedor (pedidos y chat).

```typescript
import { isSellerAvailableNow } from '@/lib/scheduleValidation'

const availability = await isSellerAvailableNow(sellerId)

// Resultado:
{
  ordersAvailable: true,
  chatAvailable: true,
  orderMessage: "No hay restricciones de horario configuradas",
  chatMessage: "No hay restricciones de horario configuradas para chat",
  orderSchedule: { dayOfWeek: "MONDAY", startTime: "08:00", endTime: "17:00" },
  chatSchedule: { dayOfWeek: "MONDAY", startTime: "09:00", endTime: "18:00" }
}
```

---

## Ejemplos de Uso

### Configurar Horarios de Lunes a Viernes

```typescript
const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

for (const day of days) {
  await fetch('/api/order-schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sellerId: 'seller-uuid',
      dayOfWeek: day,
      startTime: '08:00',
      endTime: '17:00'
    })
  })
}
```

### Verificar Disponibilidad Antes de Mostrar Formulario

```typescript
import { isSellerAvailableNow } from '@/lib/scheduleValidation'

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id)
  const availability = await isSellerAvailableNow(product.sellerId)
  
  return (
    <div>
      <h1>{product.name}</h1>
      
      {!availability.ordersAvailable && (
        <Alert>
          {availability.orderMessage}
          {availability.orderSchedule && (
            <p>Horario: {availability.orderSchedule.startTime} - {availability.orderSchedule.endTime}</p>
          )}
        </Alert>
      )}
      
      {availability.ordersAvailable && (
        <AddToCartButton productId={product.id} />
      )}
    </div>
  )
}
```

### Manejar Error de Horario en el Frontend

```typescript
try {
  const response = await fetch('/api/buyer/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      notes: 'Pedido urgente'
    })
  })
  
  const data = await response.json()
  
  if (!response.ok) {
    if (data.schedule && data.nextAvailable) {
      // Mostrar mensaje con horarios
      alert(`
        ${data.error}
        
        Horario actual: ${data.schedule.startTime} - ${data.schedule.endTime}
        Próximo horario: ${data.nextAvailable.dayOfWeek} a las ${data.nextAvailable.startTime}
      `)
    } else {
      alert(data.error)
    }
  } else {
    alert('Pedido creado exitosamente!')
  }
} catch (error) {
  console.error('Error:', error)
}
```

---

## Testing

### Script de Testing Manual

Crear archivo `scripts/test-schedules.ps1`:

```powershell
# Test Schedules API

$sellerId = "550e8400-e29b-41d4-a716-446655440000"
$baseUrl = "http://localhost:3000"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Order Schedules API" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Crear schedule válido
Write-Host "Test 1: Crear schedule para MONDAY..." -ForegroundColor Yellow
$body = @{
    sellerId = $sellerId
    dayOfWeek = "MONDAY"
    startTime = "08:00"
    endTime = "17:00"
    isActive = $true
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body

Write-Host "✓ Schedule creado: $($response.message)" -ForegroundColor Green
Write-Host ""

# Test 2: Intentar crear schedule con tiempo inválido
Write-Host "Test 2: Intentar crear schedule con startTime > endTime..." -ForegroundColor Yellow
$body = @{
    sellerId = $sellerId
    dayOfWeek = "TUESDAY"
    startTime = "18:00"
    endTime = "08:00"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
    
    Write-Host "✗ Debería haber fallado" -ForegroundColor Red
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    Write-Host "✓ Error esperado: $($errorResponse.error)" -ForegroundColor Green
}
Write-Host ""

# Test 3: Obtener schedules
Write-Host "Test 3: Obtener schedules del vendedor..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules?sellerId=$sellerId" `
    -Method GET

Write-Host "✓ Schedules obtenidos: $($response.schedules.Count) schedule(s)" -ForegroundColor Green
Write-Host ""

# Test 4: Soft delete
Write-Host "Test 4: Eliminar schedule (soft delete)..." -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/api/order-schedules?sellerId=$sellerId&dayOfWeek=MONDAY" `
    -Method DELETE

Write-Host "✓ Schedule eliminado: $($response.message)" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Todos los tests completados" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
```

### Tests Unitarios

```typescript
// __tests__/lib/scheduleValidation.test.ts
import { validateOrderTime, getNextAvailableOrderTime } from '@/lib/scheduleValidation'
import { prisma } from '@/lib/prisma'

describe('Schedule Validation', () => {
  const sellerId = 'test-seller-id'

  beforeAll(async () => {
    // Crear schedules de prueba
    await prisma.orderSchedule.create({
      data: {
        sellerId,
        dayOfWeek: 'MONDAY',
        startTime: '08:00',
        endTime: '17:00',
        isActive: true
      }
    })
  })

  afterAll(async () => {
    await prisma.orderSchedule.deleteMany({ where: { sellerId } })
    await prisma.$disconnect()
  })

  it('should allow orders within schedule', async () => {
    const monday10am = new Date('2024-01-15T10:00:00') // Monday 10:00
    const result = await validateOrderTime(sellerId, monday10am)
    
    expect(result.isValid).toBe(true)
    expect(result.schedule).toBeDefined()
    expect(result.schedule?.dayOfWeek).toBe('MONDAY')
  })

  it('should reject orders outside schedule', async () => {
    const monday6am = new Date('2024-01-15T06:00:00') // Monday 06:00
    const result = await validateOrderTime(sellerId, monday6am)
    
    expect(result.isValid).toBe(false)
    expect(result.message).toContain('08:00')
    expect(result.message).toContain('17:00')
  })

  it('should find next available time', async () => {
    const next = await getNextAvailableOrderTime(sellerId)
    
    expect(next).toBeDefined()
    expect(next?.dayOfWeek).toBe('MONDAY')
    expect(next?.startTime).toBe('08:00')
  })
})
```

---

## Mejores Prácticas

### 1. Configurar Schedules en Onboarding

Al dar de alta un nuevo vendedor, guiar la configuración de schedules:

```typescript
async function onboardSeller(sellerData) {
  // Crear seller
  const seller = await prisma.seller.create({ data: sellerData })
  
  // Configurar schedules por defecto (Lunes a Viernes 8:00-17:00)
  const businessDays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
  
  for (const day of businessDays) {
    await prisma.orderSchedule.create({
      data: {
        sellerId: seller.id,
        dayOfWeek: day,
        startTime: '08:00',
        endTime: '17:00'
      }
    })
  }
  
  return seller
}
```

### 2. Mostrar Horarios en UI

Siempre mostrar al cliente los horarios disponibles:

```tsx
<div className="business-hours">
  <h3>Horarios de Atención</h3>
  <ul>
    {schedules.map(schedule => (
      <li key={schedule.dayOfWeek}>
        <strong>{schedule.dayOfWeek}:</strong> {schedule.startTime} - {schedule.endTime}
      </li>
    ))}
  </ul>
</div>
```

### 3. Logs y Monitoreo

Monitorear rechazos por horario para optimizar schedules:

```typescript
// Los logs ya están implementados en:
// - lib/scheduleValidation.ts
// - app/api/buyer/orders/route.tsx
// - app/api/chat-messages/route.tsx

// Ejemplo de query para ver rechazos:
// grep "Order outside seller schedule" logs/app.log | wc -l
```

---

## Notas Técnicas

### Formato de Tiempo

- **Formato aceptado**: `HH:MM` (24 horas)
- **Ejemplos válidos**: `00:00`, `08:30`, `17:45`, `23:59`
- **Ejemplos inválidos**: `8:00` (debe ser `08:00`), `24:00`, `17:60`

### Zonas Horarias

⚠️ **IMPORTANTE**: El sistema actual usa la hora del servidor. Para producción con múltiples zonas horarias, considerar:

```typescript
// Opción 1: Guardar timezone del seller
model Seller {
  // ...
  timezone String @default("America/Mexico_City")
}

// Opción 2: Convertir a UTC
import { toZonedTime, format } from 'date-fns-tz'

const sellerTime = toZonedTime(new Date(), seller.timezone)
```

### Performance

- Los schedules se cachean en memoria durante las validaciones
- Para alta carga, considerar Redis para cachear schedules activos
- Los índices en `(sellerId, dayOfWeek)` optimizan las consultas

---

## Próximos Pasos

### Mejoras Futuras

1. **Excepciones de Horario**: Días feriados, vacaciones
2. **Horarios Especiales**: Black Friday, temporada alta
3. **Notificaciones**: Alertar al cliente cuando el vendedor vuelve a estar disponible
4. **Slots de Tiempo**: Reservar horarios específicos para pedidos grandes
5. **Analytics**: Dashboard con estadísticas de pedidos por horario

---

## Soporte

Para dudas o problemas con el sistema de schedules:
- Ver logs en `lib/logger.ts` (categoría `VALIDATION`)
- Revisar Prisma Studio: `npm run prisma:studio`
- Consultar tests: `__tests__/lib/scheduleValidation.test.ts`

---

**Última actualización**: 2024-01-15  
**Versión**: 1.0.0
