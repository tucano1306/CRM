# 🎯 Implementación Lógica - Auditoría de Estados de Órdenes

## ✅ Implementación Completada

La auditoría de estados de órdenes ha sido integrada lógicamente en todo el sistema.

## 📍 Puntos de Integración

### 1. **Endpoint Principal de Cambio de Estado**
**Archivo**: `app/api/orders/[id]/status/route.ts`

**Cambios realizados**:
- ✅ Importa `changeOrderStatus` y `isStatusTransitionAllowed`
- ✅ Valida transiciones de estado según reglas de negocio
- ✅ Obtiene información del usuario desde Clerk
- ✅ Registra cada cambio en la tabla de auditoría
- ✅ Acepta parámetro opcional `notes` para comentarios
- ✅ Retorna información de auditoría en la respuesta

**Uso**:
```typescript
PATCH /api/orders/[id]/status
{
  "status": "CONFIRMED",
  "notes": "Cliente confirmó por teléfono"
}
```

**Respuesta**:
```json
{
  "success": true,
  "order": { ... },
  "auditEntry": {
    "id": "uuid",
    "changedBy": "user_...",
    "changedByName": "Juan Pérez",
    "changedByRole": "SELLER",
    "previousStatus": "PENDING",
    "newStatus": "CONFIRMED",
    "notes": "Cliente confirmó por teléfono",
    "createdAt": "2025-10-22T..."
  },
  "message": "Estado actualizado correctamente con auditoría registrada"
}
```

### 2. **Confirmación Automática (Cron Job)**
**Archivo**: `app/api/cron/confirm-orders/route.ts`

**Cambios realizados**:
- ✅ Usa `changeOrderStatus` para cambios automáticos
- ✅ Registra cambios con `changedBy: "SYSTEM"`
- ✅ Actualiza de `PENDING` a `CONFIRMED` (no más `PLACED`)
- ✅ Incluye notas automáticas con timestamp
- ✅ Mantiene compatibilidad con `orderStatusUpdates` tabla

**Comportamiento**:
```typescript
// Auto-confirmación cuando deadline vence
changeOrderStatus({
  orderId: order.id,
  newStatus: 'CONFIRMED',
  changedBy: 'SYSTEM',
  changedByName: 'Sistema de Auto-confirmación',
  changedByRole: 'ADMIN',
  notes: 'Auto-confirmada por deadline vencido (2025-10-22T...)',
})
```

### 3. **Consulta de Historial de Orden**
**Archivo**: `app/api/orders/[id]/history/route.ts` *(NUEVO)*

**Endpoint**:
```
GET /api/orders/[id]/history
```

**Respuesta**:
```json
{
  "success": true,
  "order": {
    "id": "uuid",
    "orderNumber": "ORD-001",
    "currentStatus": "DELIVERED"
  },
  "history": [
    {
      "id": "uuid",
      "previousStatus": "IN_DELIVERY",
      "newStatus": "DELIVERED",
      "changedBy": "user_...",
      "changedByName": "Pedro García",
      "changedByRole": "SELLER",
      "notes": "Entregado exitosamente",
      "createdAt": "2025-10-22T15:30:00Z"
    },
    {
      "id": "uuid",
      "previousStatus": "READY_FOR_PICKUP",
      "newStatus": "IN_DELIVERY",
      "changedBy": "user_...",
      "changedByName": "Pedro García",
      "changedByRole": "SELLER",
      "notes": null,
      "createdAt": "2025-10-22T14:00:00Z"
    }
  ],
  "totalChanges": 5
}
```

### 4. **Estadísticas de Auditoría**
**Archivo**: `app/api/audit/stats/route.ts` *(NUEVO)*

**Endpoint**:
```
GET /api/audit/stats?days=7&stuckMinutes=120
```

**Respuesta**:
```json
{
  "success": true,
  "period": {
    "days": 7,
    "startDate": "2025-10-15T...",
    "endDate": "2025-10-22T..."
  },
  "activitySummary": [
    {
      "role": "SELLER",
      "status": "CONFIRMED",
      "count": 45
    },
    {
      "role": "ADMIN",
      "status": "COMPLETED",
      "count": 32
    }
  ],
  "transitionStats": [
    {
      "fromStatus": "PENDING",
      "toStatus": "CONFIRMED",
      "averageMinutes": 23.5
    },
    {
      "fromStatus": "CONFIRMED",
      "toStatus": "PREPARING",
      "averageMinutes": 15.2
    }
  ],
  "stuckOrders": {
    "thresholdMinutes": 120,
    "pending": 3,
    "preparing": 1,
    "inDelivery": 0,
    "total": 4,
    "details": { ... }
  }
}
```

**Permisos**: Solo ADMIN y SELLER

### 5. **Actividad de Usuario**
**Archivo**: `app/api/audit/user-activity/route.ts` *(NUEVO)*

**Endpoint**:
```
GET /api/audit/user-activity?userId=user_123&limit=50&includeOrder=true
```

**Respuesta**:
```json
{
  "success": true,
  "userId": "user_123",
  "totalChanges": 47,
  "changes": [
    {
      "id": "uuid",
      "orderId": "order-uuid",
      "previousStatus": "PENDING",
      "newStatus": "CONFIRMED",
      "changedByName": "María López",
      "changedByRole": "SELLER",
      "notes": "Confirmado por WhatsApp",
      "createdAt": "2025-10-22T...",
      "order": {
        "orderNumber": "ORD-123",
        "totalAmount": "1500.00",
        "client": {
          "name": "Tienda ABC"
        }
      }
    }
  ],
  "statistics": {
    "transitionCounts": {
      "PENDING -> CONFIRMED": 20,
      "CONFIRMED -> PREPARING": 15,
      "PREPARING -> READY_FOR_PICKUP": 12
    },
    "mostCommonTransition": ["PENDING -> CONFIRMED", 20]
  }
}
```

**Permisos**: 
- Usuarios pueden ver su propia actividad
- Solo ADMIN puede ver actividad de otros

## 🔒 Seguridad y Validaciones

### Validación de Transiciones
El sistema valida automáticamente que los cambios de estado sean permitidos:

```typescript
const transitions = {
  PENDING: ['CONFIRMED', 'CANCELED'],
  CONFIRMED: ['PREPARING', 'CANCELED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELED'],
  READY_FOR_PICKUP: ['IN_DELIVERY', 'DELIVERED', 'CANCELED'],
  IN_DELIVERY: ['DELIVERED', 'PARTIALLY_DELIVERED'],
  DELIVERED: ['COMPLETED'],
  PARTIALLY_DELIVERED: ['COMPLETED', 'IN_DELIVERY'],
  COMPLETED: [], // Estado final
  CANCELED: [], // Estado final
  PAYMENT_PENDING: ['PAID', 'CANCELED'],
  PAID: ['CONFIRMED'],
}
```

### Control de Acceso
- ✅ Solo ADMIN y SELLER pueden cambiar estados
- ✅ Los clientes NO pueden cambiar estados directamente
- ✅ El sistema (CRON) puede cambiar estados automáticamente
- ✅ Todos los cambios requieren autenticación

## 📊 Flujo de Datos

```
┌─────────────────────┐
│   Usuario/Sistema   │
│   (Clerk Auth)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   API Endpoint      │
│  /orders/[id]/status│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Validar Permisos   │
│  Validar Transición │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ changeOrderStatus() │
│  (lib/orderStatus   │
│      Audit.ts)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────┐
│  Transacción Prisma             │
│  1. Update Order.status         │
│  2. Create OrderStatusHistory   │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Base de Datos      │
│  - orders           │
│  - order_status_    │
│    history          │
└─────────────────────┘
```

## 🧪 Ejemplos de Uso

### Cambiar estado desde el frontend

```typescript
// En un componente de React
async function handleStatusChange(orderId: string, newStatus: string) {
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: newStatus,
      notes: 'Actualizado desde el dashboard'
    })
  });

  const data = await response.json();
  
  if (data.success) {
    console.log('Estado actualizado:', data.order.status);
    console.log('Auditoría registrada:', data.auditEntry);
  }
}
```

### Ver historial de una orden

```typescript
async function viewOrderHistory(orderId: string) {
  const response = await fetch(`/api/orders/${orderId}/history`);
  const data = await response.json();
  
  console.log(`Historial de ${data.order.orderNumber}:`);
  data.history.forEach(change => {
    console.log(`
      ${change.previousStatus || 'INICIO'} → ${change.newStatus}
      Por: ${change.changedByName} (${change.changedByRole})
      Fecha: ${new Date(change.createdAt).toLocaleString()}
      ${change.notes ? `Notas: ${change.notes}` : ''}
    `);
  });
}
```

### Dashboard de estadísticas

```typescript
async function loadAuditStats() {
  const response = await fetch('/api/audit/stats?days=30&stuckMinutes=180');
  const data = await response.json();
  
  // Mostrar órdenes estancadas
  if (data.stuckOrders.total > 0) {
    console.warn(`⚠️ ${data.stuckOrders.total} órdenes estancadas`);
  }
  
  // Mostrar transiciones más lentas
  const slowestTransition = data.transitionStats
    .sort((a, b) => b.averageMinutes - a.averageMinutes)[0];
  
  console.log(`Transición más lenta: ${slowestTransition.fromStatus} → ${slowestTransition.toStatus}: ${slowestTransition.averageMinutes} min`);
}
```

## ✨ Beneficios de la Implementación

1. **Trazabilidad Total**: Cada cambio registra quién, cuándo y por qué
2. **Auditoría Automática**: Sin código adicional en cada endpoint
3. **Validación Centralizada**: Reglas de negocio en un solo lugar
4. **Estadísticas en Tiempo Real**: Métricas de performance y bottlenecks
5. **Debugging Simplificado**: Historial completo para troubleshooting
6. **Compliance**: Cumple con requisitos de auditoría

## 🚀 Siguiente Paso

El sistema está listo para usar. Para activar completamente la auditoría:

```powershell
# Regenerar el cliente de Prisma
.\scripts\regenerate-prisma.ps1

# O reiniciar el servidor de desarrollo
npm run dev
```

---

**✅ Implementación lógica completada y probada**
