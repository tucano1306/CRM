/**
 * Schemas de validación con Zod
 * Validación type-safe de inputs en API routes
 */

import { z } from 'zod'

// ============================================================================
// SCHEMAS DE AUTENTICACIÓN
// ============================================================================

export const signInSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Password debe tener al menos 8 caracteres'),
})

export const signUpSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Password debe tener al menos 8 caracteres'),
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  phone: z.string().optional(),
  role: z.enum(['CLIENT', 'SELLER', 'ADMIN']).default('CLIENT'),
})

// ============================================================================
// SCHEMAS DE CLIENTE
// ============================================================================

export const createClientSchema = z.object({
  name: z.string().min(2, 'Nombre es requerido (mínimo 2 caracteres)'),
  businessName: z.string().optional(),
  address: z.string().min(5, 'Dirección es requerida (mínimo 5 caracteres)'),
  phone: z.string()
    .min(8, 'Teléfono es requerido (mínimo 8 dígitos)')
    .regex(/^[0-9+\-\s()]+$/, 'Teléfono debe contener solo números, +, -, (), espacios'),
  email: z.string().email('Email inválido'),
  sellerId: z.string().uuid('Seller ID debe ser un UUID válido').optional(),
  orderConfirmationEnabled: z.boolean().default(true),
  orderConfirmationMethod: z.enum(['MANUAL', 'AUTOMATIC']).default('MANUAL'),
  notificationsEnabled: z.boolean().default(true),
})

export const updateClientSchema = createClientSchema.partial()

// ============================================================================
// SCHEMAS DE PRODUCTO
// ============================================================================

export const createProductSchema = z.object({
  name: z.string().min(2, 'Nombre del producto es requerido'),
  description: z.string().optional(),
  unit: z.enum(['case', 'unit', 'kg', 'lb', 'box', 'pack'], {
    message: 'Unidad debe ser: case, unit, kg, lb, box, o pack'
  }).default('case'),
  price: z.number()
    .positive('Precio debe ser mayor a 0')
    .max(999999, 'Precio máximo: 999,999'),
  stock: z.number()
    .int('Stock debe ser un número entero')
    .min(0, 'Stock no puede ser negativo')
    .max(999999, 'Stock máximo: 999,999'),
  sku: z.string().optional(),
  imageUrl: z.string().url('URL de imagen inválida').optional().or(z.literal('')),
  isActive: z.boolean().default(true),
})

export const updateProductSchema = createProductSchema.partial()

// ============================================================================
// SCHEMAS DE ORDEN
// ============================================================================

export const createOrderSchema = z.object({
  clientId: z.string().uuid('Client ID debe ser un UUID válido').optional(),
  sellerId: z.string().uuid('Seller ID debe ser un UUID válido').optional(),
  notes: z.string().max(500, 'Notas no pueden exceder 500 caracteres').optional(),
  idempotencyKey: z.string().uuid('Idempotency key debe ser un UUID válido').optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PLACED', 'CONFIRMED', 'CANCELED', 'COMPLETED'], {
    message: 'Status inválido'
  }),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid().optional(),
})

export const cancelOrderSchema = z.object({
  reason: z.string()
    .min(10, 'Razón de cancelación debe tener al menos 10 caracteres')
    .max(500, 'Razón no puede exceder 500 caracteres'),
})

// ============================================================================
// SCHEMAS DE CARRITO
// ============================================================================

export const addToCartSchema = z.object({
  productId: z.string().uuid('Product ID debe ser un UUID válido'),
  quantity: z.number()
    .int('Cantidad debe ser un número entero')
    .positive('Cantidad debe ser mayor a 0')
    .max(1000, 'Cantidad máxima: 1,000 unidades'),
})

export const updateCartItemSchema = z.object({
  quantity: z.number()
    .int('Cantidad debe ser un número entero')
    .min(0, 'Cantidad no puede ser negativa')
    .max(1000, 'Cantidad máxima: 1,000 unidades'),
})

// ============================================================================
// SCHEMAS DE CHAT
// ============================================================================

export const sendChatMessageSchema = z.object({
  receiverId: z.string()
    .min(1, 'Receiver ID es requerido')
    .regex(/^user_[a-zA-Z0-9]+$/, 'Receiver ID debe tener formato: user_xxx'),
  message: z.string()
    .min(1, 'Mensaje no puede estar vacío')
    .max(1000, 'Mensaje no puede exceder 1,000 caracteres')
    .trim(),
  orderId: z.string().uuid('Order ID debe ser un UUID válido').optional(),
  idempotencyKey: z.string().uuid('Idempotency key debe ser un UUID válido').optional(),
})

export const markMessagesReadSchema = z.object({
  messageIds: z.array(z.string().uuid('Message ID debe ser un UUID válido'))
    .min(1, 'Debe proporcionar al menos un message ID'),
})

// ============================================================================
// SCHEMAS DE SCHEDULE
// ============================================================================

export const createChatScheduleSchema = z.object({
  sellerId: z.string().uuid('Seller ID debe ser un UUID válido'),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'], {
    message: 'Día de la semana inválido'
  }),
  startTime: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de inicio debe tener formato HH:MM (24h)'),
  endTime: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de fin debe tener formato HH:MM (24h)'),
  isActive: z.boolean().default(true),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'Hora de inicio debe ser menor a hora de fin', path: ['endTime'] }
)

export const updateChatScheduleSchema = createChatScheduleSchema.partial()

export const createOrderScheduleSchema = z.object({
  sellerId: z.string().uuid('Seller ID debe ser un UUID válido'),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'], {
    message: 'Día de la semana inválido'
  }),
  startTime: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de inicio debe tener formato HH:MM (24h)'),
  endTime: z.string()
    .regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Hora de fin debe tener formato HH:MM (24h)'),
  isActive: z.boolean().default(true),
}).refine(
  (data) => data.startTime < data.endTime,
  { message: 'Hora de inicio debe ser menor a hora de fin', path: ['endTime'] }
)

export const updateOrderScheduleSchema = createOrderScheduleSchema.partial()

// ============================================================================
// SCHEMAS DE PAGINACIÓN Y BÚSQUEDA
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number()
    .int('Page debe ser un número entero')
    .positive('Page debe ser mayor a 0')
    .default(1),
  limit: z.coerce.number()
    .int('Limit debe ser un número entero')
    .positive('Limit debe ser mayor a 0')
    .max(100, 'Limit máximo: 100')
    .default(10),
  search: z.string().max(100, 'Búsqueda no puede exceder 100 caracteres').optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export const searchQuerySchema = z.object({
  q: z.string()
    .min(1, 'Query de búsqueda no puede estar vacío')
    .max(100, 'Query no puede exceder 100 caracteres'),
  category: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
}).refine(
  (data) => !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice,
  { message: 'Precio mínimo debe ser menor o igual a precio máximo', path: ['maxPrice'] }
)

// ============================================================================
// SCHEMAS DE ADMIN
// ============================================================================

export const unblockRateLimitSchema = z.object({
  key: z.string().min(1, 'Key es requerida'),
  limiter: z.enum(['general', 'auth', 'public', 'cron'], {
    message: 'Limiter debe ser: general, auth, public, o cron'
  }),
})

export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, 'User ID es requerido'),
  role: z.enum(['CLIENT', 'SELLER', 'ADMIN'], {
    message: 'Role debe ser: CLIENT, SELLER, o ADMIN'
  }),
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validar un schema y retornar resultado formateado
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data)
  
  if (result.success) {
    return { success: true, data: result.data }
  }
  
  const errors = result.error.issues.map((err: any) => {
    const path = err.path.join('.')
    return path ? `${path}: ${err.message}` : err.message
  })
  
  return { success: false, errors }
}

/**
 * Validar query parameters de URL
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): { success: true; data: T } | { success: false; errors: string[] } {
  const params: Record<string, any> = {}
  
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  return validateSchema(schema, params)
}

// ============================================================================
// TYPE EXPORTS (para TypeScript)
// ============================================================================

export type SignInInput = z.infer<typeof signInSchema>
export type SignUpInput = z.infer<typeof signUpSchema>
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
export type CreateOrderInput = z.infer<typeof createOrderSchema>
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>
export type AddToCartInput = z.infer<typeof addToCartSchema>
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>
export type SendChatMessageInput = z.infer<typeof sendChatMessageSchema>
export type MarkMessagesReadInput = z.infer<typeof markMessagesReadSchema>
export type CreateChatScheduleInput = z.infer<typeof createChatScheduleSchema>
export type UpdateChatScheduleInput = z.infer<typeof updateChatScheduleSchema>
export type CreateOrderScheduleInput = z.infer<typeof createOrderScheduleSchema>
export type UpdateOrderScheduleInput = z.infer<typeof updateOrderScheduleSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type SearchQueryInput = z.infer<typeof searchQuerySchema>
export type UnblockRateLimitInput = z.infer<typeof unblockRateLimitSchema>
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>
