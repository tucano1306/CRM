# Sistema de Confirmación Automática de Órdenes

## 📋 Descripción

Sistema que transiciona automáticamente órdenes de `PENDING` → `PLACED` después de un período de tiempo (deadline) configurable.

## ⚙️ Componentes

### 1. **Campo `confirmationDeadline`** (Prisma Schema)

```prisma
model Order {
  confirmationDeadline DateTime? // Se establece al crear la orden
}
```

### 2. **Vercel Cron Job** (`vercel.json`)

```json
{
  "crons": [
    {
      "path": "/api/cron/confirm-orders",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Ejecuta cada 5 minutos** para revisar órdenes vencidas.

### 3. **Endpoint Cron** (`/api/cron/confirm-orders`)

- Busca órdenes con `status = PENDING` y `confirmationDeadline <= now`
- Solo confirma si `client.orderConfirmationEnabled = true`
- Actualiza a `status = PLACED` y registra `confirmedAt`
- Crea registro en `OrderStatusUpdate`
- Emite eventos: `ORDER_UPDATED`, `NOTIFICATION_CREATED`

### 4. **Endpoint Manual** (`/api/orders/[id]/confirm`)

Permite confirmar manualmente una orden antes del deadline.

## 🚀 Flujo de Funcionamiento

### 1. Creación de Orden

```typescript
// app/api/buyer/orders/route.tsx
const confirmationDeadline = new Date()
confirmationDeadline.setHours(confirmationDeadline.getHours() + 24) // 24 horas

await prisma.order.create({
  data: {
    status: 'PENDING',
    confirmationDeadline: client.orderConfirmationEnabled ? confirmationDeadline : null,
    // ...
  }
})
```

### 2. Cron Job Ejecuta (cada 5 minutos)

```
1. Busca órdenes: status=PENDING AND confirmationDeadline <= NOW
2. Filtra: solo clientes con orderConfirmationEnabled=true
3. Actualiza: status → PLACED, confirmedAt → NOW
4. Registra: OrderStatusUpdate (PENDING → PLACED)
5. Emite eventos: ORDER_UPDATED, NOTIFICATION_CREATED
```

### 3. Confirmación Manual (Opcional)

```typescript
// POST /api/orders/[id]/confirm
// Vendedor puede confirmar antes del deadline
```

## 🔒 Seguridad

### Protección del Cron Endpoint

```typescript
// Verificar CRON_SECRET en headers
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return 401 Unauthorized
}
```

### Variables de Entorno

```bash
# .env.local
CRON_SECRET=your-secret-key-here

# Generar secret:
# openssl rand -base64 32
```

### Configurar en Vercel

1. Ve a tu proyecto en Vercel
2. Settings → Environment Variables
3. Agrega: `CRON_SECRET` = (tu secret generado)

## 📊 Ejemplo de Uso

### Escenario 1: Auto-confirmación exitosa

```
Buyer crea orden → 2024-10-21 10:00 AM
  ├─ confirmationDeadline: 2024-10-22 10:00 AM (24h)
  ├─ status: PENDING
  └─ client.orderConfirmationEnabled: true

Cron ejecuta → 2024-10-22 10:05 AM
  ├─ Encuentra orden vencida
  ├─ Actualiza a PLACED
  ├─ confirmedAt: 2024-10-22 10:05 AM
  └─ Emite eventos (notificación al vendedor)
```

### Escenario 2: Confirmación manual

```
Buyer crea orden → 2024-10-21 10:00 AM
  ├─ confirmationDeadline: 2024-10-22 10:00 AM
  └─ status: PENDING

Vendedor confirma manualmente → 2024-10-21 14:30 PM
  ├─ POST /api/orders/[id]/confirm
  ├─ Actualiza a PLACED
  └─ confirmedAt: 2024-10-21 14:30 PM

Cron ejecuta → 2024-10-22 10:05 AM
  └─ No encuentra la orden (ya está PLACED)
```

### Escenario 3: Cliente sin auto-confirmación

```
Buyer crea orden → 2024-10-21 10:00 AM
  ├─ confirmationDeadline: null
  ├─ status: PENDING
  └─ client.orderConfirmationEnabled: false

Cron ejecuta → Cualquier momento
  └─ Ignora la orden (no tiene deadline)

Requiere confirmación manual del vendedor
```

## 🧪 Testing Local

### 1. Crear orden de prueba

```bash
# Crear orden (se establece deadline automáticamente)
POST /api/buyer/orders
```

### 2. Simular deadline vencido (Base de datos)

```sql
-- Establecer deadline en el pasado para testing
UPDATE orders 
SET "confirmationDeadline" = NOW() - INTERVAL '1 hour'
WHERE "orderNumber" = 'ORD-123456';
```

### 3. Ejecutar cron manualmente

```bash
# Llamar al endpoint directamente
GET http://localhost:3000/api/cron/confirm-orders
Authorization: Bearer your-cron-secret
```

### 4. Verificar resultado

```sql
-- Verificar que cambió a PLACED
SELECT "orderNumber", status, "confirmedAt", "confirmationDeadline"
FROM orders 
WHERE "orderNumber" = 'ORD-123456';

-- Ver registro de cambio
SELECT * FROM order_status_updates 
WHERE "orderId" = (SELECT id FROM orders WHERE "orderNumber" = 'ORD-123456')
ORDER BY "createdAt" DESC;
```

## 📈 Monitoreo

### Logs del Cron Job

```
🕐 [CRON] Iniciando auto-confirmación de órdenes...
🕐 [CRON] Fecha actual: 2024-10-21T10:05:00.000Z
🕐 [CRON] Órdenes encontradas: 3
✅ [CRON] Orden ORD-123 confirmada automáticamente
✅ [CRON] Orden ORD-456 confirmada automáticamente
⏭️ [CRON] Orden ORD-789 - Cliente sin auto-confirmación
🎉 [CRON] Auto-confirmación completada: 2 órdenes
```

### Respuesta del Endpoint

```json
{
  "success": true,
  "message": "2 órdenes confirmadas automáticamente",
  "confirmedCount": 2,
  "orders": [
    {
      "orderNumber": "ORD-123",
      "totalAmount": "150.00",
      "confirmedAt": "2024-10-21T10:05:00.000Z"
    },
    {
      "orderNumber": "ORD-456",
      "totalAmount": "200.00",
      "confirmedAt": "2024-10-21T10:05:00.000Z"
    }
  ],
  "timestamp": "2024-10-21T10:05:00.000Z"
}
```

## 🔧 Configuración Personalizada

### Cambiar período de confirmación (default: 24h)

```typescript
// app/api/buyer/orders/route.tsx
const confirmationDeadline = new Date()

// Cambiar a 48 horas:
confirmationDeadline.setHours(confirmationDeadline.getHours() + 48)

// O usar configuración del cliente:
const hoursToConfirm = client.confirmationHours || 24
confirmationDeadline.setHours(confirmationDeadline.getHours() + hoursToConfirm)
```

### Cambiar frecuencia del Cron

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/confirm-orders",
      "schedule": "0 * * * *"  // Cada hora
      // "schedule": "*/15 * * * *"  // Cada 15 minutos
      // "schedule": "0 0 * * *"  // Diario a medianoche
    }
  ]
}
```

## 🚨 Troubleshooting

### Cron no ejecuta en Vercel

1. Verificar `vercel.json` está en la raíz del proyecto
2. Verificar deployment en Vercel (Pro plan requerido para Cron)
3. Verificar logs en Vercel Dashboard

### Órdenes no se confirman

1. Verificar `client.orderConfirmationEnabled = true`
2. Verificar `confirmationDeadline` está en el pasado
3. Verificar orden está en estado `PENDING`
4. Revisar logs del cron job

### Error 401 en Cron

1. Verificar `CRON_SECRET` está configurado en Vercel
2. Verificar header `Authorization: Bearer ${CRON_SECRET}`

## 📚 Recursos

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Cron Expression Guide](https://crontab.guru/)
- Prisma Schema: `prisma/schema.prisma`
- Event System: `lib/events/`
