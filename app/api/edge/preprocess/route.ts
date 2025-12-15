/**
 * Edge Function: Request Pre-processing & Validation
 * 
 * Runs on Vercel Edge Runtime for ultra-fast request preprocessing
 * Handles validation, rate limiting, request transformation, and security checks
 * 
 * Use Cases:
 * - Request validation and sanitization
 * - Rate limiting at the edge
 * - API request preprocessing
 * - Security header injection
 * - Request routing and transformation
 */

import { NextRequest, NextResponse } from 'next/server'

// Enable Edge Runtime
export const runtime = 'edge'

interface ValidationRule {
  field: string
  type: 'string' | 'number' | 'email' | 'phone' | 'uuid'
  required: boolean
  maxLength?: number
  minLength?: number
  pattern?: string
  allowedValues?: string[]
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator: 'ip' | 'user' | 'ip+user'
  skipSuccessful?: boolean
}

interface PreprocessingResult {
  valid: boolean
  errors?: string[]
  rateLimited?: boolean
  transformedData?: any
  metadata: {
    processingTime: number
    region: string
    checks: string[]
  }
}

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// API endpoint validation schemas
const VALIDATION_SCHEMAS: Record<string, ValidationRule[]> = {
  '/api/products': [
    { field: 'name', type: 'string', required: true, maxLength: 100, minLength: 2 },
    { field: 'price', type: 'number', required: true },
    { field: 'description', type: 'string', required: false, maxLength: 500 },
    { field: 'category', type: 'string', required: false, allowedValues: ['food', 'beverage', 'dessert'] }
  ],
  '/api/orders': [
    { field: 'customerId', type: 'uuid', required: true },
    { field: 'items', type: 'string', required: true }, // JSON array
    { field: 'totalAmount', type: 'number', required: true },
    { field: 'deliveryAddress', type: 'string', required: false, maxLength: 200 }
  ],
  '/api/users': [
    { field: 'email', type: 'email', required: true },
    { field: 'name', type: 'string', required: true, maxLength: 50, minLength: 2 },
    { field: 'phone', type: 'phone', required: false }
  ]
}

// Rate limiting configurations by endpoint
const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  '/api/auth': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    keyGenerator: 'ip'
  },
  '/api/orders': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyGenerator: 'ip+user'
  },
  '/api/products': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: 'ip',
    skipSuccessful: true
  },
  'default': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyGenerator: 'ip'
  }
}

/**
 * Validate string field
 */
function validateStringField(value: any, rule: ValidationRule): string[] {
  const errors: string[] = []
  
  if (typeof value !== 'string') {
    errors.push(`Field ${rule.field} must be a string`)
    return errors
  }
  
  if (rule.minLength && value.length < rule.minLength) {
    errors.push(`Field ${rule.field} must be at least ${rule.minLength} characters`)
  }
  if (rule.maxLength && value.length > rule.maxLength) {
    errors.push(`Field ${rule.field} must be at most ${rule.maxLength} characters`)
  }
  if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
    errors.push(`Field ${rule.field} format is invalid`)
  }
  if (rule.allowedValues && !rule.allowedValues.includes(value)) {
    errors.push(`Field ${rule.field} must be one of: ${rule.allowedValues.join(', ')}`)
  }
  
  return errors
}

/**
 * Validate number field
 */
function validateNumberField(value: any, rule: ValidationRule): string[] {
  const numValue = typeof value === 'string' ? Number.parseFloat(value) : value
  if (typeof numValue !== 'number' || Number.isNaN(numValue)) {
    return [`Field ${rule.field} must be a valid number`]
  }
  return []
}

/**
 * Validate email field
 */
function validateEmailField(value: any, rule: ValidationRule): string[] {
  if (typeof value !== 'string') {
    return [`Field ${rule.field} must be a string`]
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    return [`Field ${rule.field} must be a valid email address`]
  }
  return []
}

/**
 * Validate phone field
 */
function validatePhoneField(value: any, rule: ValidationRule): string[] {
  if (typeof value !== 'string') {
    return [`Field ${rule.field} must be a string`]
  }
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/
  if (!phoneRegex.test(value)) {
    return [`Field ${rule.field} must be a valid phone number`]
  }
  return []
}

/**
 * Validate UUID field
 */
function validateUuidField(value: any, rule: ValidationRule): string[] {
  if (typeof value !== 'string') {
    return [`Field ${rule.field} must be a string`]
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    return [`Field ${rule.field} must be a valid UUID`]
  }
  return []
}

/**
 * Validate field based on type and rules
 */
function validateField(value: any, rule: ValidationRule): string[] {
  // Required check
  if (rule.required && (value === undefined || value === null || value === '')) {
    return [`Field ${rule.field} is required`]
  }

  // Skip validation if field is not provided and not required
  if (!rule.required && (value === undefined || value === null)) {
    return []
  }

  // Type validation using helper functions
  switch (rule.type) {
    case 'string':
      return validateStringField(value, rule)
    case 'number':
      return validateNumberField(value, rule)
    case 'email':
      return validateEmailField(value, rule)
    case 'phone':
      return validatePhoneField(value, rule)
    case 'uuid':
      return validateUuidField(value, rule)
    default:
      return []
  }
}

/**
 * Generate rate limit key based on configuration
 */
function generateRateLimitKey(request: NextRequest, config: RateLimitConfig): string {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
            request.headers.get('x-real-ip') || 
            'unknown'
  const userId = request.headers.get('x-user-id') || 'anonymous'

  switch (config.keyGenerator) {
    case 'ip':
      return `rate_limit:${ip}`
    case 'user':
      return `rate_limit:${userId}`
    case 'ip+user':
      return `rate_limit:${ip}:${userId}`
    default:
      return `rate_limit:${ip}`
  }
}

/**
 * Check rate limit for request
 */
function checkRateLimit(request: NextRequest, endpoint: string): { allowed: boolean; resetTime?: number } {
  const config = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default
  const key = generateRateLimitKey(request, config)
  const now = Date.now()

  const existing = rateLimitStore.get(key)
  
  if (!existing || now > existing.resetTime) {
    // New window or expired window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs
    })
    return { allowed: true }
  }

  if (existing.count >= config.maxRequests) {
    return { 
      allowed: false, 
      resetTime: existing.resetTime 
    }
  }

  // Increment count
  existing.count++
  rateLimitStore.set(key, existing)
  
  return { allowed: true }
}

/**
 * Sanitize and transform input data
 */
function transformData(data: any, endpoint: string): any {
  // Basic sanitization
  if (typeof data === 'object' && data !== null) {
    const transformed: any = {}
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Trim whitespace and remove potential XSS
        transformed[key] = value.trim().replaceAll(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      } else {
        transformed[key] = value
      }
    }

    // Endpoint-specific transformations
    switch (endpoint) {
      case '/api/products':
        if (transformed.price) {
          transformed.price = Number.parseFloat(transformed.price)
        }
        break
      
      case '/api/orders':
        if (transformed.items && typeof transformed.items === 'string') {
          try {
            transformed.items = JSON.parse(transformed.items)
          } catch {
            // Keep as string if JSON parsing fails
          }
        }
        if (transformed.totalAmount) {
          transformed.totalAmount = Number.parseFloat(transformed.totalAmount)
        }
        break
    }

    return transformed
  }

  return data
}

/**
 * Build metadata object for response
 */
function buildMetadata(startTime: number, checks: string[]) {
  return {
    processingTime: Date.now() - startTime,
    region: process.env.VERCEL_REGION || 'unknown',
    checks
  }
}

/**
 * Create rate limit exceeded response
 */
function createRateLimitResponse(startTime: number, checks: string[], resetTime?: number) {
  return NextResponse.json(
    {
      valid: false,
      rateLimited: true,
      errors: ['Rate limit exceeded'],
      resetTime,
      metadata: buildMetadata(startTime, checks)
    } as PreprocessingResult,
    { 
      status: 429,
      headers: {
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': resetTime?.toString() || '',
        'X-Runtime': 'edge'
      }
    }
  )
}

/**
 * Create JSON parse error response
 */
function createJsonParseErrorResponse(startTime: number, checks: string[]) {
  return NextResponse.json(
    {
      valid: false,
      errors: ['Invalid JSON format'],
      metadata: buildMetadata(startTime, checks)
    } as PreprocessingResult,
    { status: 400 }
  )
}

/**
 * Validate request data against rules
 */
function validateRequestData(requestData: any, validationRules: ValidationRule[] | undefined): string[] {
  const errors: string[] = []
  if (validationRules && requestData) {
    for (const rule of validationRules) {
      const fieldErrors = validateField(requestData[rule.field], rule)
      errors.push(...fieldErrors)
    }
  }
  return errors
}

/**
 * Check for automated/bot requests
 */
function checkBotRequest(userAgent: string): string | null {
  if (userAgent.toLowerCase().includes('bot') && !userAgent.includes('googlebot')) {
    return 'Automated requests not allowed'
  }
  return null
}

/**
 * Create preprocessing result response
 */
function createPreprocessingResponse(
  startTime: number,
  checks: string[],
  errors: string[],
  transformedData: any
) {
  const result: PreprocessingResult = {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    transformedData: errors.length === 0 ? transformedData : undefined,
    metadata: buildMetadata(startTime, checks)
  }

  return NextResponse.json(result, {
    status: errors.length > 0 ? 400 : 200,
    headers: {
      'Cache-Control': 'no-cache',
      'X-Edge-Region': process.env.VERCEL_REGION || 'unknown',
      'X-Processing-Time': `${Date.now() - startTime}ms`,
      'X-Runtime': 'edge',
      'X-Validation-Checks': checks.join(',')
    }
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const checks: string[] = []
  
  try {
    // Extract target endpoint from headers or body
    const targetEndpoint = request.headers.get('x-target-endpoint') || '/api/unknown'
    const contentType = request.headers.get('content-type') || ''

    checks.push('endpoint-detection')

    // Rate limiting check
    const rateLimitResult = checkRateLimit(request, targetEndpoint)
    checks.push('rate-limit')

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(startTime, checks, rateLimitResult.resetTime)
    }

    // Parse request body if JSON
    let requestData: any = null
    if (contentType.includes('application/json')) {
      try {
        requestData = await request.json()
        checks.push('json-parsing')
      } catch (error) {
        console.error('Failed to parse JSON request body:', error)
        return createJsonParseErrorResponse(startTime, checks)
      }
    }

    // Validation
    const validationRules = VALIDATION_SCHEMAS[targetEndpoint]
    checks.push('validation')
    const errors = validateRequestData(requestData, validationRules)

    // Data transformation
    let transformedData = requestData
    if (requestData && errors.length === 0) {
      transformedData = transformData(requestData, targetEndpoint)
      checks.push('transformation')
    }

    // Security checks
    const userAgent = request.headers.get('user-agent') || ''
    const botError = checkBotRequest(userAgent)
    if (botError) {
      errors.push(botError)
    }
    checks.push('security')

    return createPreprocessingResponse(startTime, checks, errors, transformedData)

  } catch (error) {
    console.error('[EDGE-PREPROCESS] Error:', error)
    
    return NextResponse.json(
      {
        valid: false,
        errors: ['Request preprocessing failed'],
        metadata: {
          processingTime: Date.now() - startTime,
          region: process.env.VERCEL_REGION || 'unknown',
          checks
        }
      } as PreprocessingResult,
      { 
        status: 500,
        headers: {
          'X-Edge-Region': process.env.VERCEL_REGION || 'unknown',
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'X-Runtime': 'edge'
        }
      }
    )
  }
}

/**
 * GET: Health check and configuration info
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const endpoint = new URL(request.url).searchParams.get('endpoint')
    
    if (endpoint) {
      // Return configuration for specific endpoint
      const validation = VALIDATION_SCHEMAS[endpoint]
      const rateLimit = RATE_LIMIT_CONFIGS[endpoint] || RATE_LIMIT_CONFIGS.default
      
      return NextResponse.json({
        endpoint,
        validation: validation || null,
        rateLimit,
        available: true
      })
    }

    // Return general health and stats
    return NextResponse.json({
      status: 'healthy',
      availableEndpoints: Object.keys(VALIDATION_SCHEMAS),
      rateLimitEntries: rateLimitStore.size,
      region: process.env.VERCEL_REGION || 'unknown',
      runtime: 'edge',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('[EDGE-PREPROCESS] GET Error:', error)
    
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Health check failed',
        timestamp: Date.now()
      },
      { 
        status: 500,
        headers: {
          'X-Processing-Time': `${Date.now() - startTime}ms`,
          'X-Runtime': 'edge'
        }
      }
    )
  }
}

/**
 * Clean up expired rate limit entries (called periodically)
 */
function cleanupRateLimits() {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000)