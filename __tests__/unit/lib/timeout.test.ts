import {
  TimeoutError,
  withTimeout,
  withPrismaTimeout,
  handleTimeoutError,
  withApiTimeout,
} from '@/lib/timeout'

describe('Timeout Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    ;(console.warn as jest.Mock).mockRestore()
    ;(console.error as jest.Mock).mockRestore()
  })

  describe('TimeoutError', () => {
    it('should create TimeoutError with default message', () => {
      const error = new TimeoutError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(TimeoutError)
      expect(error.name).toBe('TimeoutError')
      expect(error.message).toBe('Request timed out')
    })

    it('should create TimeoutError with custom message', () => {
      const error = new TimeoutError('Custom timeout message')

      expect(error.message).toBe('Custom timeout message')
      expect(error.name).toBe('TimeoutError')
    })
  })

  describe('withTimeout', () => {
    it('should resolve when promise completes before timeout', async () => {
      const fastPromise = Promise.resolve('success')

      const result = await withTimeout(fastPromise, 1000)

      expect(result).toBe('success')
    })

    it('should reject with TimeoutError when promise takes too long', async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(() => resolve('too late'), 2000)
      })

      await expect(withTimeout(slowPromise, 100)).rejects.toThrow(TimeoutError)
      await expect(withTimeout(slowPromise, 100)).rejects.toThrow('Request timed out')
    })

    it('should use default timeout of 5000ms', async () => {
      const promise = Promise.resolve('data')

      const result = await withTimeout(promise)

      expect(result).toBe('data')
    })

    it('should reject with original error if promise fails before timeout', async () => {
      const errorPromise = Promise.reject(new Error('Original error'))

      await expect(withTimeout(errorPromise, 1000)).rejects.toThrow('Original error')
    })

    it('should handle resolved promises with different data types', async () => {
      const numberPromise = Promise.resolve(42)
      const objectPromise = Promise.resolve({ key: 'value' })
      const arrayPromise = Promise.resolve([1, 2, 3])

      expect(await withTimeout(numberPromise, 1000)).toBe(42)
      expect(await withTimeout(objectPromise, 1000)).toEqual({ key: 'value' })
      expect(await withTimeout(arrayPromise, 1000)).toEqual([1, 2, 3])
    })
  })

  describe('withPrismaTimeout', () => {
    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('result')

      const result = await withPrismaTimeout(operation, 1000)

      expect(result).toBe('result')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should log warning for slow operations (>3s)', async () => {
      const slowOperation = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('slow result'), 3100))
      )

      await withPrismaTimeout(slowOperation, 5000)

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Slow database operation')
      )
    })

    it('should not log warning for fast operations (<3s)', async () => {
      const fastOperation = jest.fn().mockResolvedValue('fast result')

      await withPrismaTimeout(fastOperation, 5000)

      expect(console.warn).not.toHaveBeenCalled()
    })

    it('should throw TimeoutError and log when operation times out', async () => {
      const slowOperation = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('too late'), 2000))
      )

      await expect(withPrismaTimeout(slowOperation, 100)).rejects.toThrow(TimeoutError)
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Database operation timeout')
      )
    })

    it('should rethrow non-timeout errors', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('DB Error'))

      await expect(withPrismaTimeout(failingOperation, 1000)).rejects.toThrow('DB Error')
      expect(console.error).not.toHaveBeenCalled()
    })

    it('should use default timeout of 5000ms', async () => {
      const operation = jest.fn().mockResolvedValue('data')

      await withPrismaTimeout(operation)

      expect(operation).toHaveBeenCalled()
    })
  })

  describe('handleTimeoutError', () => {
    it('should return 504 response for TimeoutError', () => {
      const error = new TimeoutError()

      const response = handleTimeoutError(error)

      expect(response).toEqual({
        error: 'La operación tardó demasiado tiempo. Por favor, intenta de nuevo.',
        code: 'TIMEOUT_ERROR',
        status: 504,
      })
    })

    it('should return 500 response for non-timeout errors', () => {
      const error = new Error('Some other error')

      const response = handleTimeoutError(error)

      expect(response).toEqual({
        error: 'Error interno del servidor',
        code: 'INTERNAL_ERROR',
        status: 500,
      })
    })

    it('should handle unknown error types', () => {
      const response = handleTimeoutError('string error')

      expect(response.status).toBe(500)
      expect(response.code).toBe('INTERNAL_ERROR')
    })

    it('should handle null/undefined errors', () => {
      expect(handleTimeoutError(null).status).toBe(500)
      expect(handleTimeoutError(undefined).status).toBe(500)
    })
  })

  describe('withApiTimeout', () => {
    it('should execute handler successfully', async () => {
      const handler = jest.fn().mockResolvedValue({ data: 'success' })

      const result = await withApiTimeout(handler, 1000)

      expect(result).toEqual({ data: 'success' })
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should reject with TimeoutError when handler is slow', async () => {
      const slowHandler = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('late'), 2000))
      )

      await expect(withApiTimeout(slowHandler, 100)).rejects.toThrow(TimeoutError)
    })

    it('should use default timeout of 5000ms', async () => {
      const handler = jest.fn().mockResolvedValue('response')

      await withApiTimeout(handler)

      expect(handler).toHaveBeenCalled()
    })

    it('should propagate handler errors', async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error('Handler failed'))

      await expect(withApiTimeout(errorHandler, 1000)).rejects.toThrow('Handler failed')
    })
  })
})
