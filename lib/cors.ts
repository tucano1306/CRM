/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * Configura headers CORS para permitir peticiones desde orígenes específicos
 * Incluye soporte para credenciales, métodos y headers personalizados
 */

export interface CorsOptions {
  origin?: string | string[] | ((origin: string) => boolean)
  methods?: string[]
  allowedHeaders?: string[]
  exposedHeaders?: string[]
  credentials?: boolean
  maxAge?: number
}

const DEFAULT_CORS_OPTIONS: CorsOptions = {
  // Orígenes permitidos (ajusta según tu entorno)
  origin: process.env.NODE_ENV === 'production'
    ? [
        process.env.NEXT_PUBLIC_APP_URL || '',
        'https://your-production-domain.com'
      ].filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  
  // Métodos HTTP permitidos
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  // Headers permitidos en requests
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'X-CSRF-Token',
    'X-Idempotency-Key'
  ],
  
  // Headers expuestos en responses
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Retry-After'
  ],
  
  // Permitir credenciales (cookies, auth headers)
  credentials: true,
  
  // Tiempo de cache para preflight requests (en segundos)
  maxAge: 86400 // 24 horas
}

/**
 * Verifica si el origen está permitido
 */
function isOriginAllowed(origin: string | undefined, allowedOrigins: CorsOptions['origin']): boolean {
  // Si no hay origen (same-origin request), permitir
  if (!origin) return true

  // Si allowedOrigins es un array
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.includes(origin)
  }

  // Si allowedOrigins es una función
  if (typeof allowedOrigins === 'function') {
    return allowedOrigins(origin)
  }

  // Si allowedOrigins es un string
  if (typeof allowedOrigins === 'string') {
    return allowedOrigins === origin || allowedOrigins === '*'
  }

  // Por defecto, denegar
  return false
}

/**
 * Genera los headers CORS para una respuesta
 */
export function getCorsHeaders(
  requestOrigin: string | null,
  options: CorsOptions = DEFAULT_CORS_OPTIONS
): HeadersInit {
  const headers: HeadersInit = {}
  const origin = requestOrigin || ''

  // Merge con opciones por defecto
  const config = { ...DEFAULT_CORS_OPTIONS, ...options }

  // Access-Control-Allow-Origin
  if (isOriginAllowed(origin, config.origin)) {
    // Si el origen está permitido, usarlo específicamente (más seguro que *)
    headers['Access-Control-Allow-Origin'] = origin || '*'
  } else if (config.origin === '*') {
    headers['Access-Control-Allow-Origin'] = '*'
  }

  // Access-Control-Allow-Methods
  if (config.methods && config.methods.length > 0) {
    headers['Access-Control-Allow-Methods'] = config.methods.join(', ')
  }

  // Access-Control-Allow-Headers
  if (config.allowedHeaders && config.allowedHeaders.length > 0) {
    headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ')
  }

  // Access-Control-Expose-Headers
  if (config.exposedHeaders && config.exposedHeaders.length > 0) {
    headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ')
  }

  // Access-Control-Allow-Credentials
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  // Access-Control-Max-Age
  if (config.maxAge) {
    headers['Access-Control-Max-Age'] = config.maxAge.toString()
  }

  return headers
}

/**
 * Maneja requests OPTIONS (preflight)
 * Retorna una Response con headers CORS apropiados
 */
export function handleCorsPreflightRequest(
  request: Request,
  options: CorsOptions = DEFAULT_CORS_OPTIONS
): Response {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, options)

  return new Response(null, {
    status: 204, // No Content
    headers: corsHeaders
  })
}

/**
 * Agrega headers CORS a una Response existente
 */
export function addCorsHeaders(
  response: Response,
  request: Request,
  options: CorsOptions = DEFAULT_CORS_OPTIONS
): Response {
  const origin = request.headers.get('origin')
  const corsHeaders = getCorsHeaders(origin, options)

  // Crear nueva Response con headers CORS
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers)
  })

  // Agregar headers CORS
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newResponse.headers.set(key, value)
  })

  return newResponse
}

/**
 * Configuraciones CORS predefinidas para diferentes contextos
 */
export const corsConfigs = {
  // CORS público - permite cualquier origen (usar con cuidado)
  public: {
    origin: '*',
    credentials: false
  } as CorsOptions,

  // CORS estricto - solo orígenes específicos con credenciales
  strict: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    credentials: true
  } as CorsOptions,

  // CORS para APIs públicas sin autenticación
  publicApi: {
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
  } as CorsOptions,

  // CORS para webhooks (permite orígenes específicos de servicios)
  webhook: {
    origin: (origin: string) => {
      const allowedDomains = [
        'svix.com',
        'stripe.com',
        'clerk.dev'
      ]
      return allowedDomains.some(domain => origin.includes(domain))
    },
    credentials: false,
    methods: ['POST']
  } as CorsOptions
}
