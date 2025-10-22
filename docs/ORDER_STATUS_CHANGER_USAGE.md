# OrderStatusChanger Component Usage

## Overview
React component for changing order statuses with audit trail support. Provides a dropdown UI with 11 status options and a modal for adding notes.

## Import
```tsx
import OrderStatusChanger from '@/components/orders/OrderStatusChanger'
```

## Basic Usage

### Example 1: Simple usage with default API call
```tsx
<OrderStatusChanger 
  orderId={order.id} 
  currentStatus={order.status}
/>
```
This will automatically call `/api/orders/[id]/status` and reload the page after success.

### Example 2: Custom handler
```tsx
const handleStatusChange = async (newStatus: OrderStatus, notes?: string) => {
  // Custom logic before API call
  console.log(`Changing to ${newStatus}`)
  
  const response = await fetch(`/api/orders/${orderId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus, notes })
  })
  
  if (!response.ok) {
    throw new Error('Failed to update status')
  }
  
  // Custom logic after success
  mutate() // Revalidate SWR cache
  toast.success('Order status updated')
}

<OrderStatusChanger 
  orderId={order.id} 
  currentStatus={order.status}
  onStatusChange={handleStatusChange}
/>
```

### Example 3: Disabled state
```tsx
const isReadOnly = user.role === 'CLIENT'

<OrderStatusChanger 
  orderId={order.id} 
  currentStatus={order.status}
  disabled={isReadOnly}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `orderId` | `string` | ✅ | - | The ID of the order to update |
| `currentStatus` | `OrderStatus` | ✅ | - | Current status of the order |
| `onStatusChange` | `(newStatus: OrderStatus, notes?: string) => Promise<void>` | ❌ | Default API call | Custom handler for status changes |
| `disabled` | `boolean` | ❌ | `false` | Disable the dropdown button |

## Status Options (11 total)

1. **PENDING** - Pendiente (Yellow) - Order received, awaiting confirmation
2. **CONFIRMED** - Confirmada (Blue) - Confirmed by seller
3. **PREPARING** - Preparando (Indigo) - Preparing the order
4. **READY_FOR_PICKUP** - Listo para Recoger (Cyan) - Ready for delivery
5. **IN_DELIVERY** - En Entrega (Purple) - On the way to customer
6. **DELIVERED** - Entregado (Teal) - Delivered to customer
7. **PARTIALLY_DELIVERED** - Entrega Parcial (Orange) - Partial delivery
8. **COMPLETED** - Completada (Green) - Order successfully finished
9. **CANCELED** - Cancelada (Red) - Order canceled
10. **PAYMENT_PENDING** - Pago Pendiente (Amber) - Waiting for payment confirmation
11. **PAID** - Pagado (Emerald) - Payment confirmed

## Features

### Audit Trail
- All status changes are recorded in `order_status_history` table
- Notes are optional but recommended for context
- Captures: who changed it, when, previous status, new status, notes

### UI/UX
- Dropdown shows current status with icon and color
- Each option shows description on hover
- Current status is disabled in dropdown
- Modal for notes before confirming change
- Loading states during API call
- Error handling with user-friendly messages

### Behavior
- If user selects current status, dropdown closes (no-op)
- Clicking outside dropdown closes it
- Notes modal can be canceled without making changes
- Default behavior reloads page after successful change
- Custom `onStatusChange` handler prevents default reload

## Integration with Order Detail Page

```tsx
// app/orders/[id]/page.tsx
import OrderStatusChanger from '@/components/orders/OrderStatusChanger'

export default async function OrderDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params
  const order = await getOrderById(id)
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1>Order #{order.id}</h1>
        <OrderStatusChanger 
          orderId={order.id}
          currentStatus={order.status}
        />
      </div>
      
      {/* Rest of order details */}
    </div>
  )
}
```

## API Endpoint Expected

The component expects the following API endpoint:

**PATCH** `/api/orders/[id]/status`

Request body:
```json
{
  "status": "CONFIRMED",
  "notes": "Cliente confirmó por teléfono"
}
```

Response:
```json
{
  "success": true,
  "order": { /* updated order */ },
  "auditEntry": { /* audit record */ }
}
```

This endpoint is already implemented in `app/api/orders/[id]/status/route.ts` with full audit integration.

## Styling

The component uses Tailwind CSS and shadcn/ui Button component. It includes:
- Fixed position modal overlay (z-50)
- Dropdown with custom positioning (z-20)
- Responsive design with mobile padding
- Color-coded status icons
- Smooth transitions and hover states

## Permissions

The component itself doesn't enforce permissions. You should:
1. Check permissions server-side in the API endpoint
2. Pass `disabled={true}` prop if user doesn't have permission
3. Hide component entirely for unauthorized users

Example:
```tsx
const canChangeStatus = user.role === 'SELLER' || user.role === 'ADMIN'

{canChangeStatus && (
  <OrderStatusChanger 
    orderId={order.id}
    currentStatus={order.status}
  />
)}
```

## Notes Best Practices

Encourage users to add notes for:
- **CONFIRMED**: "Cliente confirmó por WhatsApp a las 14:30"
- **CANCELED**: "Cliente solicitó cancelación - fuera de stock"
- **PARTIALLY_DELIVERED**: "Entregados 5 de 10 productos - resto pendiente"
- **DELIVERED**: "Entregado a portería - firmado por Juan Pérez"

The notes field is optional but creates better audit trails for compliance and customer service.
