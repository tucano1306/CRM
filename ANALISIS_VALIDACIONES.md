# 📋 ANÁLISIS DE VALIDACIONES - Food Orders CRM

**Fecha**: 28 de Octubre de 2025  
**Estado**: Revisión completa del sistema de validaciones

---

## 🎯 RESUMEN EJECUTIVO

### ✅ Validaciones Implementadas
- **Archivo**: `lib/validations.ts` con Zod schemas
- **Endpoints con validación**: ~20% de los endpoints
- **Helper functions**: `validateSchema()` y `validateQueryParams()`

### ⚠️ Problemas Encontrados
1. **Validaciones manuales inconsistentes** en la mayoría de endpoints
2. **Falta uso de schemas Zod** en endpoints críticos
3. **Validaciones duplicadas** (código manual vs schemas)
4. **Falta validación en archivos subidos**
5. **Sin validación de tipos de datos** en algunos endpoints

---

## 📊 ESTADO POR MÓDULO

### 1. **PRODUCTOS** ❌ CRÍTICO

#### Endpoint: `POST /api/products`
**Estado actual**: Validación manual básica
```typescript
// ❌ ACTUAL (Manual, inconsistente)
if (!name || !unit || price === undefined || stock === undefined) {
  return NextResponse.json({ error: 'Faltan campos...' }, { status: 400 })
}
```

**Problemas**:
- No usa `createProductSchema` de validations.ts
- Validación de categoría manual
- No valida formato de precio/stock antes de parsear
- No valida longitud de strings
- No valida URL de imagen

**Recomendación**: ✅ ALTA PRIORIDAD
```typescript
import { createProductSchema, validateSchema } from '@/lib/validations'

const validation = validateSchema(createProductSchema, body)
if (!validation.success) {
  return NextResponse.json({ 
    error: 'Datos inválidos', 
    details: validation.errors 
  }, { status: 400 })
}
```

#### Endpoint: `PUT /api/products/[id]`
**Estado**: ⚠️ Sin validación implementada
**Recomendación**: Usar `updateProductSchema`

---

### 2. **CLIENTES** ✅ PARCIALMENTE IMPLEMENTADO

#### Endpoint: `POST /api/clients`
**Estado**: ✅ Usa validación con Zod
```typescript
const validation = validateSchema(createClientSchema, body)
```

**Problemas menores**:
- El schema de validaciones.ts tiene `sellerId` opcional pero en algunos casos debería ser requerido
- Falta validación de formato de teléfono internacional

**Mejoras sugeridas**:
```typescript
// En validations.ts
phone: z.string()
  .min(8, 'Teléfono mínimo 8 dígitos')
  .max(20, 'Teléfono máximo 20 caracteres')
  .regex(/^[\d+\-\s()]+$/, 'Formato de teléfono inválido')
```

#### Endpoint: `PUT /api/clients/[id]`
**Estado**: ⚠️ Usa validación pero permite campos vacíos

---

### 3. **ÓRDENES** ❌ SIN VALIDACIÓN

#### Endpoint: `POST /api/buyer/orders`
**Estado actual**: Sin validación de Zod
```typescript
const body = await request.json()
const { items, notes } = body
// ❌ No valida estructura de items
```

**Problemas críticos**:
- No valida que `items` sea array
- No valida estructura de cada item (productId, quantity)
- No valida rangos de cantidad
- No valida que totalAmount sea correcto

**Schema requerido**: ⚠️ FALTA CREAR
```typescript
export const createBuyerOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid('Product ID inválido'),
    quantity: z.number()
      .int('Cantidad debe ser entero')
      .positive('Cantidad debe ser mayor a 0')
      .max(10000, 'Cantidad máxima: 10,000')
  })).min(1, 'Debe haber al menos un item'),
  notes: z.string().max(500, 'Notas máximo 500 caracteres').optional(),
  deliveryInstructions: z.string().max(500).optional()
})
```

#### Endpoint: `PUT /api/orders/[id]`
**Estado**: Validación manual incompleta

#### Endpoints de cambio de status:
- `/api/orders/[id]/confirm` ❌ Sin validación
- `/api/orders/[id]/cancel` ❌ Sin validación
- `/api/orders/[id]/complete` ❌ Sin validación

---

### 4. **CHAT** ✅ BIEN IMPLEMENTADO

#### Endpoint: `POST /api/chat-messages`
**Estado**: ✅ Usa `sendChatMessageSchema`

**Mejora sugerida**: Agregar validación de archivos
```typescript
export const sendChatMessageSchema = z.object({
  receiverId: z.string().regex(/^user_[a-zA-Z0-9]+$/),
  message: z.string().min(1).max(1000).trim(),
  orderId: z.string().uuid().optional(),
  attachmentUrl: z.string().url().optional(),
  attachmentType: z.enum(['image', 'document']).optional(),
  attachmentName: z.string().max(255).optional(),
  attachmentSize: z.number().max(5 * 1024 * 1024, 'Archivo máximo 5MB').optional()
})
```

---

### 5. **CARRITO** ❌ VALIDACIÓN INCOMPLETA

#### Endpoint: `POST /api/buyer/cart`
**Estado**: Validación manual básica
```typescript
if (!productId || !quantity) {
  return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
}
```

**Problema**: No usa `addToCartSchema` que ya existe en validations.ts

**Solución**: ✅ RÁPIDA
```typescript
import { addToCartSchema, validateSchema } from '@/lib/validations'

const validation = validateSchema(addToCartSchema, body)
if (!validation.success) {
  return NextResponse.json({ 
    error: 'Datos inválidos',
    details: validation.errors 
  }, { status: 400 })
}
```

---

### 6. **UPLOADS** ❌ SIN VALIDACIÓN DE SEGURIDAD

#### Endpoint: `POST /api/upload`
**Estado**: Validación básica de tipo MIME
```typescript
const allowedTypes = ['image/jpeg', 'image/png', ...]
if (!allowedTypes.includes(file.type)) {
  return NextResponse.json({ error: 'Tipo no permitido' })
}
```

**Problemas críticos de seguridad**:
1. ❌ No valida tamaño ANTES de leer el archivo completo
2. ❌ No valida contenido real del archivo (solo MIME type)
3. ❌ No sanitiza nombre de archivo
4. ❌ No valida extensión vs contenido
5. ❌ Permite archivos .exe si tienen MIME correcto

**Schema de seguridad requerido**:
```typescript
export const uploadFileSchema = z.object({
  file: z.custom<File>()
    .refine(file => file.size <= 5 * 1024 * 1024, 'Archivo máximo 5MB')
    .refine(
      file => ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
               'application/pdf', 'application/msword'].includes(file.type),
      'Tipo de archivo no permitido'
    )
    .refine(
      file => {
        const ext = file.name.split('.').pop()?.toLowerCase()
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'pdf', 'doc', 'docx'].includes(ext || '')
      },
      'Extensión de archivo no permitida'
    )
})
```

**Validación adicional de contenido real**:
```typescript
import { fileTypeFromBuffer } from 'file-type'

// Validar contenido real vs MIME declarado
const buffer = await file.arrayBuffer()
const fileType = await fileTypeFromBuffer(Buffer.from(buffer))

if (!fileType || !allowedMimes.includes(fileType.mime)) {
  return NextResponse.json({ 
    error: 'Archivo corrupto o tipo no permitido' 
  }, { status: 400 })
}
```

---

### 7. **COTIZACIONES (QUOTES)** ⚠️ FALTA SCHEMA

#### Schemas faltantes:
```typescript
export const createQuoteSchema = z.object({
  clientId: z.string().uuid('Client ID inválido'),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(10000),
    pricePerUnit: z.number().positive().max(999999)
  })).min(1, 'Debe haber al menos un item'),
  validUntil: z.string().datetime('Fecha inválida').optional(),
  notes: z.string().max(1000).optional(),
  discount: z.number().min(0).max(100, 'Descuento máximo 100%').optional()
})

export const acceptQuoteSchema = z.object({
  quoteId: z.string().uuid('Quote ID inválido')
})
```

---

### 8. **DEVOLUCIONES (RETURNS)** ⚠️ FALTA SCHEMA

```typescript
export const createReturnSchema = z.object({
  orderId: z.string().uuid('Order ID inválido'),
  items: z.array(z.object({
    orderItemId: z.string().uuid(),
    quantity: z.number().int().positive(),
    reason: z.enum(['DAMAGED', 'WRONG_PRODUCT', 'QUALITY_ISSUE', 'OTHER'])
  })).min(1),
  notes: z.string().max(1000).optional()
})
```

---

### 9. **ÓRDENES RECURRENTES** ⚠️ FALTA SCHEMA

```typescript
export const createRecurringOrderSchema = z.object({
  clientId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive()
  })).min(1),
  frequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean().default(true)
}).refine(
  data => !data.endDate || new Date(data.startDate) < new Date(data.endDate),
  { message: 'Fecha de inicio debe ser anterior a fecha de fin' }
)
```

---

## 🚨 VULNERABILIDADES DE SEGURIDAD

### 1. **SQL Injection** ⚠️ BAJO RIESGO
- Prisma previene inyección SQL
- **Recomendación**: Mantener uso de Prisma, evitar raw queries

### 2. **XSS (Cross-Site Scripting)** ⚠️ MEDIO RIESGO
**Problema**: Campos de texto no sanitizados antes de guardar
```typescript
// ❌ ACTUAL
name: body.name

// ✅ RECOMENDADO
import DOMPurify from 'isomorphic-dompurify'

name: DOMPurify.sanitize(body.name.trim())
```

**Campos afectados**:
- Client.name, Client.address
- Product.name, Product.description
- Order.notes, Order.generalMessage
- ChatMessage.message

### 3. **File Upload Vulnerabilities** 🔴 ALTO RIESGO
**Ver sección de UPLOADS arriba**

### 4. **Mass Assignment** ⚠️ MEDIO RIESGO
**Problema**: Algunos endpoints permiten actualizar cualquier campo
```typescript
// ❌ PELIGROSO
await prisma.client.update({
  where: { id },
  data: body  // ← Permite actualizar CUALQUIER campo
})

// ✅ SEGURO
const { name, email, phone, address } = updateClientSchema.parse(body)
await prisma.client.update({
  where: { id },
  data: { name, email, phone, address }  // ← Solo campos permitidos
})
```

### 5. **Rate Limiting** ✅ IMPLEMENTADO
- Middleware de rate limiting funciona
- **Mejora**: Agregar rate limiting específico para uploads

---

## 📝 SCHEMAS FALTANTES EN `lib/validations.ts`

### Alta prioridad:
1. ✅ `createBuyerOrderSchema`
2. ✅ `createQuoteSchema`
3. ✅ `acceptQuoteSchema`
4. ✅ `createReturnSchema`
5. ✅ `approveReturnSchema`
6. ✅ `createRecurringOrderSchema`
7. ✅ `uploadFileSchema`
8. ✅ `createCreditNoteSchema`
9. ✅ `useCreditNoteSchema`

### Media prioridad:
10. ⚠️ `updateOrderItemSchema`
11. ⚠️ `createNotificationSchema`
12. ⚠️ `bulkUpdateOrdersSchema`

---

## 🛠️ PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Crítico (1-2 días)
1. ✅ Crear schemas faltantes de alta prioridad
2. ✅ Implementar validación en `/api/upload` (seguridad)
3. ✅ Implementar validación en endpoints de órdenes
4. ✅ Sanitizar inputs de texto (prevenir XSS)

### Fase 2: Alto (3-5 días)
5. ✅ Implementar validación en todos los endpoints POST/PUT
6. ✅ Agregar validación de archivos con contenido real
7. ✅ Prevenir mass assignment en endpoints de actualización
8. ✅ Agregar validación de permisos por rol

### Fase 3: Medio (1 semana)
9. ⚠️ Crear tests unitarios para schemas
10. ⚠️ Documentar API con validaciones
11. ⚠️ Agregar logging de intentos de validación fallidos
12. ⚠️ Implementar rate limiting específico por endpoint

---

## 💡 MEJORES PRÁCTICAS SUGERIDAS

### 1. Patrón estándar para todos los endpoints POST/PUT:
```typescript
import { createXSchema, validateSchema } from '@/lib/validations'

export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    
    // ✅ VALIDACIÓN
    const validation = validateSchema(createXSchema, body)
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Datos inválidos',
        details: validation.errors 
      }, { status: 400 })
    }

    // ✅ SANITIZACIÓN
    const sanitizedData = {
      ...validation.data,
      name: DOMPurify.sanitize(validation.data.name.trim()),
      // ... otros campos
    }

    // ✅ LÓGICA DE NEGOCIO
    const result = await prisma.x.create({
      data: sanitizedData
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    // Manejo de errores
  }
}
```

### 2. Validación en cliente (React):
```typescript
import { createProductSchema } from '@/lib/validations'

const handleSubmit = async (formData) => {
  // ✅ Validar antes de enviar
  const validation = validateSchema(createProductSchema, formData)
  if (!validation.success) {
    setErrors(validation.errors)
    return
  }

  // Enviar a API
  await fetch('/api/products', {
    method: 'POST',
    body: JSON.stringify(validation.data)
  })
}
```

### 3. Mensajes de error consistentes:
```typescript
// ❌ EVITAR
return NextResponse.json({ error: 'Error' }, { status: 400 })

// ✅ USAR
return NextResponse.json({ 
  success: false,
  error: 'Datos inválidos',
  details: validation.errors,
  code: 'VALIDATION_ERROR'
}, { status: 400 })
```

---

## 📊 MÉTRICAS DE COBERTURA

### Actual:
- **Endpoints totales**: ~50
- **Con validación Zod**: ~10 (20%)
- **Con validación manual**: ~30 (60%)
- **Sin validación**: ~10 (20%)

### Objetivo (después de mejoras):
- **Con validación Zod**: 45 (90%)
- **Con validación manual**: 0 (0%)
- **Sin validación**: 5 (10% - endpoints de solo lectura)

---

## 🔗 DEPENDENCIAS A INSTALAR

```bash
# Para sanitización de HTML/XSS
npm install isomorphic-dompurify

# Para validación de tipo de archivo real
npm install file-type

# Para validación de imágenes
npm install sharp
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Por cada endpoint:
- [ ] Schema de validación creado en `lib/validations.ts`
- [ ] Validación implementada usando `validateSchema()`
- [ ] Inputs sanitizados (DOMPurify para strings)
- [ ] Manejo de errores consistente
- [ ] Logs de validación fallida
- [ ] Tests unitarios del schema
- [ ] Documentación actualizada

---

**Última actualización**: 28 de Octubre de 2025  
**Siguiente revisión**: Después de implementar Fase 1
