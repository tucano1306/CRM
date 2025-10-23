# Sistema de Tracking de Entregas 📦🗺️

## Descripción General

Sistema completo de seguimiento de entregas en tiempo real que permite a compradores y vendedores monitorear el estado y ubicación de sus pedidos.

---

## 📊 Estructura de la Base de Datos

### Tabla: `delivery_tracking`

Almacena información principal del tracking de cada entrega.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT | ID único del tracking |
| `orderId` | TEXT | ID de la orden (UNIQUE) |
| **Conductor** | | |
| `driverName` | TEXT | Nombre del conductor |
| `driverPhone` | TEXT | Teléfono del conductor |
| **Timing** | | |
| `estimatedDeliveryTime` | TIMESTAMP | Hora estimada de entrega |
| `actualDeliveryTime` | TIMESTAMP | Hora real de entrega |
| `departureTime` | TIMESTAMP | Hora de salida del almacén |
| **Ubicación Actual** | | |
| `currentLatitude` | FLOAT | Latitud actual del conductor |
| `currentLongitude` | FLOAT | Longitud actual del conductor |
| `lastLocationUpdate` | TIMESTAMP | Última actualización GPS |
| **Dirección (Privada)** | | |
| `deliveryAddress` | TEXT | Dirección completa (solo vendedor) |
| `deliveryCity` | TEXT | Ciudad |
| `deliveryState` | TEXT | Estado/Provincia |
| `deliveryZipCode` | TEXT | Código postal |
| `deliveryCoordinates` | TEXT | Coordenadas "lat,lng" |
| **Estado** | | |
| `status` | ENUM | Estado actual del tracking |
| `createdAt` | TIMESTAMP | Fecha de creación |
| `updatedAt` | TIMESTAMP | Última actualización |

### Tabla: `delivery_location_history`

Historial completo de ubicaciones GPS para mostrar la ruta recorrida.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | TEXT | ID único |
| `trackingId` | TEXT | ID del tracking (FK) |
| `latitude` | FLOAT | Latitud del punto |
| `longitude` | FLOAT | Longitud del punto |
| `timestamp` | TIMESTAMP | Momento del registro |
| `speed` | FLOAT | Velocidad en km/h |
| `heading` | INTEGER | Dirección en grados (0-360) |

---

## 🚦 Estados del Tracking

```typescript
enum DeliveryTrackingStatus {
  PENDING         // Pendiente de asignación
  ASSIGNED        // Asignado a conductor
  PICKED_UP       // Recogido del almacén
  IN_TRANSIT      // En camino al destino
  NEARBY          // Cerca del destino (<5km)
  DELIVERED       // Entregado exitosamente
  FAILED          // Fallo en la entrega
}
```

---

## 🔐 Permisos y Privacidad

### **Información Visible para COMPRADORES:**
- ✅ Estado actual del tracking
- ✅ Ubicación en tiempo real del conductor (punto en mapa)
- ✅ Hora estimada de entrega
- ✅ Nombre del conductor
- ✅ Historial de ubicaciones (ruta recorrida)
- ❌ **NO** dirección completa de entrega (solo ciudad/zona)

### **Información Visible para VENDEDORES:**
- ✅ Todo lo anterior
- ✅ **Dirección completa** de entrega
- ✅ Coordenadas exactas del destino
- ✅ Teléfono del conductor
- ✅ Métricas de velocidad y tiempo

---

## 🛠️ Casos de Uso

### 1. **Crear Tracking al Confirmar Orden**

```typescript
// POST /api/orders/{orderId}/tracking
const tracking = await prisma.deliveryTracking.create({
  data: {
    orderId: order.id,
    status: 'PENDING',
    deliveryAddress: order.client.address,
    deliveryCity: extractCity(order.client.address),
    deliveryCoordinates: getCoordinates(order.client.address),
    estimatedDeliveryTime: calculateETA(order.createdAt)
  }
})
```

### 2. **Asignar Conductor**

```typescript
// PATCH /api/delivery-tracking/{id}/assign
await prisma.deliveryTracking.update({
  where: { id: trackingId },
  data: {
    driverName: "Juan Pérez",
    driverPhone: "+1234567890",
    status: 'ASSIGNED',
    updatedAt: new Date()
  }
})
```

### 3. **Actualizar Ubicación en Tiempo Real**

```typescript
// POST /api/delivery-tracking/{id}/location
await prisma.$transaction([
  // 1. Actualizar ubicación actual
  prisma.deliveryTracking.update({
    where: { id: trackingId },
    data: {
      currentLatitude: 40.7128,
      currentLongitude: -74.0060,
      lastLocationUpdate: new Date()
    }
  }),
  
  // 2. Guardar en historial
  prisma.deliveryLocationHistory.create({
    data: {
      trackingId: trackingId,
      latitude: 40.7128,
      longitude: -74.0060,
      speed: 45.5, // km/h
      heading: 180, // Sur
      timestamp: new Date()
    }
  })
])
```

### 4. **Completar Entrega**

```typescript
// PATCH /api/delivery-tracking/{id}/complete
await prisma.deliveryTracking.update({
  where: { id: trackingId },
  data: {
    status: 'DELIVERED',
    actualDeliveryTime: new Date(),
    updatedAt: new Date()
  }
})
```

---

## 📡 Endpoints API

### **GET** `/api/orders/{orderId}/tracking`
Obtener información de tracking de una orden.

**Response:**
```json
{
  "success": true,
  "tracking": {
    "id": "track-123",
    "orderId": "order-456",
    "status": "IN_TRANSIT",
    "driverName": "Juan Pérez",
    "currentLocation": {
      "lat": 40.7128,
      "lng": -74.0060
    },
    "estimatedDeliveryTime": "2025-01-22T15:30:00Z",
    "lastUpdate": "2025-01-22T14:45:00Z"
  }
}
```

### **POST** `/api/delivery-tracking/{id}/location`
Actualizar ubicación GPS (solo conductor/vendedor).

**Request:**
```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "speed": 45.5,
  "heading": 180
}
```

### **GET** `/api/delivery-tracking/{id}/route`
Obtener ruta completa recorrida.

**Response:**
```json
{
  "success": true,
  "route": [
    {
      "lat": 40.7128,
      "lng": -74.0060,
      "timestamp": "2025-01-22T14:00:00Z",
      "speed": 35.2
    },
    // ... más puntos
  ]
}
```

---

## 🎨 Componentes de UI

### 1. **Mapa de Tracking para Compradores**

```tsx
// components/tracking/BuyerTrackingMap.tsx
<div className="tracking-map">
  <Map 
    center={tracking.currentLocation}
    markers={[
      { position: tracking.currentLocation, icon: 'truck' },
      { position: clientLocation, icon: 'home' }
    ]}
    route={tracking.locationHistory}
  />
  
  <div className="tracking-info">
    <h3>Estado: {tracking.status}</h3>
    <p>Conductor: {tracking.driverName}</p>
    <p>ETA: {tracking.estimatedDeliveryTime}</p>
  </div>
</div>
```

### 2. **Panel de Control para Vendedores**

```tsx
// components/tracking/SellerTrackingPanel.tsx
<div className="seller-tracking">
  <Map 
    center={tracking.currentLocation}
    markers={[
      { position: tracking.currentLocation, icon: 'truck' },
      { position: parseCoordinates(tracking.deliveryCoordinates), icon: 'destination' }
    ]}
    showFullAddress={true} // Solo para vendedores
  />
  
  <div className="delivery-details">
    <h4>Dirección Completa:</h4>
    <p>{tracking.deliveryAddress}</p>
    <p>{tracking.deliveryCity}, {tracking.deliveryState}</p>
    
    <h4>Conductor:</h4>
    <p>{tracking.driverName}</p>
    <p>{tracking.driverPhone}</p>
    
    <button onClick={updateLocation}>Actualizar Ubicación</button>
  </div>
</div>
```

---

## 🔄 Flujo Completo

```
1. ORDEN CONFIRMADA
   ↓
2. CREAR TRACKING (status: PENDING)
   ↓
3. ASIGNAR CONDUCTOR (status: ASSIGNED)
   ↓
4. CONDUCTOR RECOGE PEDIDO (status: PICKED_UP)
   ↓
5. INICIO DE RUTA (status: IN_TRANSIT)
   │
   ├─→ Actualizar GPS cada 30 segundos
   │   └─→ Guardar en locationHistory
   │
   ├─→ Detectar cercanía (<5km) → (status: NEARBY)
   │
   ↓
6. ENTREGA COMPLETADA (status: DELIVERED)
   └─→ Registrar actualDeliveryTime
```

---

## 📱 Notificaciones en Tiempo Real

```typescript
// WebSocket o Server-Sent Events
io.on('tracking-update', (data) => {
  if (data.trackingId === currentTracking.id) {
    updateMap(data.location)
    updateETA(data.estimatedTime)
    
    if (data.status === 'NEARBY') {
      showNotification("¡Tu pedido está cerca! 🚚")
    }
  }
})
```

---

## 🚀 Próximos Pasos

- [ ] Implementar WebSocket para updates en tiempo real
- [ ] Integrar con Google Maps API / Mapbox
- [ ] Sistema de notificaciones push
- [ ] Cálculo automático de ETA basado en tráfico
- [ ] Zona de privacidad (ocultar últimos 200m de ruta)
- [ ] Historial de entregas del conductor
- [ ] Métricas de rendimiento (tiempo promedio, rutas óptimas)

---

## ✅ Estado Actual

- ✅ **Base de Datos**: Tablas creadas y migradas
- ✅ **Prisma Schema**: Modelos y relaciones definidas
- ✅ **Enums**: Estados de tracking configurados
- ✅ **Índices**: Optimizados para búsquedas rápidas
- ✅ **Foreign Keys**: Relaciones con cascada
- ⏳ **API Endpoints**: Por implementar
- ⏳ **UI Components**: Por implementar
- ⏳ **WebSocket**: Por implementar

---

**Última actualización:** 22 de Enero, 2025
**Versión:** 1.0.0
