export enum EventType {
  // Order events
  ORDER_CREATED = 'order.created',
  ORDER_UPDATED = 'order.updated',
  ORDER_DELETED = 'order.deleted',
  ORDER_PLACED = 'order.placed',
  ORDER_CANCELLED = 'order.cancelled',
  
  // Recurring Order events
  RECURRING_ORDER_CREATED = 'recurring_order.created',
  RECURRING_ORDER_UPDATED = 'recurring_order.updated',
  RECURRING_ORDER_DELETED = 'recurring_order.deleted',
  RECURRING_ORDER_PAUSED = 'recurring_order.paused',
  RECURRING_ORDER_RESUMED = 'recurring_order.resumed',
  
  // Chat events
  CHAT_MESSAGE_SENT = 'chat.message.sent',
  CHAT_MESSAGE_RECEIVED = 'chat.message.received',
  CHAT_MESSAGE_READ = 'chat.message.read',
  
  // Client events
  CLIENT_CREATED = 'client.created',
  CLIENT_UPDATED = 'client.updated',
  CLIENT_DELETED = 'client.deleted',
  
  // User events
  USER_LOGGED_IN = 'user.logged.in',
  USER_LOGGED_OUT = 'user.logged.out',
  
  // Notification events
  NOTIFICATION_CREATED = 'notification.created',
  NOTIFICATION_SENT = 'notification.sent',
}

export interface BaseEvent {
  type: EventType;
  timestamp: Date;
  userId?: string;
  data: any;
}

export interface OrderEvent extends BaseEvent {
  type: EventType.ORDER_CREATED | EventType.ORDER_UPDATED | EventType.ORDER_DELETED | EventType.ORDER_PLACED | EventType.ORDER_CANCELLED;
  data: {
    orderId: string;
    clientId: string;
    sellerId: string;
    amount: number;
    status: string;
    items?: any[];
  };
}

export interface RecurringOrderEvent extends BaseEvent {
  type: EventType.RECURRING_ORDER_CREATED | EventType.RECURRING_ORDER_UPDATED | EventType.RECURRING_ORDER_DELETED | EventType.RECURRING_ORDER_PAUSED | EventType.RECURRING_ORDER_RESUMED;
  data: {
    recurringOrderId: string;
    clientId: string;
    sellerId: string;
    name: string;
    frequency: string;
    amount: number;
    isActive: boolean;
  };
}

export interface ChatEvent extends BaseEvent {
  type: EventType.CHAT_MESSAGE_SENT | EventType.CHAT_MESSAGE_RECEIVED | EventType.CHAT_MESSAGE_READ;
  data: {
    messageId: string;
    senderId: string;
    receiverId: string;
    content: string;
    orderId?: string;
  };
}

export interface ClientEvent extends BaseEvent {
  type: EventType.CLIENT_CREATED | EventType.CLIENT_UPDATED | EventType.CLIENT_DELETED;
  data: {
    clientId: string;
    name: string;
    email: string;
    sellerId?: string;
  };
}

export interface UserEvent extends BaseEvent {
  type: EventType.USER_LOGGED_IN | EventType.USER_LOGGED_OUT;
  data: {
    userId: string;
    email: string;
    role: string;
  };
}

export interface NotificationEvent extends BaseEvent {
  type: EventType.NOTIFICATION_CREATED | EventType.NOTIFICATION_SENT;
  data: {
    notificationId: string;
    recipientId: string;
    title: string;
    message: string;
    channel?: 'email' | 'sms' | 'push';
  };
}

export type Event = OrderEvent | RecurringOrderEvent | ChatEvent | ClientEvent | UserEvent | NotificationEvent;
