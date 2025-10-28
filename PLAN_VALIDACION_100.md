# 🎯 Plan para 100% de Cobertura de Validación

## 📊 Estado Actual
- **Completados**: 12/45 endpoints (27%)
- **Objetivo**: 45/45 endpoints (100%)
- **Endpoints restantes**: 33

---

## 🚀 Estrategia de Implementación

### Fase 1: CRÍTICO - Endpoints de Datos Sensibles (8 endpoints)
**Tiempo estimado: 20-30 minutos**

1. ✅ `POST /api/returns` - HECHO
2. ⏳ `POST /api/returns/[id]/approve` - Schema listo
3. ⏳ `POST /api/returns/[id]/reject` - Schema listo
4. ⏳ `POST /api/clients` - Crear schema
5. ⏳ `PUT /api/orders/[id]` - Actualización principal
6. ⏳ `PATCH /api/orders/[id]` - Actualización parcial
7. ⏳ `POST /api/recurring-orders` - Schema listo
8. ⏳ `PATCH /api/recurring-orders/[id]` - Schema listo

### Fase 2: ALTA PRIORIDAD - Transacciones y Finanzas (6 endpoints)
**Tiempo estimado: 15-20 minutos**

9. ⏳ `POST /api/credit-notes/[id]/use` - Schema listo
10. ⏳ `POST /api/returns/[id]/complete` - Validación simple
11. ⏳ `POST /api/returns/[id]/change-refund-type` - Validación simple
12. ⏳ `POST /api/quotes/[id]/convert` - Validación de conversión
13. ⏳ `POST /api/quotes/[id]/send` - Validación simple
14. ⏳ `PATCH /api/orders/[id]/status` - Validación de status

### Fase 3: MEDIA PRIORIDAD - Comunicación y Notificaciones (7 endpoints)
**Tiempo estimado: 15-20 minutos**

15. ⏳ `POST /api/chat-messages` - Validación de mensajes
16. ⏳ `PATCH /api/chat-messages` - Actualización de mensajes
17. ⏳ `POST /api/notifications` - Schema listo
18. ⏳ `PATCH /api/notifications/[id]` - Marcar como leído
19. ⏳ `POST /api/notifications/mark-all-read` - Simple
20. ⏳ `DELETE /api/notifications/[id]` - Solo ID validation
21. ⏳ `POST /api/chat-schedules` - Horarios de chat

### Fase 4: BAJA PRIORIDAD - Configuración y Auxiliares (12 endpoints)
**Tiempo estimado: 20-25 minutos**

22. ⏳ `POST /api/sellers` - Crear vendedor
23. ⏳ `PUT /api/sellers/[id]` - Actualizar vendedor
24. ⏳ `DELETE /api/sellers/[id]` - Solo validación ID
25. ⏳ `PUT /api/schedule` - Horarios
26. ⏳ `POST /api/order-schedules` - Programación de órdenes
27. ⏳ `DELETE /api/order-schedules` - Solo ID
28. ⏳ `PUT /api/order-confirmation-settings` - Settings
29. ⏳ `POST /api/products/[id]/history` - Historial
30. ⏳ `POST /api/products/[id]/tags` - Tags
31. ⏳ `DELETE /api/products/[id]/tags` - Solo ID
32. ⏳ `PUT /api/chat-schedules` - Actualizar horarios
33. ⏳ `DELETE /api/chat-schedules` - Solo ID

### Fase 5: MUY BAJA PRIORIDAD - Buyer Features (10 endpoints)
**Tiempo estimado: 15-20 minutos**

34. ⏳ `PUT /api/buyer/cart/items/[itemId]` - Actualizar cantidad
35. ⏳ `DELETE /api/buyer/cart/items/[itemId]` - Solo ID
36. ⏳ `PATCH /api/buyer/cart/items/[itemId]/note` - Nota simple
37. ⏳ `POST /api/buyer/coupons/validate` - Validar cupón
38. ⏳ `POST /api/buyer/favorites/[productId]` - Solo ID
39. ⏳ `DELETE /api/buyer/favorites/[productId]` - Solo ID
40. ⏳ `POST /api/buyer/cart/save-for-later` - Guardar carrito
41. ⏳ `PATCH /api/orders/items/[itemId]/note` - Nota item
42. ⏳ `PUT /api/orders/[id]/placed` - Marcar como colocado
43. ⏳ `PATCH /api/recurring-orders/[id]/toggle` - Toggle activo

### Fase 6: ENDPOINTS DE SOLO LECTURA (No necesitan validación compleja)
**Estos son GET endpoints o DELETE simples - validación mínima**

- `DELETE /api/buyer/cart` - Sin body, solo auth
- `DELETE /api/clients/[id]` - Solo validar UUID
- `DELETE /api/products/[id]` - Solo validar UUID
- `DELETE /api/quotes/[id]` - Solo validar UUID
- `DELETE /api/returns/[id]` - Solo validar UUID
- `DELETE /api/recurring-orders/[id]` - Solo validar UUID

---

## 📋 Schemas Pendientes por Crear

### Nuevos schemas necesarios (estimado: 15 schemas):

1. **createClientSchema** - Para POST /api/clients
2. **updateOrderSchema** - Para PUT/PATCH /api/orders/[id]
3. **updateOrderStatusSchema** - Para PATCH /api/orders/[id]/status
4. **convertQuoteSchema** - Para POST /api/quotes/[id]/convert
5. **sendQuoteSchema** - Para POST /api/quotes/[id]/send
6. **createChatMessageSchema** - Para POST /api/chat-messages
7. **updateChatMessageSchema** - Para PATCH /api/chat-messages
8. **changeRefundTypeSchema** - Para POST /api/returns/[id]/change-refund-type
9. **createSellerSchema** - Para POST /api/sellers
10. **updateSellerSchema** - Para PUT /api/sellers/[id]
11. **createOrderScheduleSchema** - Para POST /api/order-schedules
12. **updateOrderConfirmationSettingsSchema** - Para PUT /api/order-confirmation-settings
13. **updateCartItemSchema** - Para PUT /api/buyer/cart/items/[itemId]
14. **validateCouponSchema** - Para POST /api/buyer/coupons/validate
15. **createProductHistorySchema** - Para POST /api/products/[id]/history

---

## ⚡ Implementación Rápida

### Patrón Estándar (copiar-pegar):
```typescript
import { SCHEMA_NAME, validateSchema } from '@/lib/validations'
import DOMPurify from 'isomorphic-dompurify'

// En el handler:
const validation = validateSchema(SCHEMA_NAME, body)
if (!validation.success) {
  return NextResponse.json({ 
    error: 'Datos inválidos',
    details: validation.errors
  }, { status: 400 })
}

// Sanitizar campos de texto
const sanitizedData = {
  ...validation.data,
  textField: DOMPurify.sanitize(validation.data.textField.trim())
}
```

### Para endpoints simples (solo ID):
```typescript
import { z } from 'zod'

const schema = z.object({
  id: z.string().uuid('ID debe ser UUID válido')
})
```

---

## 🎯 Meta de Tiempo Total

- **Fase 1 (Crítico)**: 30 min
- **Fase 2 (Alta)**: 20 min
- **Fase 3 (Media)**: 20 min
- **Fase 4 (Baja)**: 25 min
- **Fase 5 (Muy Baja)**: 20 min
- **Testing básico**: 15 min

**TOTAL ESTIMADO: ~2 horas** para llegar al 100% ✅

---

## 📈 Tracking de Progreso

### Por Fases:
- [ ] Fase 1: 0/8 (0%)
- [ ] Fase 2: 0/6 (0%)
- [ ] Fase 3: 0/7 (0%)
- [ ] Fase 4: 0/12 (0%)
- [ ] Fase 5: 0/10 (0%)

### Global:
- **Completados**: 12/45 (27%)
- **En esta sesión**: 0/33
- **Meta final**: 45/45 (100%)

---

## 🚦 Semáforo de Seguridad

### 🔴 CRÍTICO (sin validación = alto riesgo):
- Returns approve/reject (transacciones financieras)
- Orders PUT/PATCH (cambios de estado y datos)
- Recurring orders (afecta facturación futura)

### 🟡 MEDIO (sin validación = riesgo moderado):
- Chat messages (XSS posible)
- Client POST (datos personales)
- Notifications (spam posible)

### 🟢 BAJO (sin validación = riesgo bajo):
- Buyer favorites (solo preferencias)
- Chat schedules (solo configuración)
- Product tags (solo organización)

---

## ✅ Checklist Final

Una vez completado todo:
- [ ] Todos los endpoints POST tienen validación
- [ ] Todos los endpoints PUT/PATCH tienen validación
- [ ] Todos los campos de texto están sanitizados con DOMPurify
- [ ] Todos los UUIDs se validan con Zod
- [ ] Errores retornan detalles estructurados
- [ ] Documentación actualizada en VALIDACIONES_PROGRESO.md
- [ ] Testing manual de endpoints críticos
- [ ] Verificación de errores de TypeScript (0 errores)

---

**¿Comenzamos con la Fase 1 (CRÍTICO)?** 🚀
