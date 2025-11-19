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
  zipCode: z.string()
    .regex(/^\d{5}(-\d{4})?$/, 'Código postal inválido (formato: 12345 o 12345-6789)')
    .optional(),
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
  unit: z.enum(['case', 'unit', 'kg', 'lb', 'box', 'pk'], {
    message: 'Unidad debe ser: case, unit, kg, lb, box, o pk'
  }).default('case'),
  category: z.enum([
    'CARNES',
    'EMBUTIDOS',
    'SALSAS',
    'LACTEOS',
    'GRANOS',
    'VEGETALES',
    'CONDIMENTOS',
    'BEBIDAS',
    'OTROS'
  ], {
    message: 'Categoría inválida'
  }).default('OTROS'),
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
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_DELIVERY', 'DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'CANCELED', 'PAYMENT_PENDING', 'PAID'], {
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
// SCHEMAS DE ÓRDENES (ORDERS)
// ============================================================================

export const updateOrderSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED'], {
    message: 'Status debe ser: PENDING, CONFIRMED, COMPLETED, o CANCELED'
  }).optional(),
  notes: z.string()
    .max(1000, 'Notas no pueden exceder 1,000 caracteres')
    .nullable()
    .optional(),
  deliveryAddress: z.string()
    .max(500, 'Dirección de entrega no puede exceder 500 caracteres')
    .optional(),
  deliveryInstructions: z.string()
    .max(500, 'Instrucciones de entrega no pueden exceder 500 caracteres')
    .optional()
})

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
// SCHEMAS DE ÓRDENES (BUYER)
// ============================================================================

export const createBuyerOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid('Product ID debe ser un UUID válido'),
    quantity: z.number()
      .int('Cantidad debe ser un número entero')
      .positive('Cantidad debe ser mayor a 0')
      .max(10000, 'Cantidad máxima: 10,000 unidades')
  })).min(1, 'Debe haber al menos un item en la orden'),
  notes: z.string()
    .max(500, 'Notas no pueden exceder 500 caracteres')
    .optional(),
  deliveryInstructions: z.string()
    .max(500, 'Instrucciones de entrega no pueden exceder 500 caracteres')
    .optional()
})

export const updateOrderItemSchema = z.object({
  quantity: z.number()
    .int('Cantidad debe ser un número entero')
    .positive('Cantidad debe ser mayor a 0')
    .max(10000, 'Cantidad máxima: 10,000 unidades')
    .optional(),
  pricePerUnit: z.number()
    .positive('Precio debe ser mayor a 0')
    .max(999999, 'Precio máximo: 999,999')
    .optional(),
  itemNote: z.string()
    .max(200, 'Nota del item máximo 200 caracteres')
    .optional()
})

// ============================================================================
// SCHEMAS DE COTIZACIONES (QUOTES)
// ============================================================================

export const createQuoteSchema = z.object({
  clientId: z.string().uuid('Client ID debe ser un UUID válido'),
  title: z.string()
    .min(5, 'Título debe tener al menos 5 caracteres')
    .max(200, 'Título no puede exceder 200 caracteres'),
  description: z.string()
    .max(1000, 'Descripción no puede exceder 1,000 caracteres')
    .optional(),
  items: z.array(z.object({
    productId: z.string().uuid('Product ID debe ser un UUID válido'),
    productName: z.string()
      .min(1, 'Nombre del producto es requerido')
      .max(200, 'Nombre del producto no puede exceder 200 caracteres'),
    description: z.string()
      .max(500, 'Descripción del item no puede exceder 500 caracteres')
      .optional(),
    quantity: z.number()
      .int('Cantidad debe ser un número entero')
      .positive('Cantidad debe ser mayor a 0')
      .max(10000, 'Cantidad máxima: 10,000'),
    pricePerUnit: z.number()
      .positive('Precio debe ser mayor a 0')
      .max(999999, 'Precio máximo: 999,999'),
    discount: z.number()
      .min(0, 'Descuento mínimo: 0')
      .max(100, 'Descuento máximo: 100')
      .optional(),
    notes: z.string()
      .max(500, 'Notas del item no pueden exceder 500 caracteres')
      .optional()
  })).min(1, 'Debe haber al menos un item'),
  validUntil: z.string()
    .datetime('Fecha de validez debe ser formato ISO datetime')
    .optional(),
  notes: z.string()
    .max(1000, 'Notas no pueden exceder 1,000 caracteres')
    .optional(),
  discount: z.number()
    .min(0, 'Descuento mínimo: 0')
    .max(100, 'Descuento máximo: 100')
    .optional(),
  termsAndConditions: z.string()
    .max(2000, 'Términos y condiciones no pueden exceder 2,000 caracteres')
    .optional()
}).refine(
  (data) => {
    if (!data.validUntil) return true
    return new Date(data.validUntil) > new Date()
  },
  { message: 'Fecha de validez debe ser futura', path: ['validUntil'] }
)

export const updateQuoteSchema = createQuoteSchema.partial()

export const acceptQuoteSchema = z.object({
  status: z.literal('ACCEPTED')
})

export const rejectQuoteSchema = z.object({
  status: z.literal('REJECTED'),
  reason: z.string()
    .min(10, 'Razón de rechazo debe tener al menos 10 caracteres')
    .max(500, 'Razón no puede exceder 500 caracteres')
    .optional()
})

// ============================================================================
// SCHEMAS DE DEVOLUCIONES (RETURNS)
// ============================================================================

export const createReturnSchema = z.object({
  orderId: z.string().uuid('Order ID debe ser un UUID válido'),
  reason: z.enum([
    'DAMAGED', 'EXPIRED', 'WRONG_PRODUCT', 'QUALITY_ISSUE', 
    'NOT_AS_DESCRIBED', 'OTHER', 'DAMAGED_PRODUCT', 'INCORRECT_PRODUCT',
    'CUSTOMER_DISSATISFACTION', 'PRICING_ERROR', 'DUPLICATE_ORDER',
    'GOODWILL', 'OVERCHARGE', 'PROMOTION_ADJUSTMENT', 'COMPENSATION'
  ], {
    message: 'Razón de devolución inválida'
  }),
  reasonDescription: z.string()
    .min(10, 'Descripción de la razón mínimo 10 caracteres')
    .max(500, 'Descripción máximo 500 caracteres')
    .optional(),
  refundType: z.enum(['REFUND', 'CREDIT', 'REPLACEMENT'], {
    message: 'Tipo de reembolso debe ser: REFUND, CREDIT, o REPLACEMENT'
  }),
  items: z.array(z.object({
    orderItemId: z.string().uuid('Order Item ID debe ser un UUID válido'),
    quantityReturned: z.number()
      .int('Cantidad debe ser un número entero')
      .positive('Cantidad debe ser mayor a 0'),
    notes: z.string()
      .max(500, 'Notas del item no pueden exceder 500 caracteres')
      .optional()
  })).min(1, 'Debe haber al menos un item para devolver'),
  notes: z.string()
    .max(1000, 'Notas no pueden exceder 1,000 caracteres')
    .optional()
})

export const approveReturnSchema = z.object({
  refundMethod: z.enum(['CREDIT', 'REFUND', 'REPLACEMENT'], {
    message: 'Método de reembolso debe ser: CREDIT, REFUND, o REPLACEMENT'
  }),
  notes: z.string()
    .max(500, 'Notas no pueden exceder 500 caracteres')
    .optional()
})

export const rejectReturnSchema = z.object({
  reason: z.string()
    .min(20, 'Razón de rechazo debe tener al menos 20 caracteres')
    .max(500, 'Razón no puede exceder 500 caracteres'),
  notes: z.string()
    .max(500, 'Notas no pueden exceder 500 caracteres')
    .optional()
})

// ============================================================================
// SCHEMAS DE ÓRDENES RECURRENTES
// ============================================================================

export const createRecurringOrderSchema = z.object({
  clientId: z.string().uuid('Client ID debe ser un UUID válido'),
  name: z.string()
    .min(3, 'Nombre debe tener al menos 3 caracteres')
    .max(200, 'Nombre no puede exceder 200 caracteres'),
  items: z.array(z.object({
    productId: z.string().uuid('Product ID debe ser un UUID válido'),
    quantity: z.number()
      .int('Cantidad debe ser un número entero')
      .positive('Cantidad debe ser mayor a 0')
      .max(10000, 'Cantidad máxima: 10,000'),
    pricePerUnit: z.number()
      .positive('Precio debe ser mayor a 0')
      .max(999999, 'Precio máximo: 999,999')
  })).min(1, 'Debe haber al menos un item'),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'], {
    message: 'Frecuencia debe ser: DAILY, WEEKLY, BIWEEKLY, MONTHLY, o CUSTOM'
  }),
  customDays: z.number()
    .int('Días personalizados debe ser un entero')
    .min(1)
    .max(365)
    .optional(),
  dayOfWeek: z.number()
    .int()
    .min(0, 'Día de la semana debe estar entre 0-6')
    .max(6, 'Día de la semana debe estar entre 0-6')
    .optional(),
  dayOfMonth: z.number()
    .int()
    .min(1, 'Día del mes debe estar entre 1-31')
    .max(31, 'Día del mes debe estar entre 1-31')
    .optional(),
  startDate: z.string()
    .datetime('Fecha de inicio debe ser formato ISO datetime'),
  endDate: z.string()
    .datetime('Fecha de fin debe ser formato ISO datetime')
    .optional(),
  isActive: z.boolean().default(true),
  notes: z.string()
    .max(500, 'Notas no pueden exceder 500 caracteres')
    .optional(),
  deliveryInstructions: z.string()
    .max(500, 'Instrucciones de entrega no pueden exceder 500 caracteres')
    .optional()
}).refine(
  (data) => !data.endDate || new Date(data.startDate) < new Date(data.endDate),
  { message: 'Fecha de inicio debe ser anterior a fecha de fin', path: ['endDate'] }
)

export const updateRecurringOrderSchema = createRecurringOrderSchema.partial()

// ============================================================================
// SCHEMAS DE NOTAS DE CRÉDITO
// ============================================================================

export const createCreditNoteSchema = z.object({
  clientId: z.string().uuid('Client ID debe ser un UUID válido'),
  amount: z.number()
    .positive('Monto debe ser mayor a 0')
    .max(999999, 'Monto máximo: 999,999'),
  reason: z.string()
    .min(10, 'Razón debe tener al menos 10 caracteres')
    .max(500, 'Razón no puede exceder 500 caracteres'),
  orderId: z.string().uuid('Order ID debe ser un UUID válido').optional(),
  returnId: z.string().uuid('Return ID debe ser un UUID válido').optional(),
  expiresAt: z.string()
    .datetime('Fecha de expiración debe ser formato ISO datetime')
    .optional()
}).refine(
  (data) => !data.expiresAt || new Date(data.expiresAt) > new Date(),
  { message: 'Fecha de expiración debe ser futura', path: ['expiresAt'] }
)

export const useCreditNoteSchema = z.object({
  creditNoteId: z.string().uuid('Credit Note ID debe ser un UUID válido'),
  orderId: z.string().uuid('Order ID debe ser un UUID válido'),
  amountUsed: z.number()
    .positive('Monto usado debe ser mayor a 0')
    .max(999999, 'Monto máximo: 999,999')
})

// ============================================================================
// SCHEMAS DE UPLOADS
// ============================================================================

export const uploadFileSchema = z.object({
  fileName: z.string()
    .min(1, 'Nombre de archivo es requerido')
    .max(255, 'Nombre de archivo máximo 255 caracteres')
    .regex(/^[a-zA-Z0-9._\-\s]+$/, 'Nombre de archivo contiene caracteres no permitidos'),
  fileSize: z.number()
    .positive('Tamaño de archivo debe ser mayor a 0')
    .max(5 * 1024 * 1024, 'Archivo máximo 5MB'),
  fileType: z.string()
    .min(1, 'Tipo de archivo es requerido'),
  fileExtension: z.enum(['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'], {
    message: 'Extensión de archivo no permitida'
  })
})

// ============================================================================
// SCHEMAS DE NOTIFICACIONES
// ============================================================================

export const createNotificationSchema = z.object({
  type: z.enum(['ORDER_PLACED', 'ORDER_CONFIRMED', 'ORDER_COMPLETED', 'ORDER_CANCELED', 
                'CHAT_MESSAGE', 'QUOTE_RECEIVED', 'RETURN_APPROVED', 'CREDIT_NOTE_ISSUED', 'OTHER'], {
    message: 'Tipo de notificación inválido'
  }),
  message: z.string()
    .min(1, 'Mensaje es requerido')
    .max(500, 'Mensaje no puede exceder 500 caracteres'),
  link: z.string()
    .max(500, 'Link no puede exceder 500 caracteres')
    .optional(),
  clientId: z.string().uuid('Client ID debe ser un UUID válido').optional(),
  sellerId: z.string().uuid('Seller ID debe ser un UUID válido').optional()
}).refine(
  (data) => data.clientId || data.sellerId,
  { message: 'Debe especificar clientId o sellerId' }
)

export const markNotificationReadSchema = z.object({
  notificationId: z.string().uuid('Notification ID debe ser un UUID válido')
})

// ============================================================================
// SCHEMAS DE OPERACIONES MASIVAS
// ============================================================================

export const bulkUpdateOrdersSchema = z.object({
  orderIds: z.array(z.string().uuid('Order ID debe ser un UUID válido'))
    .min(1, 'Debe proporcionar al menos un Order ID')
    .max(100, 'Máximo 100 órdenes por operación masiva'),
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'IN_DELIVERY', 
                  'DELIVERED', 'PARTIALLY_DELIVERED', 'COMPLETED', 'CANCELED', 'PAYMENT_PENDING', 'PAID'], {
    message: 'Status inválido'
  }),
  notes: z.string()
    .max(500, 'Notas no pueden exceder 500 caracteres')
    .optional()
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
export type CreateBuyerOrderInput = z.infer<typeof createBuyerOrderSchema>
export type UpdateOrderItemInput = z.infer<typeof updateOrderItemSchema>
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>
export type AcceptQuoteInput = z.infer<typeof acceptQuoteSchema>
export type RejectQuoteInput = z.infer<typeof rejectQuoteSchema>
export type CreateReturnInput = z.infer<typeof createReturnSchema>
export type ApproveReturnInput = z.infer<typeof approveReturnSchema>
export type RejectReturnInput = z.infer<typeof rejectReturnSchema>
export type CreateRecurringOrderInput = z.infer<typeof createRecurringOrderSchema>
export type UpdateRecurringOrderInput = z.infer<typeof updateRecurringOrderSchema>
export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>
export type UseCreditNoteInput = z.infer<typeof useCreditNoteSchema>
export type UploadFileInput = z.infer<typeof uploadFileSchema>
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>
export type BulkUpdateOrdersInput = z.infer<typeof bulkUpdateOrdersSchema>
