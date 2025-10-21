import { ClientEvent, EventType } from '../types/event.types';
import { eventEmitter } from '../eventEmitter';

export class ClientEventHandler {
  static initialize(): void {
    eventEmitter.on<ClientEvent>(EventType.CLIENT_CREATED, this.handleClientCreated);
    eventEmitter.on<ClientEvent>(EventType.CLIENT_UPDATED, this.handleClientUpdated);
    eventEmitter.on<ClientEvent>(EventType.CLIENT_DELETED, this.handleClientDeleted);
  }

  private static async handleClientCreated(event: ClientEvent): Promise<void> {
    console.log('Client created:', event.data);
    
    await eventEmitter.emit({
      type: EventType.NOTIFICATION_CREATED,
      timestamp: new Date(),
      userId: event.userId,
      data: {
        title: 'Cliente Creado',
        message: `Cliente ${event.data.name} ha sido creado`,
        type: 'success',
      },
    });
  }

  private static async handleClientUpdated(event: ClientEvent): Promise<void> {
    console.log('Client updated:', event.data);
  }

  private static async handleClientDeleted(event: ClientEvent): Promise<void> {
    console.log('Client deleted:', event.data);
  }
}
