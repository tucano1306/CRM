# 🔔 Sistema de Notificaciones para Vendedores

## Descripción

Sistema completo de notificaciones en tiempo real que alerta al vendedor cuando:
- Un comprador crea una **nueva orden**
- Se **modifican** órdenes existentes
- Se **cancelan** órdenes
- Hay nuevos **mensajes de chat**
- Se solicitan **devoluciones**
- Hay **alertas de stock bajo**

## 🎯 Características

✅ **Notificaciones en tiempo real** con polling cada 30 segundos
✅ **Badge con contador** de notificaciones no leídas
✅ **Panel desplegable** con lista de notificaciones
✅ **Marcar como leída** individual o todas
✅ **Eliminar** notificaciones
✅ **Iconos** según tipo de notificación
✅ **Timestamps** relativos (hace 5 min, hace 1 hora, etc.)
✅ **Link directo** a la orden relacionada
✅ **No bloquea** la creación de órdenes si falla

## 📊 Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    FLUJO DE NOTIFICACIONES               │
└─────────────────────────────────────────────────────────┘

1. Comprador crea orden
   └─> POST /api/buyer/orders
       └─> Crea orden en DB
           └─> notifyNewOrder(sellerId, ...)
               └─> Inserta en tabla notifications
                   └─> Vendedor ve campana con badge rojo

2. Vendedor abre panel
   └─> GET /api/notifications
       └─> Retorna notificaciones + contador no leídas

3. Vendedor marca como leída
   └─> PATCH /api/notifications/[id]
       └─> Actualiza isRead = true

4. Auto-refresh cada 30 seg
   └─> Polling GET /api/notifications
       └─> Actualiza badge automáticamente
```

## 🗄️ Modelo de Datos

```prisma
model Notification {
  id          String           @id @default(uuid())
  sellerId    String
  type        NotificationType
  title       String
  message     String
  isRead      Boolean          @default(false)
  orderId     String?
  clientId    String?
  metadata    Json?            // Datos flexibles
  createdAt   DateTime         @default(now())
  readAt      DateTime?

  seller      Seller           @relation(...)

  @@index([sellerId])
  @@index([isRead])
  @@index([createdAt])
  @@map("notifications")
}

enum NotificationType {
  NEW_ORDER
  ORDER_MODIFIED
  ORDER_CANCELLED
  PAYMENT_RECEIVED
  CHAT_MESSAGE
  RETURN_REQUEST
  QUOTE_REQUEST
  LOW_STOCK_ALERT
}
```

## 🔧 Instalación y Configuración

### 1. Migración de Base de Datos

```bash
# Generar y aplicar migración
npx prisma migrate dev --name add_notifications_system

# Generar cliente de Prisma
npx prisma generate
```

### 2. Agregar Componente al Layout

Edita `app/layout.tsx` o `components/shared/MainLayout.tsx`:

```tsx
import NotificationBell from '@/components/shared/NotificationBell'

// Dentro del navbar/header:
<div className="flex items-center gap-4">
  <NotificationBell />
  {/* Otros componentes del nav */}
</div>
```

## 📡 API Endpoints

### GET /api/notifications

Obtener notificaciones del vendedor actual.

**Query Parameters:**
- `unreadOnly`: `true` | `false` (solo no leídas)
- `limit`: `number` (default: 20)

**Response:**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "uuid",
      "sellerId": "uuid",
      "type": "NEW_ORDER",
      "title": "🛒 Nueva Orden Recibida",
      "message": "Juan Pérez ha creado una nueva orden #ORD-123 por $150.50",
      "isRead": false,
      "orderId": "uuid",
      "clientId": "uuid",
      "metadata": {
        "orderNumber": "ORD-123",
        "clientName": "Juan Pérez",
        "totalAmount": 150.50
      },
      "createdAt": "2025-10-23T10:30:00Z",
      "readAt": null
    }
  ],
  "unreadCount": 5
}
```

### PATCH /api/notifications/[id]

Marcar una notificación como leída.

**Response:**
```json
{
  "success": true,
  "notification": { /* notificación actualizada */ }
}
```

### POST /api/notifications/mark-all-read

Marcar todas las notificaciones como leídas.

**Response:**
```json
{
  "success": true,
  "count": 5,
  "message": "5 notificaciones marcadas como leídas"
}
```

### DELETE /api/notifications/[id]

Eliminar una notificación.

**Response:**
```json
{
  "success": true,
  "message": "Notificación eliminada"
}
```

## 🛠️ Uso en el Código

### Crear Notificación al Crear Orden

```typescript
import { notifyNewOrder } from '@/lib/notifications'

// En POST /api/buyer/orders después de crear la orden:
try {
  await notifyNewOrder(
    order.sellerId,
    order.id,
    order.orderNumber,
    order.client.name,
    Number(order.totalAmount)
  )
} catch (error) {
  // No bloquear si falla
  console.error('Error sending notification:', error)
}
```

### Crear Notificación al Modificar Orden

```typescript
import { notifyOrderModified } from '@/lib/notifications'

await notifyOrderModified(
  sellerId,
  orderId,
  orderNumber,
  clientName,
  'Usuario Admin',
  ['Cantidad de Pizza: 2 → 3', 'Total: $20 → $30']
)
```

### Crear Notificación al Cancelar Orden

```typescript
import { notifyOrderCancelled } from '@/lib/notifications'

await notifyOrderCancelled(
  sellerId,
  orderId,
  orderNumber,
  clientName,
  'Cliente cambió de opinión'
)
```

### Crear Notificación de Chat

```typescript
import { notifyChatMessage } from '@/lib/notifications'

await notifyChatMessage(
  sellerId,
  clientName,
  'Hola, ¿tienen disponibilidad para mañana?'
)
```

### Obtener Contador de No Leídas

```typescript
import { getUnreadCount } from '@/lib/notifications'

const count = await getUnreadCount(sellerId)
console.log(`Tienes ${count} notificaciones sin leer`)
```

## 🎨 Componente NotificationBell

### Props

Ninguna. El componente obtiene automáticamente el sellerId del usuario autenticado.

### Características UI

- **Badge rojo** con contador (máx 9+)
- **Panel desplegable** de 400px width
- **Scroll** para muchas notificaciones
- **Iconos emoji** según tipo:
  - 🛒 Nueva orden
  - 📝 Orden modificada
  - ❌ Orden cancelada
  - 💬 Mensaje de chat
  - ↩️ Devolución
  - 📋 Cotización
  - ⚠️ Stock bajo

- **Highlight azul** para no leídas
- **Punto azul** indicador de no leída
- **Botón** marcar todas como leídas
- **Link** "Ver orden →" si tiene orderId
- **Timestamps** relativos (hace 5 min, hace 2 horas)

### Polling Automático

El componente hace polling cada 30 segundos para actualizar las notificaciones automáticamente.

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchNotifications()
  }, 30000) // 30 segundos

  return () => clearInterval(interval)
}, [])
```

## 🧪 Testing

### 1. Crear una orden como comprador

```bash
# Login como comprador en /buyer/dashboard
# Agregar productos al carrito
# Crear orden
# → El vendedor debe ver notificación inmediatamente
```

### 2. Verificar badge

```bash
# Debe aparecer badge rojo con número (ej: "1")
# Click en campana debe abrir panel
# La notificación debe tener fondo azul (no leída)
```

### 3. Marcar como leída

```bash
# Click en "Marcar leída"
# → Fondo azul desaparece
# → Badge decrementa en 1
# → readAt se actualiza en DB
```

### 4. Auto-refresh

```bash
# Dejar panel abierto
# Crear otra orden desde otra ventana
# → Después de máx 30 seg debe aparecer nueva notificación
```

### 5. Marcar todas como leídas

```bash
# Tener 3+ notificaciones no leídas
# Click en "Marcar todas"
# → Badge desaparece
# → Todas pierden fondo azul
```

### 6. Eliminar notificación

```bash
# Click en "Eliminar"
# → Notificación desaparece de la lista
# → Si era no leída, badge decrementa
```

## 📈 Mejoras Futuras

### WebSockets para Tiempo Real

Reemplazar polling con WebSockets para notificaciones instantáneas:

```typescript
// lib/websocket.ts
export const notificationSocket = new WebSocket('ws://localhost:3000/notifications')

notificationSocket.onmessage = (event) => {
  const notification = JSON.parse(event.data)
  // Agregar a lista local
  // Incrementar badge
  // Mostrar toast
}
```

### Notificaciones Push

Integrar con Service Worker para notificaciones del navegador:

```typescript
if ('Notification' in window && Notification.permission === 'granted') {
  new Notification('🛒 Nueva orden recibida', {
    body: 'Juan Pérez - Orden #ORD-123 por $150.50',
    icon: '/logo.png',
    badge: '/badge.png'
  })
}
```

### Email Notifications

Enviar email al vendedor cuando recibe orden:

```typescript
import { sendEmail } from '@/lib/email'

await sendEmail({
  to: seller.email,
  subject: '🛒 Nueva Orden Recibida',
  html: `
    <h1>Nueva orden de ${clientName}</h1>
    <p>Orden #${orderNumber}</p>
    <p>Total: $${totalAmount}</p>
    <a href="https://crm.com/orders/${orderId}">Ver orden</a>
  `
})
```

### SMS Notifications (Twilio)

```typescript
import twilio from 'twilio'

const client = twilio(accountSid, authToken)

await client.messages.create({
  body: `Nueva orden #${orderNumber} de ${clientName} por $${totalAmount}`,
  to: seller.phone,
  from: '+1234567890'
})
```

### Agrupación de Notificaciones

Si hay muchas órdenes seguidas, agruparlas:

```typescript
// En vez de:
// - Nueva orden #001
// - Nueva orden #002
// - Nueva orden #003

// Mostrar:
// 🛒 3 nuevas órdenes recibidas
//    #001, #002, #003
```

### Configuración por Usuario

Permitir al vendedor configurar qué notificaciones recibir:

```prisma
model SellerNotificationSettings {
  id                String  @id
  sellerId          String
  enableNewOrder    Boolean @default(true)
  enableModified    Boolean @default(true)
  enableCancelled   Boolean @default(true)
  enableChat        Boolean @default(true)
  enableEmail       Boolean @default(false)
  enableSMS         Boolean @default(false)
}
```

## 🐛 Troubleshooting

### No aparece el badge

1. Verificar que el usuario es vendedor (no comprador)
2. Verificar en DB que existen notificaciones: `SELECT * FROM notifications WHERE seller_id = 'xxx' AND is_read = false`
3. Verificar en Network tab que GET /api/notifications responde con unreadCount > 0

### Polling no funciona

1. Abrir DevTools → Console
2. Buscar errores de red cada 30 segundos
3. Verificar que el token de auth no haya expirado

### Notificaciones no se crean

1. Verificar que `npx prisma generate` se ejecutó después de la migración
2. Verificar que el import de `notifyNewOrder` es correcto
3. Ver logs en terminal: debe aparecer "✅ Notificación creada: ..."

### Error "notification does not exist"

Ejecutar:
```bash
npx prisma generate
```

El cliente de Prisma no está actualizado con el nuevo modelo.

## 📚 Referencias

- Prisma Docs: https://www.prisma.io/docs
- Lucide Icons: https://lucide.dev
- Next.js API Routes: https://nextjs.org/docs/api-routes/introduction

---

**Autor**: Sistema CRM Food Orders  
**Fecha**: Octubre 23, 2025  
**Versión**: 1.0.0
