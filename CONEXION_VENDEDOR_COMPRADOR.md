# 🔗 Lógica de Conexión entre Vendedor y Comprador

## 📊 Arquitectura de Datos

### Modelos Principales

```
authenticated_users (Clerk Auth)
    ↓
    ├── sellers[] (Vendedores)
    └── clients[] (Compradores)
```

### Relaciones en la Base de Datos

```prisma
model authenticated_users {
  id       String   @id
  authId   String   @unique  // ID de Clerk
  email    String   @unique
  name     String
  role     UserRole @default(CLIENT)
  
  clients  Client[] @relation("ClientUsers")   // Muchos a muchos
  sellers  Seller[] @relation("SellerUsers")   // Muchos a muchos
}

model Seller {
  id      String @id @default(uuid())
  name    String
  email   String @unique
  
  authenticated_users authenticated_users[] @relation("SellerUsers")
  clients             Client[]              // Un seller tiene muchos clientes
}

model Client {
  id       String  @id @default(uuid())
  name     String
  email    String
  sellerId String? // ⬅️ CAMPO CRÍTICO: ID del vendedor asignado
  
  seller              Seller?               @relation(fields: [sellerId], references: [id])
  authenticated_users authenticated_users[] @relation("ClientUsers")
}
```

---

## 🔄 Flujos de Conexión

### 1️⃣ **Registro de Usuario Nuevo (Webhook de Clerk)**

**Archivo**: `app/api/webhooks/clerk/route.tsx`

```typescript
// Cuando un usuario se registra en Clerk
POST /api/webhooks/clerk

Evento: "user.created"
  ↓
1. Clerk envía webhook con datos del usuario
2. Se crea registro en authenticated_users:
   {
     authId: "clerk_user_123",
     email: "usuario@example.com",
     name: "Juan Pérez",
     role: "CLIENT"  // Por defecto
   }
3. 🔗 BUSCA AUTOMÁTICAMENTE cliente con mismo email
4. ✅ Si encuentra, VINCULA automáticamente:
   - El usuario puede autenticarse inmediatamente
   - Ve el catálogo del seller asignado
   - Puede hacer órdenes desde el primer login
5. ℹ️ Si NO encuentra, usuario queda sin vincular
```

**Estado después del registro (CON auto-link):**
- ✅ Usuario puede autenticarse
- ✅ SI existe client con mismo email → Inmediatamente funcional
- ✅ Puede ver productos del seller
- ✅ Puede hacer órdenes

**Estado después del registro (SIN auto-link):**
- ✅ Usuario puede autenticarse
- ❌ No puede hacer órdenes (no es Client)
- ❌ No puede ver productos de seller específico

---

### 2️⃣ **Conversión a Cliente (Manual)**

**Archivo**: `scripts/register-as-client.js`

```typescript
// Proceso manual para convertir un authenticated_user en Client
node scripts/register-as-client.js

Pasos:
  ↓
1. Busca el authenticated_user más reciente
2. Busca un seller disponible (el primero en la BD)
3. Crea registro de Client:
   {
     name: "Juan Pérez",
     email: "usuario@example.com",
     sellerId: "seller_abc_123",  // ⬅️ ASIGNACIÓN AUTOMÁTICA
     authenticated_users: { connect: { id: "auth_user_id" } }
   }
4. Actualiza rol en authenticated_users a "CLIENT"
5. Usuario debe actualizar rol en Clerk también
```

**Estado después de la conversión:**
- ✅ Usuario es Client
- ✅ Tiene seller asignado
- ✅ Puede ver productos del seller
- ✅ Puede hacer órdenes

---

### 3️⃣ **Vendedor Crea Cliente Directamente**

**Archivo**: `app/api/clients/route.tsx` (POST)

```typescript
// Cuando un vendedor crea un cliente desde la UI
POST /api/clients

Body:
{
  name: "Restaurant ABC",
  email: "restaurant@abc.com",
  phone: "555-1234",
  address: "123 Main St"
}

Backend:
  ↓
1. Obtiene seller del usuario autenticado:
   const { userId } = await auth()
   const seller = await prisma.seller.findFirst({
     where: { authenticated_users: { some: { authId: userId } } }
   })

2. Crea Client con sellerId automático:
   await prisma.client.create({
     data: {
       ...datos,
       sellerId: seller.id  // ⬅️ ASIGNACIÓN AUTOMÁTICA
     }
   })

3. ❌ NO crea authenticated_user (cliente no puede loguearse todavía)
```

**Estado después de creación:**
- ✅ Client existe en BD
- ✅ Tiene seller asignado
- ❌ No puede autenticarse (no tiene authenticated_user)
- ✅ Seller puede crear órdenes para este cliente

---

### 4️⃣ **Vincular Cliente Existente con Usuario Autenticado**

**Escenario**: Cliente ya existe en BD, usuario se registra después

**Opción A - Manual (SQL)**:
```sql
-- Vincular authenticated_user existente con client existente
UPDATE authenticated_users
SET clients = array_append(clients, 'client_id')
WHERE authId = 'clerk_user_123';

-- O crear la relación en tabla intermedia (si existe)
INSERT INTO _ClientUsers (A, B)
VALUES ('client_id', 'auth_user_id');
```

**Opción B - Script personalizado**:
```javascript
// scripts/link-user-to-client.js
const authUser = await prisma.authenticated_users.findUnique({
  where: { email: "restaurant@abc.com" }
})

const client = await prisma.client.findUnique({
  where: { email: "restaurant@abc.com" }
})

// Conectar
await prisma.client.update({
  where: { id: client.id },
  data: {
    authenticated_users: {
      connect: { id: authUser.id }
    }
  }
})
```

---

## 🔒 Seguridad y Filtrado Multi-tenant

### Patrón Implementado

Todos los endpoints de SELLER filtran por `sellerId` automáticamente:

```typescript
// ✅ PATRÓN CORRECTO (ya implementado)

// 1. Obtener seller del usuario autenticado
const { userId } = await auth()
const seller = await prisma.seller.findFirst({
  where: {
    authenticated_users: {
      some: { authId: userId }
    }
  }
})

// 2. FILTRAR siempre por sellerId
const products = await prisma.product.findMany({
  where: {
    sellers: {
      some: { sellerId: seller.id }  // ⬅️ FILTRO OBLIGATORIO
    }
  }
})

const clients = await prisma.client.findMany({
  where: {
    sellerId: seller.id  // ⬅️ FILTRO OBLIGATORIO
  }
})

const orders = await prisma.order.findMany({
  where: {
    sellerId: seller.id  // ⬅️ FILTRO OBLIGATORIO
  }
})
```

**Endpoints que implementan este patrón:**
- ✅ GET/POST /api/products
- ✅ GET/POST /api/clients
- ✅ GET /api/orders
- ✅ GET/POST /api/quotes

---

## 🎯 Casos de Uso Comunes

### Caso 1: Nuevo Usuario se Registra como Comprador

```
ESCENARIO A - Cliente YA existe en BD:
1. Vendedor creó cliente previamente: "restaurant@abc.com"
2. Usuario se registra en Clerk con "restaurant@abc.com"
   → Webhook crea authenticated_users
   → 🔗 BUSCA cliente con mismo email
   → ✅ ENCUENTRA y vincula automáticamente
3. ✅ Usuario puede acceder a /buyer/* inmediatamente
   → Ve productos de su seller
   → Puede hacer órdenes desde el primer login

ESCENARIO B - Cliente NO existe en BD:
1. Usuario se registra en Clerk con "nuevo@ejemplo.com"
   → Webhook crea authenticated_users
   → 🔍 Busca cliente con mismo email
   → ❌ No encuentra nada
2. ❌ No puede acceder a /buyer/* todavía
   → Necesita que seller lo cree como cliente
   → O ejecutar script register-as-client.js
```

---

### Caso 2: Vendedor Crea Cliente desde UI

```
FLUJO ESTÁNDAR (Recomendado):
1. Seller va a /clients
2. Click en "Nuevo Cliente"
3. Completa formulario con email: "restaurant@abc.com"
4. Backend crea Client con sellerId=seller.id
5. ✅ Seller puede crear órdenes para este cliente
6. ✅ Cliente puede registrarse después con mismo email
   → Webhook vincula automáticamente ✨
   → Acceso inmediato al sistema

FLUJO ANTIGUO (Sin email):
1. Seller crea cliente sin email
2. ✅ Seller puede crear órdenes
3. ❌ Cliente nunca podrá autenticarse
   → Solo puede recibir órdenes vía vendedor
```

---

### Caso 3: Múltiples Vendedores para un Cliente

**⚠️ LIMITACIÓN ACTUAL**: Un client solo puede tener **UN** seller

```prisma
model Client {
  sellerId String?  // ⬅️ Solo un ID, no array
  seller   Seller?  @relation(fields: [sellerId], references: [id])
}
```

**Para soportar múltiples sellers**, necesitarías:

```prisma
// OPCIÓN: Tabla intermedia (no implementado)
model ClientSeller {
  clientId String
  sellerId String
  client   Client @relation(...)
  seller   Seller @relation(...)
  @@unique([clientId, sellerId])
}
```

---

## 📋 Resumen de Estados

| Estado | authenticated_user | Client | Seller | Puede hacer |
|--------|-------------------|--------|---------|-------------|
| Usuario nuevo | ✅ | ❌ | ❌ | Login, nada más |
| Cliente registrado | ✅ | ✅ | ✅ (asignado) | Ver productos, ordenar |
| Vendedor | ✅ | ❌ | ✅ (es el seller) | Gestionar productos, clientes, órdenes |
| Admin | ✅ | ❌ | ❌ | Acceso total |

---

## 🔧 Herramientas Disponibles

### Scripts para gestión de usuarios:

1. **`register-as-client.js`** - Convierte authenticated_user en Client
2. **`set-user-role-client.js`** - Actualiza role en Clerk
3. **`create-seller-relation.sql`** - SQL para crear relaciones
4. **`link-client-auth.sql`** - Vincula Client con Auth
5. **`verify-complete-chain.sql`** - Verifica todas las relaciones

### Endpoints de debugging:

- `GET /api/debug/my-info` - Ver tu info completa
- `GET /api/debug/auth-status` - Estado de autenticación
- `GET /api/debug/user-role` - Ver rol actual

---

## 💡 Recomendaciones

### ✅ Ya Implementado:

1. **✅ Vinculación automática por email**
   ```typescript
   // En webhook de Clerk user.created
   if (eventType === 'user.created') {
     const newUser = await prisma.authenticated_users.create({...})
     
     // 🔗 Buscar client con mismo email
     const existingClient = await prisma.client.findFirst({
       where: { email: userEmail }
     })
     
     if (existingClient) {
       // Vincular automáticamente
       await prisma.client.update({
         where: { id: existingClient.id },
         data: {
           authenticated_users: {
             connect: { id: newUser.id }
           }
         }
       })
       console.log('✅ Usuario vinculado automáticamente')
     }
   }
   ```

### 🔮 Próximas Mejoras:
   - Página /admin/assign-seller
   - Lista de clientes sin seller
   - Dropdown para seleccionar seller

3. **Validación de seller en middleware**
   ```typescript
   // Verificar que client tenga seller antes de acceder a /buyer/*
   if (pathname.startsWith('/buyer')) {
     const client = await getClientForUser(userId)
     if (!client || !client.sellerId) {
       return redirect('/setup-required')
     }
   }
   ```

---

## ❓ Preguntas Frecuentes

### ¿Por qué un usuario puede ser seller Y client?

Las relaciones son many-to-many:
- Un `authenticated_user` puede tener múltiples `sellers[]`
- Un `authenticated_user` puede tener múltiples `clients[]`
- Esto permite casos como: vendedor que también compra

### ¿Cómo se decide qué rol usar?

```typescript
// middleware.ts usa esta lógica:
1. Busca en session.claims.role
2. Si no existe, busca en public_metadata.role
3. Si tiene sellers[], asigna SELLER
4. Si tiene clients[], asigna CLIENT
5. Por defecto: CLIENT
```

### ¿Qué pasa si un client no tiene seller?

- ❌ No puede ver productos (query retorna vacío)
- ❌ No puede hacer órdenes (falla validación)
- ✅ Puede loguearse y ver UI vacía
- Solución: Asignar seller manualmente o automáticamente

---

## 🚀 Próximos Pasos Sugeridos

1. **Automatizar asignación de seller** en webhook
2. **UI de administración** para gestionar relaciones
3. **Soporte multi-seller por cliente** (si es necesario)
4. **Onboarding flow** para nuevos usuarios
5. **Notificaciones** cuando se asigna seller
