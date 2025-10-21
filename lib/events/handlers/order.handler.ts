import { OrderEvent, EventType } from '../types/event.types';
import { eventEmitter } from '../eventEmitter';
import logger, { LogCategory } from '@/lib/logger';

export class OrderEventHandler {
  static initialize(): void {
    eventEmitter.on<OrderEvent>(EventType.ORDER_CREATED, this.handleOrderCreated);
    eventEmitter.on<OrderEvent>(EventType.ORDER_UPDATED, this.handleOrderUpdated);
    eventEmitter.on<OrderEvent>(EventType.ORDER_DELETED, this.handleOrderDeleted);
  }

  private static async handleOrderCreated(event: OrderEvent): Promise<void> {
    logger.eventEmitted('ORDER_CREATED', {
      userId: event.userId,
      orderId: event.data.orderId
    }, event.data);
    
    // Crear notificación
    await eventEmitter.emit({
      type: EventType.NOTIFICATION_CREATED,
      timestamp: new Date(),
      userId: event.userId,
      data: {
        title: 'Nueva Orden Creada',
        message: `Orden #${event.data.orderId} ha sido creada`,
        type: 'success',
      },
    });
  }

  private static async handleOrderUpdated(event: OrderEvent): Promise<void> {
    logger.eventEmitted('ORDER_UPDATED', {
      userId: event.userId,
      orderId: event.data.orderId
    }, event.data);
    
    await eventEmitter.emit({
      type: EventType.NOTIFICATION_CREATED,
      timestamp: new Date(),
      userId: event.userId,
      data: {
        title: 'Orden Actualizada',
        message: `Orden #${event.data.orderId} ha sido actualizada`,
        type: 'info',
      },
    });
  }

  private static async handleOrderDeleted(event: OrderEvent): Promise<void> {
    logger.eventEmitted('ORDER_DELETED', {
      userId: event.userId,
      orderId: event.data.orderId
    }, event.data);
  }
}
