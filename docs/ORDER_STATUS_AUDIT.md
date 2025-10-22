# Auditoría de Estados de Órdenes

## Descripción

Se ha implementado una tabla de auditoría (`order_status_history`) para registrar todos los cambios de estado de las órdenes en el sistema. Esta funcionalidad permite:

- **Trazabilidad completa**: Saber quién, cuándo y por qué se cambió el estado de una orden
- **Auditoría**: Cumplir con requisitos de auditoría y compliance
- **Debugging**: Facilitar la identificación de problemas en el flujo de órdenes
- **Reportes históricos**: Generar reportes sobre tiempos de procesamiento y patrones

## Estructura de la Tabla

```prisma
model OrderStatusHistory {
  id             String       @id @default(uuid())
  orderId        String
  previousStatus OrderStatus?  // NULL si es el primer estado
  newStatus      OrderStatus
  changedBy      String       // Clerk User ID
  changedByName  String       // Nombre del usuario
  changedByRole  String       // ADMIN, SELLER, CLIENT
  notes          String?      // Notas opcionales
  createdAt      DateTime     @default(now())
  
  order          Order        @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([orderId])
  @@index([changedBy])
  @@index([createdAt])
  @@index([newStatus])
  @@map("order_status_history")
}
```

## Uso en el Código

### 1. Registrar un cambio de estado

```typescript
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

async function changeOrderStatus(
  orderId: string, 
  newStatus: OrderStatus, 
  notes?: string
) {
  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    throw new Error('No autenticado');
  }

  // Obtener el estado actual
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { status: true }
  });

  if (!order) {
    throw new Error('Orden no encontrada');
  }

  // Actualizar el estado y crear el registro de auditoría
  await prisma.$transaction([
    // Actualizar la orden
    prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus }
    }),
    
    // Crear registro de auditoría
    prisma.orderStatusHistory.create({
      data: {
        orderId,
        previousStatus: order.status,
        newStatus,
        changedBy: userId,
        changedByName: sessionClaims?.fullName || sessionClaims?.email || 'Unknown',
        changedByRole: sessionClaims?.role || 'CLIENT',
        notes
      }
    })
  ]);

  return { success: true };
}
```

### 2. Consultar el historial de una orden

```typescript
async function getOrderHistory(orderId: string) {
  const history = await prisma.orderStatusHistory.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' }
  });

  return history;
}
```

### 3. Consultar cambios por usuario

```typescript
async function getUserOrderChanges(userId: string, limit = 50) {
  const changes = await prisma.orderStatusHistory.findMany({
    where: { changedBy: userId },
    include: {
      order: {
        select: {
          orderNumber: true,
          client: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return changes;
}
```

### 4. Generar reporte de tiempos de procesamiento

```typescript
async function getAverageProcessingTimes() {
  // Consultar cambios de PENDING a CONFIRMED
  const confirmations = await prisma.$queryRaw`
    SELECT 
      AVG(EXTRACT(EPOCH FROM (h2."createdAt" - h1."createdAt"))) as avg_seconds
    FROM order_status_history h1
    JOIN order_status_history h2 ON h1."orderId" = h2."orderId"
    WHERE h1."newStatus" = 'PENDING'
      AND h2."newStatus" = 'CONFIRMED'
      AND h2."createdAt" > h1."createdAt"
  `;

  return confirmations;
}
```

## Ejemplo de API Route

```typescript
// app/api/orders/[orderId]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { userId, sessionClaims } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { status, notes } = await request.json();

    // Validar que el usuario tiene permisos para cambiar el estado
    const role = sessionClaims?.role;
    if (role !== 'ADMIN' && role !== 'SELLER') {
      return NextResponse.json(
        { error: 'No autorizado' }, 
        { status: 403 }
      );
    }

    // Obtener estado actual
    const order = await prisma.order.findUnique({
      where: { id: params.orderId },
      select: { status: true }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Orden no encontrada' }, 
        { status: 404 }
      );
    }

    // Actualizar con transacción
    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id: params.orderId },
        data: { status }
      }),
      prisma.orderStatusHistory.create({
        data: {
          orderId: params.orderId,
          previousStatus: order.status,
          newStatus: status,
          changedBy: userId,
          changedByName: sessionClaims?.fullName || sessionClaims?.email || 'Unknown',
          changedByRole: role,
          notes
        }
      })
    ]);

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el estado' }, 
      { status: 500 }
    );
  }
}
```

## Consultas SQL Útiles

### Ver historial completo de una orden

```sql
SELECT 
  h.*,
  o."orderNumber"
FROM order_status_history h
JOIN orders o ON h."orderId" = o.id
WHERE h."orderId" = 'ORDER_ID_HERE'
ORDER BY h."createdAt" DESC;
```

### Órdenes que tardaron más en confirmarse

```sql
SELECT 
  o."orderNumber",
  h1."createdAt" as created,
  h2."createdAt" as confirmed,
  EXTRACT(EPOCH FROM (h2."createdAt" - h1."createdAt"))/60 as minutes_to_confirm
FROM orders o
JOIN order_status_history h1 ON o.id = h1."orderId" 
  AND h1."newStatus" = 'PENDING'
JOIN order_status_history h2 ON o.id = h2."orderId" 
  AND h2."newStatus" = 'CONFIRMED'
WHERE h2."createdAt" > h1."createdAt"
ORDER BY minutes_to_confirm DESC
LIMIT 10;
```

### Actividad de cambios por usuario

```sql
SELECT 
  "changedBy",
  "changedByName",
  COUNT(*) as total_changes,
  COUNT(DISTINCT "orderId") as orders_affected
FROM order_status_history
WHERE "createdAt" >= NOW() - INTERVAL '7 days'
GROUP BY "changedBy", "changedByName"
ORDER BY total_changes DESC;
```

## Migración Aplicada

- **Fecha**: 2025-10-22
- **Archivo**: `20251022191900_add_order_status_history_audit/migration.sql`
- **Cambios**:
  1. Se eliminó el valor `PLACED` del enum `OrderStatus` que no estaba en uso
  2. Se creó la tabla `order_status_history` con todos sus índices
  3. Se agregó foreign key con `CASCADE` para mantener integridad referencial

## Notas Importantes

1. **Siempre usar transacciones**: Cuando se actualice el estado de una orden, SIEMPRE crear el registro de auditoría en la misma transacción
2. **No eliminar registros**: Los registros de auditoría NO deben eliminarse nunca, son para trazabilidad histórica
3. **Indexación**: La tabla está optimizada con índices en las columnas más consultadas
4. **Cascada**: Si se elimina una orden, su historial se elimina automáticamente (`ON DELETE CASCADE`)

## Testing

Para probar la funcionalidad:

```typescript
// Crear una orden de prueba y cambiar su estado varias veces
const testOrder = await prisma.order.create({ /* ... */ });

await changeOrderStatus(testOrder.id, 'CONFIRMED', 'Confirmado por el vendedor');
await changeOrderStatus(testOrder.id, 'PREPARING', 'Empezando preparación');
await changeOrderStatus(testOrder.id, 'READY_FOR_PICKUP', 'Listo para entregar');

const history = await getOrderHistory(testOrder.id);
console.log(`Se registraron ${history.length} cambios de estado`);
```

## Próximos Pasos

Considerar implementar:

1. **Webhooks**: Notificar cambios de estado a sistemas externos
2. **Dashboard de auditoría**: UI para visualizar el historial
3. **Alertas**: Notificar cuando una orden permanece mucho tiempo en un estado
4. **Reportes automatizados**: Generar reportes de rendimiento basados en el historial
