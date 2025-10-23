# Delivery Tracking Components - Usage Guide

## Components Created

### 1. `DeliveryTracking.tsx`
Main component that displays complete delivery tracking information:
- Real-time status updates
- Driver information
- Timeline progress bar
- Estimated delivery time countdown
- Interactive map with driver location
- Location history trail
- Auto-refresh every 30 seconds

### 2. `DeliveryMap.tsx`
Map placeholder component ready for Google Maps or Mapbox integration.

### 3. `DeliveryTrackingControl.tsx` ⭐ NEW
Seller control panel to manage delivery tracking:
- Update delivery status
- Assign driver (name and phone)
- Set estimated delivery time
- Configure delivery address
- Complete form validation
- Save functionality with loading states

## Usage Examples

### In Orders Management Page (Seller View) - Display Only

```tsx
import DeliveryTracking from '@/components/delivery/DeliveryTracking'

// Inside the expanded order section
{isExpanded && (
  <div className="border-t bg-gray-50 p-6">
    {/* ... existing content ... */}
    
    {/* Add Delivery Tracking Display */}
    <div className="mt-4">
      <h4 className="font-semibold text-gray-800 mb-3">Seguimiento de Entrega</h4>
      <DeliveryTracking 
        orderId={order.id} 
        showAddress={true}  // Sellers can see full address
      />
    </div>
  </div>
)}
```

### In Orders Management Page - With Control Panel ⭐ NEW

```tsx
import DeliveryTracking from '@/components/delivery/DeliveryTracking'
import DeliveryTrackingControl from '@/components/delivery/DeliveryTrackingControl'

// State to track current tracking data
const [trackingData, setTrackingData] = useState(null)

// Fetch tracking data
const fetchTracking = async (orderId: string) => {
  const response = await fetch(`/api/delivery/tracking/${orderId}`)
  const result = await response.json()
  if (result.success) {
    setTrackingData(result.data)
  }
}

// Inside the expanded order section
{isExpanded && (
  <div className="border-t bg-gray-50 p-6">
    {/* ... existing content ... */}
    
    {/* Seller Control Panel */}
    <div className="mt-4">
      <h4 className="font-semibold text-gray-800 mb-3">Gestionar Entrega</h4>
      <DeliveryTrackingControl
        orderId={order.id}
        currentTracking={trackingData}
        onUpdate={() => fetchTracking(order.id)}
      />
    </div>
    
    {/* Live Tracking Display */}
    <div className="mt-4">
      <h4 className="font-semibold text-gray-800 mb-3">Vista de Seguimiento</h4>
      <DeliveryTracking 
        orderId={order.id} 
        showAddress={true}
      />
    </div>
  </div>
)}
```

### In Buyer Order Detail Page

```tsx
import DeliveryTracking from '@/components/delivery/DeliveryTracking'

export default function BuyerOrderDetailPage({ orderId }: { orderId: string }) {
  return (
    <div className="space-y-6">
      <h1>Mi Pedido</h1>
      
      {/* Buyer sees location but NOT full address */}
      <DeliveryTracking 
        orderId={orderId} 
        showAddress={false}  // Privacy: hide address from buyers
      />
    </div>
  )
}
```

## Features

### ✅ Auto-Refresh
- Fetches tracking data every 30 seconds
- Fetches location history automatically
- Shows live "pulse" indicator on last update time

### ✅ Privacy Controls
- `showAddress={true}`: Seller view (shows full delivery address)
- `showAddress={false}`: Buyer view (hides address, shows only location on map)

### ✅ Status Timeline
Shows progress through delivery stages:
1. ASSIGNED - Conductor asignado
2. PICKED_UP - Recogido del almacén
3. IN_TRANSIT - En camino
4. DELIVERED - Entregado

### ✅ Driver Information
- Name and phone number (clickable to call)
- Only shows when driver is assigned

### ✅ Time Calculations
- Countdown to estimated delivery time
- "45 minutos" or "2h 15m" format
- Shows "Retrasado" if past estimated time

### ✅ Interactive Map (Ready for Integration)
Currently shows a placeholder. To activate:

1. **Google Maps**: Add to your project
```bash
npm install @googlemaps/js-api-loader
```

2. **Mapbox**: Alternative option
```bash
npm install mapbox-gl
```

3. Update `DeliveryMap.tsx` with your preferred mapping service

## API Endpoints Required

The component expects these endpoints:

### `GET /api/delivery/tracking/:orderId`
Returns delivery tracking data:
```typescript
{
  success: true,
  data: {
    id: string
    orderId: string
    driverName: string | null
    driverPhone: string | null
    estimatedDeliveryTime: string | null
    actualDeliveryTime: string | null
    currentLatitude: number | null
    currentLongitude: number | null
    lastLocationUpdate: string | null
    status: DeliveryStatus
    deliveryAddress?: string | null  // Only if user is seller
    deliveryCity?: string | null
    deliveryState?: string | null
    deliveryZipCode?: string | null
  }
}
```

### `GET /api/delivery/tracking/:orderId/history`
Returns location history for route visualization:
```typescript
{
  success: true,
  data: [
    { latitude: 25.7617, longitude: -80.1918 },
    { latitude: 25.7618, longitude: -80.1919 },
    // ... more points
  ]
}
```

## Styling

Uses existing project theme:
- Purple accent colors (`bg-purple-600`, `text-purple-600`)
- Tailwind utility classes
- Consistent with current card designs
- Responsive (mobile-friendly)

## Next Steps

1. ✅ Components created
2. ⏳ Create API endpoints (see `docs/DELIVERY_TRACKING.md`)
3. ⏳ Integrate map service (Google Maps/Mapbox)
4. ⏳ Add to orders management page
5. ⏳ Create buyer order detail page
6. ⏳ Optional: Add WebSocket for real-time updates

## Testing

To test the component:

1. Create a delivery tracking record in the database
2. Navigate to an order with tracking
3. Component will auto-refresh every 30 seconds
4. Check browser console for API calls

## Example Integration in `app/orders/page.tsx`

Add this import at the top:
```tsx
import DeliveryTracking from '@/components/delivery/DeliveryTracking'
```

Add this section in the expanded order content (around line 800+):
```tsx
{/* Delivery Tracking - after Delivery Instructions */}
{order.status === 'IN_DELIVERY' && (
  <div className="mt-4">
    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
      <Truck className="h-5 w-5 text-purple-600" />
      Seguimiento de Entrega
    </h4>
    <DeliveryTracking 
      orderId={order.id} 
      showAddress={true}
    />
  </div>
)}
```

This will show tracking only when order status is `IN_DELIVERY`.
