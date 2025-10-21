import { OrderEventHandler } from './order.handler';
import { ChatEventHandler } from './chat.handler';
import { ClientEventHandler } from './client.handler';
import { NotificationEventHandler } from './notification.handler';

export function initializeEventHandlers(): void {
  OrderEventHandler.initialize();
  ChatEventHandler.initialize();
  ClientEventHandler.initialize();
  NotificationEventHandler.initialize();
  
  console.log('Event handlers initialized');
}
