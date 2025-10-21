import { OrderEventHandler } from './handlers/order.handler'
import { ChatEventHandler } from './handlers/chat.handler'
import { ClientEventHandler } from './handlers/client.handler'
import { NotificationEventHandler } from './handlers/notification.handler'

/**
 * Initialize all event handlers
 * Call this once when the application starts
 */
export function initializeEventHandlers(): void {
  OrderEventHandler.initialize()
  ChatEventHandler.initialize()
  ClientEventHandler.initialize()
  NotificationEventHandler.initialize()
  
  console.log('Event handlers initialized')
}

/**
 * Cleanup event handlers
 * Call this when shutting down the application
 */
export function cleanupEventHandlers(): void {
  console.log('Cleaning up event handlers...')
  // Event handlers will be cleaned up automatically when the process exits
}
