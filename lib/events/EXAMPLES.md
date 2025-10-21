# Event System - Usage Examples

This file contains code examples for using the event-driven architecture in the Food Orders CRM.

## Option 1: Initialize in Root Layout (Server-Side)

**File: `app/layout.tsx`**

```typescript
import { initializeEventHandlers } from '@/lib/events/handlers'

// Call once when server starts
if (typeof window === 'undefined') {
  initializeEventHandlers()
}
```

## Option 2: Initialize in a Separate File

**File: `lib/init.ts`**

```typescript
import { initializeEventHandlers } from '@/lib/events/handlers'

let initialized = false

export function initializeApp() {
  if (!initialized) {
    initializeEventHandlers()
    initialized = true
  }
}
```

**File: `middleware.ts`**

```typescript
import { initializeApp } from '@/lib/init'

initializeApp()
```

## Using Events in API Routes

**File: `app/api/orders/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Create order
  const order = await prisma.order.create({
    data: {
      clientId: body.clientId,
      sellerId: body.sellerId,
      totalAmount: body.totalAmount,
      status: 'PENDING',
      orderNumber: `ORD-${Date.now()}`,
    }
  })
  
  // Emit event (non-blocking)
  await eventEmitter.emit({
    type: EventType.ORDER_CREATED,
    timestamp: new Date(),
    userId: body.userId,
    data: {
      orderId: order.id,
      clientId: order.clientId,
      amount: order.totalAmount,
      status: order.status,
    },
  })
  
  return NextResponse.json({ success: true, order })
}
```

## Creating Custom Handlers

**File: `lib/events/handlers/emailHandlers.ts`**

```typescript
import { BaseEvent, EventType, OrderEvent } from '../types/event.types'
import { eventEmitter } from '../eventEmitter'

export class EmailEventHandler {
  static initialize(): void {
    eventEmitter.on<OrderEvent>(EventType.ORDER_CREATED, this.sendOrderEmail)
    eventEmitter.on<OrderEvent>(EventType.ORDER_UPDATED, this.sendUpdateEmail)
  }

  private static async sendOrderEmail(event: OrderEvent): Promise<void> {
    console.log(`Sending order confirmation email for order ${event.data.orderId}`)
    
    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // await emailService.send({
    //   to: customerEmail,
    //   subject: 'Order Confirmation',
    //   body: `Your order #${event.data.orderId} has been received`
    // })
  }

  private static async sendUpdateEmail(event: OrderEvent): Promise<void> {
    console.log(`Sending order update email for order ${event.data.orderId}`)
  }
}
```

**Register in `lib/events/handlers/index.ts`**

```typescript
import { OrderEventHandler } from './order.handler'
import { ChatEventHandler } from './chat.handler'
import { ClientEventHandler } from './client.handler'
import { NotificationEventHandler } from './notification.handler'
import { EmailEventHandler } from './emailHandlers'

export function initializeEventHandlers(): void {
  OrderEventHandler.initialize()
  ChatEventHandler.initialize()
  ClientEventHandler.initialize()
  NotificationEventHandler.initialize()
  EmailEventHandler.initialize()
  
  console.log('Event handlers initialized')
}
```

## Real-World Integration Examples

### Example 1: Order Workflow

```typescript
// app/api/buyer/orders/route.tsx
await eventEmitter.emit({
  type: EventType.ORDER_CREATED,
  timestamp: new Date(),
  userId: userId,
  data: {
    orderId: order.id,
    clientId: order.clientId,
    amount: order.totalAmount,
    status: order.status,
  },
})
```

This triggers:
1. `OrderEventHandler.handleOrderCreated()` → logs order
2. Emits `NOTIFICATION_CREATED` event
3. `NotificationEventHandler.handleNotificationCreated()` → sends notification

### Example 2: Chat Message Flow

```typescript
// app/api/chat-messages/route.tsx
await eventEmitter.emit({
  type: EventType.CHAT_MESSAGE_SENT,
  timestamp: new Date(),
  userId: userId,
  data: {
    messageId: chatMessage.id,
    senderId: userId,
    receiverId: receiverId,
    message: message,
  },
})
```

This triggers:
1. `ChatEventHandler.handleMessageSent()` → logs message
2. Emits `CHAT_MESSAGE_RECEIVED` event to receiver
3. Emits `NOTIFICATION_CREATED` event
4. Receiver gets notification

### Example 3: Client Creation

```typescript
// app/api/clients/route.tsx
await eventEmitter.emit({
  type: EventType.CLIENT_CREATED,
  timestamp: new Date(),
  data: {
    clientId: newClient.id,
    name: newClient.name,
    email: newClient.email,
  },
})
```

This triggers:
1. `ClientEventHandler.handleClientCreated()` → logs client
2. Emits `NOTIFICATION_CREATED` event
3. Creates notification for admin/seller

## Advanced: Analytics Handler

**File: `lib/events/handlers/analytics.handler.ts`**

```typescript
import { BaseEvent, EventType } from '../types/event.types'
import { eventEmitter } from '../eventEmitter'
import { prisma } from '@/lib/prisma'

export class AnalyticsEventHandler {
  static initialize(): void {
    // Track all events for analytics
    eventEmitter.on<BaseEvent>(EventType.ORDER_CREATED, this.trackOrderAnalytics)
    eventEmitter.on<BaseEvent>(EventType.CHAT_MESSAGE_SENT, this.trackChatAnalytics)
  }

  private static async trackOrderAnalytics(event: BaseEvent): Promise<void> {
    // Save analytics data to database
    await prisma.analytics.create({
      data: {
        eventType: event.type,
        userId: event.userId,
        timestamp: event.timestamp,
        metadata: event.data,
      }
    })
  }

  private static async trackChatAnalytics(event: BaseEvent): Promise<void> {
    console.log('Chat analytics:', event.type, event.timestamp)
  }
}
```

## Testing Events

```typescript
// __tests__/events/eventEmitter.test.ts
import { eventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'

describe('EventEmitter', () => {
  it('should emit and receive events', async () => {
    let received = false
    
    eventEmitter.on(EventType.ORDER_CREATED, async (event) => {
      received = true
      expect(event.type).toBe(EventType.ORDER_CREATED)
    })
    
    await eventEmitter.emit({
      type: EventType.ORDER_CREATED,
      timestamp: new Date(),
      data: {
        orderId: 'test-123',
        clientId: 'client-1',
        amount: 100,
        status: 'PENDING',
      },
    })
    
    expect(received).toBe(true)
  })
})
```

## Best Practices

1. **Always await emit()** - Ensures handlers complete before continuing
2. **Keep handlers focused** - Each handler should do one thing
3. **Use try-catch** - Handlers should not throw errors (already handled in EventEmitter)
4. **Log important events** - Helps with debugging and monitoring
5. **Don't block** - Keep handlers fast; use queues for heavy work
6. **Test events** - Write unit tests for critical event flows

## Next Steps

1. Add email notifications handler with real email service
2. Add SMS notifications handler
3. Add push notifications (WebSockets/Server-Sent Events)
4. Add audit logging handler
5. Add analytics/metrics handler
6. Add webhook delivery handler
