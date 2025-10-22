# OrderStatusHistory Component - Guía de Uso

## Descripción
Componente React que muestra el historial completo de cambios de estado de una orden con información de auditoría visual y detallada.

## Características

✅ **Timeline Visual** - Línea de tiempo con iconos de estado
✅ **Información Completa** - Muestra quién hizo el cambio, cuándo, y notas
✅ **Tiempo Relativo** - Formato "Hace X minutos/horas/días"
✅ **Badges de Rol** - Identificación visual de ADMIN, SELLER, CLIENT, SYSTEM
✅ **Estados Loading/Error** - Manejo completo de estados
✅ **Responsive** - Adaptado a móviles y escritorio

## Uso Básico

```tsx
import OrderStatusHistory from '@/components/orders/OrderStatusHistory'

// En tu página de detalle de orden
export default function OrderDetailPage({ orderId }: { orderId: string }) {
  return (
    <div className="space-y-6">
      <h1>Orden #{orderId}</h1>
      
      {/* Historial de cambios */}
      <OrderStatusHistory orderId={orderId} />
    </div>
  )
}
```

## Ejemplo con OrderStatusChanger

```tsx
import OrderStatusChanger from '@/components/orders/OrderStatusChanger'
import OrderStatusHistory from '@/components/orders/OrderStatusHistory'

export default function OrderManagement({ order }: { order: Order }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel izquierdo: Detalles y cambio de estado */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Orden #{order.orderNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Estado Actual
                </label>
                <OrderStatusChanger 
                  orderId={order.id}
                  currentStatus={order.status}
                />
              </div>
              {/* Más detalles... */}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Panel derecho: Historial */}
      <div>
        <OrderStatusHistory orderId={order.id} />
      </div>
    </div>
  )
}
```

## Props

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `orderId` | `string` | ✅ | ID de la orden para mostrar el historial |

## Estados del Componente

### Loading
Muestra un spinner mientras carga los datos:
```tsx
<Loader2 className="h-8 w-8 animate-spin" />
```

### Error
Muestra mensaje de error si falla la carga:
```tsx
<AlertCircle className="h-12 w-12 text-red-500" />
<p>Error al cargar el historial</p>
```

### Sin Datos
Muestra mensaje cuando no hay cambios registrados:
```tsx
<FileText className="h-12 w-12 text-gray-400" />
<p>No hay cambios de estado registrados</p>
```

### Con Datos
Muestra timeline con todos los cambios de estado

## Información Mostrada

Cada entrada del historial incluye:

1. **Icono de Estado** - Visual con color según el estado
2. **Transición** - "Estado Anterior → Estado Nuevo"
3. **Usuario** - Nombre completo y badge de rol
4. **Timestamp** - Tiempo relativo + fecha exacta
5. **Notas** (opcional) - Contexto adicional del cambio

## Formato de Tiempo

El componente muestra tiempo en dos formatos:

**Relativo:**
- "Hace un momento" (< 1 minuto)
- "Hace 5 minutos" (< 1 hora)
- "Hace 2 horas" (< 24 horas)
- "Hace 3 días" (< 7 días)
- Fecha completa (≥ 7 días)

**Absoluto:**
- "22 oct 2025, 14:30"

## Badges de Rol

| Rol | Color | Label |
|-----|-------|-------|
| `ADMIN` | Púrpura | Admin |
| `SELLER` | Azul | Vendedor |
| `CLIENT` | Verde | Cliente |
| `SYSTEM` | Gris | Sistema |

## Iconos por Estado

| Estado | Icono | Color |
|--------|-------|-------|
| PENDING | Clock | Amarillo |
| CONFIRMED | CheckCircle | Azul |
| PREPARING | Box | Índigo |
| READY_FOR_PICKUP | Package | Cian |
| IN_DELIVERY | Truck | Púrpura |
| DELIVERED | CheckCircle | Verde azulado |
| PARTIALLY_DELIVERED | AlertCircle | Naranja |
| COMPLETED | CheckCircle | Verde |
| CANCELED | XCircle | Rojo |
| PAYMENT_PENDING | DollarSign | Ámbar |
| PAID | DollarSign | Esmeralda |

## Timeline Visual

El componente incluye una línea vertical conectando los cambios:

```
┌─────────────────┐
│ ● Estado Actual │ ← Destacado en azul
├─────────────────┤
│ │               │
│ ● Cambio 2      │
│ │               │
│ ● Cambio 1      │
└─────────────────┘
```

## Ejemplo de Salida

```
[●] PENDING → CONFIRMED                   [Actual]
    👤 Juan Pérez [Vendedor]
    📅 Hace 5 minutos (22 oct 2025, 14:25)
    📝 Notas: Cliente confirmó por teléfono

[○] Estado inicial: PENDING
    👤 Sistema [Sistema]
    📅 Hace 1 hora (22 oct 2025, 13:20)
```

## Integración con API

El componente llama automáticamente a:
```
GET /api/orders/{orderId}/history
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": "hist_123",
      "previousStatus": "PENDING",
      "newStatus": "CONFIRMED",
      "changedBy": "user_456",
      "changedByName": "Juan Pérez",
      "changedByRole": "SELLER",
      "notes": "Cliente confirmó por teléfono",
      "createdAt": "2025-10-22T14:25:00Z"
    }
  ],
  "order": {
    "id": "order_789",
    "orderNumber": "ORD-2025-001",
    "currentStatus": "CONFIRMED"
  },
  "totalChanges": 2
}
```

## Personalización CSS

El componente usa Tailwind CSS. Puedes personalizar:

```tsx
// Cambiar color del estado actual
<div className="border-blue-300 bg-blue-50">  // Cambiar azul por otro color

// Ajustar tamaño de iconos
<NewStatusIcon className="h-6 w-6" />  // Cambiar tamaño

// Modificar espaciado del timeline
<div className="space-y-4">  // Cambiar espaciado vertical
```

## Notas Técnicas

- **Auto-refresh**: No implementado (manual con `fetchHistory()`)
- **Paginación**: Muestra todos los cambios (considerar si > 50)
- **Filtros**: No implementado (mostrar todos)
- **Exportar**: No implementado

## Performance

- Carga inicial: ~200-500ms (depende de cantidad de cambios)
- Re-renders: Optimizado con React hooks
- Memoria: Ligero (~50KB por 20 entradas)

## Próximas Mejoras

- [ ] Auto-refresh cada X segundos
- [ ] Filtros por rol/fecha/estado
- [ ] Exportar a PDF/CSV
- [ ] Búsqueda en notas
- [ ] Comparación de cambios

## Troubleshooting

**Error: "No hay cambios de estado"**
- Verificar que `order_status_history` tenga datos
- Verificar endpoint `/api/orders/[id]/history` funcione

**No carga el historial**
- Verificar permisos del usuario
- Revisar console para errores de API
- Confirmar que `orderId` sea válido

**Timeline no se muestra**
- Verificar CSS de Tailwind esté cargado
- Revisar que `lucide-react` esté instalado
