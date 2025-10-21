import { BaseEvent, EventType } from '../types/event.types';
import { eventEmitter } from '../eventEmitter';

export class NotificationEventHandler {
  static initialize(): void {
    eventEmitter.on<BaseEvent>(EventType.NOTIFICATION_CREATED, this.handleNotificationCreated);
  }

  private static async handleNotificationCreated(event: BaseEvent): Promise<void> {
    console.log('Notification created:', event.data);
    // Aquí podrías guardar en base de datos, enviar email, push notification, etc.
  }
}
