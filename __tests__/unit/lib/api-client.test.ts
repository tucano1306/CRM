// __tests__/unit/lib/api-client.test.ts
import { Response } from 'node-fetch'
import {
  FetchTimeoutError,
  FetchRetryError,
  fetchWithTimeout,
  apiCall,
  getErrorMessage,
} from '@/lib/api-client'

// Mock fetch
global.fetch = jest.fn()

describe('api-client', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('FetchTimeoutError', () => {
    it('should create error with default message', () => {
      const error = new FetchTimeoutError()
      expect(error.message).toBe('Request timed out')
      expect(error.name).toBe('FetchTimeoutError')
      expect(error).toBeInstanceOf(Error)
    })

    it('should create error with custom message', () => {
      const error = new FetchTimeoutError('Custom timeout')
      expect(error.message).toBe('Custom timeout')
      expect(error.name).toBe('FetchTimeoutError')
    })
  })

  describe('FetchRetryError', () => {
    it('should create error with default message', () => {
      const error = new FetchRetryError()
      expect(error.message).toBe('All retry attempts failed')
      expect(error.name).toBe('FetchRetryError')
      expect(error).toBeInstanceOf(Error)
    })

    it('should create error with custom message', () => {
      const error = new FetchRetryError('Custom retry error')
      expect(error.message).toBe('Custom retry error')
      expect(error.name).toBe('FetchRetryError')
    })
  })

  describe('fetchWithTimeout', () => {
    it('should successfully fetch with default timeout', async () => {
      const mockResponse = new Response('OK', { status: 200 })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      const response = await fetchWithTimeout('https://api.example.com/test')
      
      expect(response).toBe(mockResponse)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should use custom timeout value', async () => {
      const mockResponse = new Response('OK', { status: 200 })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      const response = await fetchWithTimeout('https://api.example.com/test', {
        timeout: 10000,
      })
      
      expect(response).toBe(mockResponse)
    })

    it('should handle network error without retries', async () => {
      const error = new Error('Network error')
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(error)

      await expect(
        fetchWithTimeout('https://api.example.com/test')
      ).rejects.toThrow('Network error')
    })

    it('should retry on failure', async () => {
      const error = new Error('Network error')
      const mockResponse = new Response('OK', { status: 200 })
      
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResponse)

      const response = await fetchWithTimeout('https://api.example.com/test', {
        retries: 1,
        retryDelay: 10,
      })
      
      expect(response).toBe(mockResponse)
      expect(global.fetch).toHaveBeenCalledTimes(2)
    })

    it('should call onRetry callback on retry', async () => {
      const error = new Error('Network error')
      const mockResponse = new Response('OK', { status: 200 })
      const onRetry = jest.fn()
      
      ;(global.fetch as jest.Mock)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(mockResponse)

      await fetchWithTimeout('https://api.example.com/test', {
        retries: 1,
        retryDelay: 10,
        onRetry,
      })

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(1, error)
    })

    it('should throw error after all retries exhausted', async () => {
      const error = new Error('Network error')
      ;(global.fetch as jest.Mock).mockRejectedValue(error)

      await expect(
        fetchWithTimeout('https://api.example.com/test', {
          retries: 2,
          retryDelay: 10,
        })
      ).rejects.toThrow('Network error')

      expect(global.fetch).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('should pass through fetch options', async () => {
      const mockResponse = new Response('OK', { status: 200 })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      await fetchWithTimeout('https://api.example.com/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: 'data' }),
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ test: 'data' }),
        })
      )
    })
  })

  describe('apiCall', () => {
    it('should return success response for valid request', async () => {
      const mockData = { message: 'Success', id: 123 }
      const mockResponse = new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      const result = await apiCall('https://api.example.com/test')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockData)
      expect(result.status).toBe(200)
      expect(result.error).toBeUndefined()
    })

    it('should return error response for HTTP error', async () => {
      const mockError = { error: 'Not Found' }
      const mockResponse = new Response(JSON.stringify(mockError), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      const result = await apiCall('https://api.example.com/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Not Found')
      expect(result.status).toBe(404)
      expect(result.data).toBeUndefined()
    })

    it('should return generic HTTP error if no error message in response', async () => {
      const mockResponse = new Response(JSON.stringify({}), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      const result = await apiCall('https://api.example.com/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('HTTP 500')
      expect(result.status).toBe(500)
    })

    it('should handle timeout error', async () => {
      // Mock AbortError
      const abortError = new Error('Abort')
      abortError.name = 'AbortError'
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(abortError)

      const result = await apiCall('https://api.example.com/test', {
        timeout: 1000,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('tardó demasiado')
      expect(result.status).toBe(504)
    })

    it('should handle network error', async () => {
      const error = new Error('Network connection failed')
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(error)

      const result = await apiCall('https://api.example.com/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network connection failed')
      expect(result.status).toBe(500)
    })

    it('should handle unknown error', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce('Unknown error')

      const result = await apiCall('https://api.example.com/test')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Error desconocido')
      expect(result.status).toBe(500)
    })

    it('should pass options to fetchWithTimeout', async () => {
      const mockResponse = new Response(JSON.stringify({ ok: true }), {
        status: 200,
      })
      ;(global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

      await apiCall('https://api.example.com/test', {
        timeout: 3000,
        retries: 2,
        method: 'POST',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  describe('getErrorMessage', () => {
    it('should return timeout message for FetchTimeoutError', () => {
      const error = new FetchTimeoutError()
      const message = getErrorMessage(error)
      
      expect(message).toContain('⏱️')
      expect(message).toContain('tardando más')
    })

    it('should return retry message for FetchRetryError', () => {
      const error = new FetchRetryError()
      const message = getErrorMessage(error)
      
      expect(message).toContain('🔄')
      expect(message).toContain('varios intentos')
    })

    it('should return error message for standard Error', () => {
      const error = new Error('Custom error message')
      const message = getErrorMessage(error)
      
      expect(message).toBe('Custom error message')
    })

    it('should return generic message for unknown error', () => {
      const message = getErrorMessage('string error')
      
      expect(message).toBe('Ocurrió un error inesperado')
    })

    it('should return generic message for null/undefined', () => {
      expect(getErrorMessage(null)).toBe('Ocurrió un error inesperado')
      expect(getErrorMessage(undefined)).toBe('Ocurrió un error inesperado')
    })

    it('should return generic message for object without message', () => {
      const message = getErrorMessage({ code: 500 })
      
      expect(message).toBe('Ocurrió un error inesperado')
    })
  })
})
