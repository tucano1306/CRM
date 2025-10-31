/// <reference types="jest" />
import { Request } from 'node-fetch'
import {
  RateLimiter,
  getClientIp,
  createRateLimitKey,
  RateLimitConfig
} from '@/lib/rateLimit'

// Mock console methods to avoid noise in tests
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation()
  jest.spyOn(console, 'log').mockImplementation()
})

afterAll(() => {
  jest.restoreAllMocks()
})

describe('RateLimiter', () => {
  let limiter: RateLimiter
  const config: RateLimitConfig = {
    windowMs: 1000, // 1 second for testing
    maxRequests: 3,
    blockDurationMs: 2000 // 2 seconds block
  }

  beforeEach(() => {
    limiter = new RateLimiter(config)
    jest.clearAllMocks()
  })

  afterEach(() => {
    limiter.clear()
  })

  describe('check', () => {
    it('should allow requests within limit', () => {
      const result1 = limiter.check('test-key')
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(2) // 3 - 1
      expect(result1.blocked).toBe(false)

      const result2 = limiter.check('test-key')
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(1) // 3 - 2
      expect(result2.blocked).toBe(false)

      const result3 = limiter.check('test-key')
      expect(result3.allowed).toBe(true)
      expect(result3.remaining).toBe(0) // 3 - 3
      expect(result3.blocked).toBe(false)
    })

    it('should block requests when limit is exceeded', () => {
      // Use up all allowed requests
      limiter.check('test-key') // 1
      limiter.check('test-key') // 2
      limiter.check('test-key') // 3

      // Next request should be blocked
      const result = limiter.check('test-key') // 4
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.blocked).toBe(true)
    })

    it('should handle multiple keys independently', () => {
      limiter.check('key1')
      limiter.check('key1')
      limiter.check('key1')

      const result1 = limiter.check('key1')
      expect(result1.allowed).toBe(false) // key1 exceeded

      const result2 = limiter.check('key2')
      expect(result2.allowed).toBe(true) // key2 is fresh
      expect(result2.remaining).toBe(2)
    })

    it('should reset window after windowMs expires', async () => {
      // Use up all requests
      limiter.check('test-key')
      limiter.check('test-key')
      limiter.check('test-key')

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should allow new requests
      const result = limiter.check('test-key')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
      expect(result.blocked).toBe(false)
    })

    it('should maintain block until blockDurationMs expires', async () => {
      // Exceed limit
      limiter.check('test-key')
      limiter.check('test-key')
      limiter.check('test-key')
      limiter.check('test-key') // Blocked

      // Still blocked after window expires but before block expires
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      const result1 = limiter.check('test-key')
      expect(result1.allowed).toBe(false)
      expect(result1.blocked).toBe(true)

      // Wait for block to expire
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Should be allowed after block expires
      const result2 = limiter.check('test-key')
      expect(result2.allowed).toBe(true)
      expect(result2.blocked).toBe(false)
    })

    it('should include resetTime in response', () => {
      const result = limiter.check('test-key')
      expect(result.resetTime).toBeGreaterThan(Date.now())
      expect(result.resetTime).toBeLessThanOrEqual(Date.now() + config.windowMs)
    })

    it('should log warning when blocking', () => {
      limiter.check('test-key')
      limiter.check('test-key')
      limiter.check('test-key')
      limiter.check('test-key') // Should trigger block

      expect(console.warn).toHaveBeenCalled()
    })
  })

  describe('getStats', () => {
    it('should return correct stats for empty store', () => {
      const stats = limiter.getStats()
      expect(stats.totalEntries).toBe(0)
      expect(stats.blockedEntries).toBe(0)
      expect(stats.activeEntries).toBe(0)
    })

    it('should count total entries', () => {
      limiter.check('key1')
      limiter.check('key2')
      limiter.check('key3')

      const stats = limiter.getStats()
      expect(stats.totalEntries).toBe(3)
    })

    it('should count blocked entries', () => {
      // Block key1
      limiter.check('key1')
      limiter.check('key1')
      limiter.check('key1')
      limiter.check('key1') // Blocked

      // key2 not blocked
      limiter.check('key2')

      const stats = limiter.getStats()
      expect(stats.totalEntries).toBe(2)
      expect(stats.blockedEntries).toBe(1)
      expect(stats.activeEntries).toBe(2)
    })

    it('should count active entries', () => {
      limiter.check('key1')
      limiter.check('key2')

      const stats = limiter.getStats()
      expect(stats.activeEntries).toBe(2)
    })
  })

  describe('unblock', () => {
    it('should unblock a blocked key', () => {
      // Block the key
      limiter.check('test-key')
      limiter.check('test-key')
      limiter.check('test-key')
      limiter.check('test-key') // Blocked

      // Verify blocked
      let result = limiter.check('test-key')
      expect(result.blocked).toBe(true)

      // Unblock
      const unblocked = limiter.unblock('test-key')
      expect(unblocked).toBe(true)

      // Verify unblocked
      result = limiter.check('test-key')
      expect(result.allowed).toBe(true)
      expect(result.blocked).toBe(false)
    })

    it('should return false when unblocking non-blocked key', () => {
      limiter.check('test-key')

      const unblocked = limiter.unblock('test-key')
      expect(unblocked).toBe(false)
    })

    it('should return false when unblocking non-existent key', () => {
      const unblocked = limiter.unblock('non-existent')
      expect(unblocked).toBe(false)
    })

    it('should log when unblocking', () => {
      // Block the key
      limiter.check('test-key')
      limiter.check('test-key')
      limiter.check('test-key')
      limiter.check('test-key')

      limiter.unblock('test-key')
      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('reset', () => {
    it('should remove key from store', () => {
      limiter.check('test-key')
      
      let stats = limiter.getStats()
      expect(stats.totalEntries).toBe(1)

      limiter.reset('test-key')

      stats = limiter.getStats()
      expect(stats.totalEntries).toBe(0)
    })

    it('should allow fresh requests after reset', () => {
      // Use up all requests
      limiter.check('test-key')
      limiter.check('test-key')
      limiter.check('test-key')

      // Reset
      limiter.reset('test-key')

      // Should allow full quota again
      const result = limiter.check('test-key')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })
  })

  describe('clear', () => {
    it('should remove all entries from store', () => {
      limiter.check('key1')
      limiter.check('key2')
      limiter.check('key3')

      let stats = limiter.getStats()
      expect(stats.totalEntries).toBe(3)

      limiter.clear()

      stats = limiter.getStats()
      expect(stats.totalEntries).toBe(0)
    })

    it('should log when clearing', () => {
      limiter.clear()
      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('Edge cases', () => {
    it('should handle rapid successive requests', () => {
      const results = []
      for (let i = 0; i < 10; i++) {
        results.push(limiter.check('test-key'))
      }

      // First 3 should be allowed
      expect(results[0].allowed).toBe(true)
      expect(results[1].allowed).toBe(true)
      expect(results[2].allowed).toBe(true)

      // Rest should be blocked
      expect(results[3].allowed).toBe(false)
      expect(results[9].allowed).toBe(false)
    })

    it('should handle empty key string', () => {
      const result = limiter.check('')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it('should handle very long keys', () => {
      const longKey = 'a'.repeat(1000)
      const result = limiter.check(longKey)
      expect(result.allowed).toBe(true)
    })

    it('should handle special characters in keys', () => {
      const specialKey = 'user:123@example.com|ip:192.168.1.1'
      const result = limiter.check(specialKey)
      expect(result.allowed).toBe(true)
    })
  })
})

describe('getClientIp', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' }
    }) as any

    const ip = getClientIp(request)
    expect(ip).toBe('192.168.1.1')
  })

  it('should extract IP from x-real-ip header', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-real-ip': '192.168.1.2' }
    }) as any

    const ip = getClientIp(request)
    expect(ip).toBe('192.168.1.2')
  })

  it('should extract IP from cf-connecting-ip header (Cloudflare)', () => {
    const request = new Request('http://localhost', {
      headers: { 'cf-connecting-ip': '192.168.1.3' }
    }) as any

    const ip = getClientIp(request)
    expect(ip).toBe('192.168.1.3')
  })

  it('should prioritize x-forwarded-for over other headers', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2',
        'cf-connecting-ip': '192.168.1.3'
      }
    }) as any

    const ip = getClientIp(request)
    expect(ip).toBe('192.168.1.1')
  })

  it('should return "unknown" when no IP headers present', () => {
    const request = new Request('http://localhost') as any

    const ip = getClientIp(request)
    expect(ip).toBe('unknown')
  })

  it('should handle empty x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '' }
    }) as any

    const ip = getClientIp(request)
    expect(ip).toBe('unknown')
  })

  it('should trim whitespace from IP', () => {
    const request = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1' }
    }) as any

    const ip = getClientIp(request)
    expect(ip).toBe('192.168.1.1')
  })
})

describe('createRateLimitKey', () => {
  it('should create key from userId', () => {
    const key = createRateLimitKey('user123')
    expect(key).toBe('user:user123')
  })

  it('should create key from IP when no userId', () => {
    const key = createRateLimitKey(null, '192.168.1.1')
    expect(key).toBe('ip:192.168.1.1')
  })

  it('should prioritize userId over IP', () => {
    const key = createRateLimitKey('user123', '192.168.1.1')
    expect(key).toBe('user:user123')
  })

  it('should return "anonymous" when neither userId nor IP provided', () => {
    const key = createRateLimitKey()
    expect(key).toBe('anonymous')
  })

  it('should return "anonymous" when both are empty', () => {
    const key = createRateLimitKey('', '')
    expect(key).toBe('anonymous')
  })

  it('should handle null userId', () => {
    const key = createRateLimitKey(null, '192.168.1.1')
    expect(key).toBe('ip:192.168.1.1')
  })

  it('should handle undefined userId', () => {
    const key = createRateLimitKey(undefined, '192.168.1.1')
    expect(key).toBe('ip:192.168.1.1')
  })
})

describe('RateLimiter - Cleanup', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should clean up expired entries automatically', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    const config: RateLimitConfig = {
      windowMs: 1000,
      maxRequests: 3,
      blockDurationMs: 2000
    }
    const limiter = new RateLimiter(config)

    // Make some requests
    limiter.check('test-key-1')
    limiter.check('test-key-2')

    // Advance time past window expiry
    jest.advanceTimersByTime(2000)

    // Trigger cleanup by advancing to interval
    jest.advanceTimersByTime(60000)

    // Cleanup should have logged
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
    limiter.clear()
  })

  it('should clean up blocked entries after block expires', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    const config: RateLimitConfig = {
      windowMs: 1000,
      maxRequests: 2,
      blockDurationMs: 3000
    }
    const limiter = new RateLimiter(config)

    // Exceed limit to get blocked
    limiter.check('blocked-key')
    limiter.check('blocked-key')
    limiter.check('blocked-key') // This blocks

    // Advance time past block duration
    jest.advanceTimersByTime(4000)

    // Trigger cleanup
    jest.advanceTimersByTime(60000)

    // Cleanup should have occurred
    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
    limiter.clear()
  })

  it('should only clean expired entries, not active ones', () => {
    const config: RateLimitConfig = {
      windowMs: 5000, // 5 seconds
      maxRequests: 3,
      blockDurationMs: 2000
    }
    const limiter = new RateLimiter(config)

    // Create entry that won't expire soon
    limiter.check('active-key')

    // Create entry that will expire
    const oldLimiter = new RateLimiter({
      windowMs: 100, // Very short window
      maxRequests: 1,
      blockDurationMs: 100
    })
    oldLimiter.check('expired-key')

    // Advance time slightly (active entry still valid, expired entry should be cleaned)
    jest.advanceTimersByTime(1000)

    // The active key should still work
    const result = limiter.check('active-key')
    expect(result.allowed).toBe(true)

    limiter.clear()
    oldLimiter.clear()
  })
})
