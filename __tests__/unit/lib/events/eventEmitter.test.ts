/// <reference types="jest" />
import { EventEmitter } from '@/lib/events/eventEmitter'
import { EventType } from '@/lib/events/types/event.types'

describe('EventEmitter', () => {
  let emitter: EventEmitter
  
  beforeEach(() => {
    // Get singleton instance and clear all listeners
    emitter = EventEmitter.getInstance()
    emitter.removeAllListeners()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = EventEmitter.getInstance()
      const instance2 = EventEmitter.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })

  describe('on/off', () => {
    it('should register an event handler', () => {
      const handler = jest.fn()
      
      emitter.on(EventType.ORDER_CREATED, handler)
      emitter.emit({ type: EventType.ORDER_CREATED, timestamp: new Date(), data: {} })
      
      // Need to wait for async emit
      setTimeout(() => {
        expect(handler).toHaveBeenCalled()
      }, 10)
    })

    it('should register multiple handlers for same event', async () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      
      emitter.on(EventType.ORDER_CREATED, handler1)
      emitter.on(EventType.ORDER_CREATED, handler2)
      
      await emitter.emit({ type: EventType.ORDER_CREATED, timestamp: new Date(), data: {} })
      
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should unregister an event handler', async () => {
      const handler = jest.fn()
      
      emitter.on(EventType.ORDER_UPDATED, handler)
      emitter.off(EventType.ORDER_UPDATED, handler)
      
      await emitter.emit({ type: EventType.ORDER_UPDATED, timestamp: new Date(), data: {} })
      
      expect(handler).not.toHaveBeenCalled()
    })

    it('should not throw when removing non-existent handler', () => {
      const handler = jest.fn()
      
      expect(() => {
        emitter.off(EventType.ORDER_CREATED, handler)
      }).not.toThrow()
    })

    it('should not throw when removing handler for non-existent event type', () => {
      const handler = jest.fn()
      
      expect(() => {
        emitter.off(EventType.CLIENT_CREATED, handler)
      }).not.toThrow()
    })
  })

  describe('emit', () => {
    it('should call registered handlers with event data', async () => {
      const handler = jest.fn()
      const eventData = {
        type: EventType.ORDER_CREATED,
        timestamp: new Date(),
        data: { orderId: '123', clientId: '456' }
      }
      
      emitter.on(EventType.ORDER_CREATED, handler)
      await emitter.emit(eventData)
      
      expect(handler).toHaveBeenCalledWith(eventData)
    })

    it('should not throw when emitting event with no handlers', async () => {
      await expect(
        emitter.emit({ type: EventType.ORDER_CREATED, timestamp: new Date(), data: {} })
      ).resolves.not.toThrow()
    })

    it('should handle synchronous handlers', async () => {
      const handler = jest.fn()
      
      emitter.on(EventType.CLIENT_CREATED, handler)
      await emitter.emit({ type: EventType.CLIENT_CREATED, timestamp: new Date(), data: {} })
      
      expect(handler).toHaveBeenCalled()
    })

    it('should handle asynchronous handlers', async () => {
      const handler = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })
      
      emitter.on(EventType.PRODUCT_CREATED, handler)
      await emitter.emit({ type: EventType.PRODUCT_CREATED, timestamp: new Date(), data: {} })
      
      expect(handler).toHaveBeenCalled()
    })

    it('should wait for all async handlers to complete', async () => {
      const order: number[] = []
      
      const handler1 = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
        order.push(1)
      })
      
      const handler2 = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        order.push(2)
      })
      
      emitter.on(EventType.ORDER_UPDATED, handler1)
      emitter.on(EventType.ORDER_UPDATED, handler2)
      
      await emitter.emit({ type: EventType.ORDER_UPDATED, timestamp: new Date(), data: {} })
      
      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
      expect(order).toHaveLength(2)
    })

    it('should catch and log errors from handlers', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const errorHandler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error')
      })
      const successHandler = jest.fn()
      
      emitter.on(EventType.ORDER_CREATED, errorHandler)
      emitter.on(EventType.ORDER_CREATED, successHandler)
      
      await emitter.emit({ type: EventType.ORDER_CREATED, timestamp: new Date(), data: {} })
      
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(successHandler).toHaveBeenCalled() // Other handlers still execute
      
      consoleErrorSpy.mockRestore()
    })

    it('should handle async handler errors (current implementation throws)', async () => {
      // Note: Current implementation doesn't catch async errors - they bubble up
      const errorHandler = jest.fn().mockImplementation(async () => {
        throw new Error('Async handler error')
      })
      
      emitter.on(EventType.CHAT_MESSAGE_SENT, errorHandler)
      
      // Current behavior: async errors are not caught
      await expect(
        emitter.emit({ type: EventType.CHAT_MESSAGE_SENT, timestamp: new Date(), data: {} })
      ).rejects.toThrow('Async handler error')
    })
  })

  describe('removeAllListeners', () => {
    it('should remove all listeners for specific event type', async () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      
      emitter.on(EventType.ORDER_CREATED, handler1)
      emitter.on(EventType.CLIENT_CREATED, handler2)
      
      emitter.removeAllListeners(EventType.ORDER_CREATED)
      
      await emitter.emit({ type: EventType.ORDER_CREATED, timestamp: new Date(), data: {} })
      await emitter.emit({ type: EventType.CLIENT_CREATED, timestamp: new Date(), data: {} })
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
    })

    it('should remove all listeners for all event types', async () => {
      const handler1 = jest.fn()
      const handler2 = jest.fn()
      const handler3 = jest.fn()
      
      emitter.on(EventType.ORDER_CREATED, handler1)
      emitter.on(EventType.CLIENT_CREATED, handler2)
      emitter.on(EventType.RECURRING_ORDER_CREATED, handler3)
      
      emitter.removeAllListeners()
      
      await emitter.emit({ type: EventType.ORDER_CREATED, timestamp: new Date(), data: {} })
      await emitter.emit({ type: EventType.CLIENT_CREATED, timestamp: new Date(), data: {} })
      await emitter.emit({ type: EventType.RECURRING_ORDER_CREATED, timestamp: new Date(), data: {} })
      
      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).not.toHaveBeenCalled()
      expect(handler3).not.toHaveBeenCalled()
    })

    it('should not throw when removing listeners from empty emitter', () => {
      expect(() => {
        emitter.removeAllListeners()
      }).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('should handle same handler registered multiple times', async () => {
      const handler = jest.fn()
      
      emitter.on(EventType.ORDER_CREATED, handler)
      emitter.on(EventType.ORDER_CREATED, handler)
      
      await emitter.emit({ type: EventType.ORDER_CREATED, timestamp: new Date(), data: {} })
      
      // Set should deduplicate, so handler called only once
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should handle complex event data', async () => {
      const handler = jest.fn()
      const complexData = {
        type: EventType.ORDER_CREATED,
        timestamp: new Date(),
        data: {
          order: {
            id: '123',
            items: [
              { productId: 'p1', quantity: 2 },
              { productId: 'p2', quantity: 5 }
            ]
          },
          client: {
            id: 'c1',
            name: 'Test Client'
          }
        }
      }
      
      emitter.on(EventType.ORDER_CREATED, handler)
      await emitter.emit(complexData)
      
      expect(handler).toHaveBeenCalledWith(complexData)
    })
  })
})
