import { ChatEvent, EventType } from '../types/event.types';
import { eventEmitter } from '../eventEmitter';

export class ChatEventHandler {
  static initialize(): void {
    eventEmitter.on<ChatEvent>(EventType.CHAT_MESSAGE_SENT, this.handleMessageSent);
    eventEmitter.on<ChatEvent>(EventType.CHAT_MESSAGE_RECEIVED, this.handleMessageReceived);
  }

  private static async handleMessageSent(event: ChatEvent): Promise<void> {
    console.log('Chat message sent:', event.data);
    
    // Emitir evento de mensaje recibido para el destinatario
    await eventEmitter.emit({
      type: EventType.CHAT_MESSAGE_RECEIVED,
      timestamp: new Date(),
      userId: event.data.receiverId,
      data: event.data,
    });
  }

  private static async handleMessageReceived(event: ChatEvent): Promise<void> {
    console.log('Chat message received:', event.data);
    
    // Crear notificación para el receptor
    await eventEmitter.emit({
      type: EventType.NOTIFICATION_CREATED,
      timestamp: new Date(),
      userId: event.data.receiverId,
      data: {
        title: 'Nuevo Mensaje',
        message: `Tienes un nuevo mensaje`,
        type: 'info',
      },
    });
  }
}
