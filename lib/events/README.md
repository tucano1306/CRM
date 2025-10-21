# Event-Driven Architecture (Pub-Sub Pattern)

This directory contains the event-driven architecture implementation for the Food Orders CRM.

## Overview

The event system uses a **Pub-Sub (Publish-Subscribe)** pattern to decouple components and enable reactive programming.

## Structure

```
lib/events/
├── types/
│   └── event.types.ts       # Event type definitions
├── handlers/
│   └── eventHandlers.ts     # Event handler implementations
├── eventEmitter.ts           # Core pub-sub implementation
└── index.ts                  # Initialization and exports
```

## Event Types

- **Order Events**: `ORDER_CREATED`, `ORDER_UPDATED`, `ORDER_DELETED`, `ORDER_PLACED`, `ORDER_CANCELLED`
- **Chat Events**: `CHAT_MESSAGE_SENT`, `CHAT_MESSAGE_RECEIVED`, `CHAT_MESSAGE_READ`
- **Client Events**: `CLIENT_CREATED`, `CLIENT_UPDATED`, `CLIENT_DELETED`
- **User Events**: `USER_LOGGED_IN`, `USER_LOGGED_OUT`
- **Notification Events**: `NOTIFICATION_CREATED`, `NOTIFICATION_SENT`

## Usage

### 1. Initialize Event Handlers (in app startup)

```typescript
// In your main layout or startup file
import { initializeEventHandlers } from '@/lib/events'

// Call once when app starts
initializeEventHandlers()
```

### 2. Emit Events from API Routes

```typescript
import { emitOrderCreated, emitChatMessageSent } from '@/lib/events/eventEmitter'

// In your API route
export async function POST(request: NextRequest) {
  // ... create order logic ...
  
  // Emit event
  await emitOrderCreated({
    orderId: order.id,
    clientId: order.clientId,
    sellerId: order.sellerId,
    amount: order.totalAmount,
    status: order.status,
  })
  
  return NextResponse.json({ success: true, order })
}
```

### 3. Subscribe to Events

```typescript
import { eventEmitter, EventType } from '@/lib/events/eventEmitter'

// Subscribe to an event
eventEmitter.on(EventType.ORDER_CREATED, async (event) => {
  console.log('Order created!', event.data)
  // Your custom logic here
})
```

### 4. Create Custom Event Handlers

```typescript
// In lib/events/handlers/customHandlers.ts
import { Event, EventType } from '../types/event.types'

export const myCustomHandler = async (event: Event) => {
  if (event.type !== EventType.ORDER_CREATED) return
  
  // Your custom logic
  console.log('Custom handling for order:', event.data.orderId)
}

// Register it in lib/events/index.ts
import { myCustomHandler } from './handlers/customHandlers'

export function initializeEventHandlers() {
  // ...
  eventEmitter.on(EventType.ORDER_CREATED, myCustomHandler)
}
```

## Benefits

✅ **Decoupling**: Components don't need to know about each other
✅ **Scalability**: Easy to add new features without modifying existing code
✅ **Maintainability**: Clear separation of concerns
✅ **Testability**: Easy to test handlers independently
✅ **Flexibility**: Multiple handlers can respond to the same event

## Example: Order Created Flow

1. **API Route** creates order in database
2. **API Route** emits `ORDER_CREATED` event
3. **Event Handlers** respond:
   - Notification handler → sends email to seller
   - Analytics handler → logs to analytics service
   - Audit handler → creates audit log entry
   - Inventory handler → updates inventory counts

All handlers run independently and don't affect each other!

## Current Handlers

- `logEventHandler` - Logs all events (dev only)
- `handleOrderCreated` - Notifies seller of new orders
- `handleOrderUpdated` - Logs order status changes
- `handleChatMessageSent` - Sends push notifications
- `handleChatMessageRead` - Updates analytics

## Next Steps

1. Add notification service integration
2. Add email service integration
3. Add analytics tracking
4. Add audit logging
5. Add real-time updates via WebSockets
