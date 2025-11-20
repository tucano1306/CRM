# 🏗️ Stack Técnico - Food Orders CRM

> Plantilla de referencia para futuros proyectos con arquitectura similar

---

## 📋 Información General

- **Nombre del Proyecto**: Food Orders CRM
- **Tipo**: Sistema de gestión de órdenes B2B
- **Arquitectura**: Full-stack monolítico con API REST
- **Deployment**: Vercel (serverless)
- **Base de datos**: PostgreSQL en Neon (serverless)

---

## 🎯 Stack Principal

### Frontend Framework
- **Next.js 15.5.3** (App Router)
  - React 19.0.0
  - TypeScript 5.x (strict mode)
  - Server Components por defecto
  - Client Components donde sea necesario (`'use client'`)

### Estilización
- **Tailwind CSS 3.4.17**
  - Configuración personalizada en `tailwind.config.js`
  - PostCSS para procesamiento
  - Clases utility-first
- **Shadcn/ui** (componentes base)
  - Radix UI primitives
  - Componentes en `components/ui/`
  - Totalmente customizables

### Iconos
- **Lucide React**
  - Iconos modernos y ligeros
  - Tree-shakeable
  - Reemplazo de react-icons

---

## 🗄️ Base de Datos

### ORM y Proveedor
- **Prisma 5.20.0**
  - Schema en `prisma/schema.prisma`
  - Migraciones en `prisma/migrations/`
  - Cliente TypeScript type-safe
- **PostgreSQL** (Neon serverless)
  - Connection pooling automático
  - Configurado para serverless
  - URL en variable `DATABASE_URL`

### Patrón de acceso a BD
```typescript
// lib/prisma.ts - Singleton pattern
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### Convenciones
- Nombres de modelos: PascalCase (ej: `Product`, `Order`)
- Nombres de tablas: snake_case con `@@map()` (ej: `@@map("products")`)
- IDs: UUID por defecto (`@default(uuid())`)
- Timestamps: `createdAt` y `updatedAt` automáticos
- Relaciones: Siempre con índices

---

## 🔐 Autenticación y Autorización

### Proveedor
- **Clerk** (`@clerk/nextjs`)
  - OAuth social (Google, GitHub, etc.)
  - Email + password
  - OTP/Magic links
  - Middleware automático

### Implementación
```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
```

### Gestión de roles
- Roles en `public_metadata` de Clerk
- Tabla `authenticated_users` para mapeo
- Roles: `ADMIN`, `SELLER`, `CLIENT`
- Middleware valida roles por ruta

---

## 🛣️ Estructura de Rutas (App Router)

### Convenciones
```
app/
├── (auth)/                    # Layout de autenticación
│   ├── sign-in/
│   └── sign-up/
├── api/                       # API routes
│   ├── products/
│   │   ├── route.ts          # GET /api/products, POST /api/products
│   │   └── [id]/
│   │       ├── route.ts      # GET, PATCH, DELETE /api/products/[id]
│   │       └── tags/route.ts # Subrutas
│   ├── orders/
│   ├── returns/
│   └── webhooks/
├── dashboard/                 # Páginas privadas
│   └── page.tsx
├── products/
│   └── page.tsx
├── layout.tsx                 # Root layout
└── page.tsx                   # Home page
```

### API Routes pattern
```typescript
// app/api/[resource]/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  
  // Lógica de negocio
  const data = await prisma.resource.findMany()
  
  return NextResponse.json({ success: true, data })
}
```

---

## 📦 Gestión de Estado

### Cliente
- **React useState/useCallback/useEffect** (hooks nativos)
- **Context API** para estado global mínimo (providers)
- No se usa Redux, Zustand ni otros state managers

### Servidor
- **Server Components** por defecto (sin estado)
- **Server Actions** para mutaciones (futuro)
- Cache en edge con `cache()` de React

---

## 🌐 Comunicación Cliente-Servidor

### Cliente HTTP
```typescript
// lib/api-client.ts
export async function apiCall(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  
  return response.json()
}
```

### Timeouts y resilencia
```typescript
// lib/timeout-utils.ts
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export async function withPrismaTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs = 10000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new TimeoutError('Query timeout')), timeoutMs)
    ),
  ])
}
```

---

## 🎨 Componentes UI

### Estructura
```
components/
├── ui/                        # Shadcn primitivos
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...
├── shared/                    # Componentes reutilizables
│   ├── MainLayout.tsx
│   ├── PageHeader.tsx
│   └── SmartNavigation.tsx
├── products/                  # Feature-specific
│   ├── ProductCard.tsx
│   └── ProductModal.tsx
├── orders/
├── returns/
└── skeletons/                 # Loading states
    └── ProductCardSkeleton.tsx
```

### Patrón de componente
```typescript
'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  title: string
  onAction?: () => void
}

export default function MyComponent({ title, onAction }: Props) {
  const [state, setState] = useState(false)
  
  return (
    <Card>
      <CardContent>
        <h2>{title}</h2>
        <button onClick={onAction}>Action</button>
      </CardContent>
    </Card>
  )
}
```

---

## 📧 Email y Notificaciones

### Proveedor
- **Resend** (emails transaccionales)
  - API Key en `RESEND_API_KEY`
  - Domain verificado necesario para producción
  - Templates en React (opcional)

### Implementación
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'CRM <noreply@tudominio.com>',
  to: user.email,
  subject: 'Orden confirmada',
  html: '<p>Tu orden ha sido confirmada</p>',
})
```

### Sistema de notificaciones interno
- Tabla `notifications` en BD
- Push notifications en dashboard
- Polling cada 30s con `setInterval`

---

## 🔄 Realtime y Webhooks

### Webhooks de Clerk
```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'

export async function POST(req: Request) {
  const payload = await req.text()
  const headers = {
    'svix-id': req.headers.get('svix-id'),
    'svix-timestamp': req.headers.get('svix-timestamp'),
    'svix-signature': req.headers.get('svix-signature'),
  }
  
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)
  const evt = wh.verify(payload, headers)
  
  // Procesar evento
  if (evt.type === 'user.created') {
    // Crear registro en BD
  }
  
  return new Response('OK', { status: 200 })
}
```

### Eventos en tiempo real
- **Supabase Realtime** (opcional)
- Eventos custom: `ORDER_STATUS_CHANGED`, etc.

---

## 🧪 Testing

### Framework
- **Jest 29.7.0**
  - Configuración en `jest.config.js`
  - Setup en `jest.setup.js`
- **@testing-library/react** (unit tests)
- **Playwright** (E2E tests)
  - Config en `playwright.config.ts`

### Estructura de tests
```
__tests__/
├── app/                       # Tests de páginas
├── components/                # Tests de componentes
├── lib/                       # Tests de utilidades
└── unit/                      # Tests unitarios
```

### Patrón de test
```typescript
import { render, screen } from '@testing-library/react'
import MyComponent from '@/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
})
```

---

## 📊 Monitoreo y Errores

### Sentry
- **@sentry/nextjs**
- Configuración en `sentry.*.config.ts`
- Captura automática de errores
- Source maps en producción

### Logging
```typescript
// Patrón de logging consistente
console.log('🔍 [MODULE] Action:', data)
console.error('❌ [MODULE] Error:', error)
console.warn('⚠️ [MODULE] Warning:', warning)
```

---

## 🚀 Deployment y CI/CD

### Plataforma
- **Vercel** (deployment automático)
  - Git push → Deploy automático
  - Preview deployments en PRs
  - Edge Functions automáticas
  - Environment variables en dashboard

### Variables de entorno
```env
# Database
DATABASE_URL="postgresql://..."

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Email
RESEND_API_KEY="re_..."

# Monitoring
SENTRY_DSN="https://..."
```

### Scripts de package.json
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio",
    "prisma:reset": "prisma migrate reset",
    "test": "jest",
    "test:e2e": "playwright test"
  }
}
```

---

## 🏗️ Arquitectura de Datos

### Modelos principales
```prisma
model Client {
  id                       String   @id @default(uuid())
  name                     String
  email                    String
  orderConfirmationMethod  OrderConfirmationMethod @default(MANUAL)
  orderConfirmationEnabled Boolean  @default(true)
  sellerId                 String?
  
  seller                   Seller?  @relation(fields: [sellerId], references: [id])
  orders                   Order[]
  authenticated_users      authenticated_users[]
  
  @@index([email])
  @@index([sellerId])
  @@map("clients")
}

model Product {
  id          String          @id @default(uuid())
  name        String
  description String?
  price       Float           @default(0)
  stock       Int             @default(0)
  isActive    Boolean         @default(true)
  
  sellers     ProductSeller[]
  orderItems  OrderItem[]
  
  @@index([name])
  @@index([isActive])
  @@map("products")
}

model Order {
  id           String      @id @default(uuid())
  orderNumber  String      @unique
  totalAmount  Float
  status       OrderStatus @default(PENDING)
  clientId     String
  sellerId     String
  
  client       Client      @relation(fields: [clientId], references: [id])
  seller       Seller      @relation(fields: [sellerId], references: [id])
  orderItems   OrderItem[]
  
  @@index([orderNumber])
  @@index([clientId])
  @@index([sellerId])
  @@index([status])
  @@map("orders")
}
```

### Relaciones comunes
- **1:N** - Un seller tiene muchos clients
- **M:N** - Productos y sellers (tabla `product_sellers`)
- **Cascade deletes** - OrderItems se eliminan con Order

---

## 🔧 Utilidades y Helpers

### Formateo
```typescript
// lib/utils.ts
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('es-CO').format(new Date(date))
}
```

### Validación
```typescript
// lib/validation.ts
import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  price: z.number().positive('Precio debe ser positivo'),
  stock: z.number().int().nonnegative('Stock no puede ser negativo'),
})

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data)
}
```

---

## 📱 PWA y Mobile

### Configuración
```json
// public/manifest.json
{
  "name": "Food Orders CRM",
  "short_name": "CRM",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#6366f1",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}
```

### Service Worker
- Generado automáticamente por Next.js
- Cache de assets estáticos
- Offline fallback

---

## 🎯 Patrones y Mejores Prácticas

### Seguridad
✅ Validar `userId` en todas las API routes  
✅ Usar Prisma para prevenir SQL injection  
✅ Sanitizar inputs del usuario  
✅ Rate limiting en endpoints críticos  
✅ CORS configurado en middleware  

### Performance
✅ Server Components por defecto  
✅ Dynamic imports para modales  
✅ Imágenes con Next/Image  
✅ Timeouts en queries de BD  
✅ Índices en columnas frecuentes  

### UX
✅ Loading skeletons  
✅ Error boundaries  
✅ Optimistic updates  
✅ Toast notifications  
✅ Mobile-first responsive  

---

## 📚 Dependencias Clave

```json
{
  "dependencies": {
    "next": "15.5.3",
    "react": "19.0.0",
    "typescript": "^5",
    "@prisma/client": "5.20.0",
    "@clerk/nextjs": "^6.9.3",
    "tailwindcss": "^3.4.17",
    "lucide-react": "^0.468.0",
    "resend": "^4.0.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "prisma": "5.20.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "jest": "^29.7.0",
    "@testing-library/react": "^16.1.0",
    "playwright": "^1.49.1",
    "@sentry/nextjs": "^8"
  }
}
```

---

## 🎓 Recursos y Documentación

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Clerk Docs](https://clerk.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Shadcn/ui](https://ui.shadcn.com)

---

## 🔄 Comandos de Desarrollo Frecuentes

```bash
# Desarrollo local
npm run dev

# Generar cliente Prisma después de cambios en schema
npm run prisma:generate

# Crear migración de BD
npm run prisma:migrate

# Ver BD en navegador
npm run prisma:studio

# Reiniciar BD completa
npm run prisma:reset

# Build de producción
npm run build

# Tests
npm test
npm run test:e2e

# Linting
npm run lint
```

---

## 📝 Notas Importantes

### Para proyectos futuros basados en esta plantilla:

1. **Cambiar credenciales**: Regenerar todas las API keys
2. **Personalizar branding**: Logo, colores, nombres
3. **Revisar permisos**: Ajustar roles según necesidad
4. **Configurar dominios**: Email, webhooks, URLs
5. **Adaptar modelos**: Modificar schema según negocio
6. **Testing**: Crear tests para lógica específica
7. **Documentación**: Actualizar este documento con cambios

### Esta plantilla es ideal para:
✅ Aplicaciones B2B/CRM  
✅ E-commerce interno  
✅ Sistemas de gestión multi-rol  
✅ Dashboards con autenticación  
✅ APIs REST con PostgreSQL  

---

**Última actualización**: 20 de noviembre de 2025  
**Versión**: 1.0.0
