# 📊 Guía Visual: Dónde Ver las Implementaciones

Esta guía te muestra exactamente dónde y cómo ver todas las herramientas de monitoreo y optimización que implementamos.

---

## 🎯 Resumen Rápido

| Herramienta | Dónde está el código | Dónde verla funcionando | Estado |
|-------------|---------------------|------------------------|--------|
| **Vercel Analytics** | `app/layout.tsx` | Dashboard de Vercel | ✅ Listo (después de deploy) |
| **Speed Insights** | `app/layout.tsx` | Dashboard de Vercel | ✅ Listo (después de deploy) |
| **Sentry** | `sentry.*.config.ts` | sentry.io | ⚠️ Necesita configuración |
| **React Query** | `hooks/useQueries.ts` | DevTools en navegador | ✅ Activo en desarrollo |
| **Image Optimization** | `next.config.js` | Network tab (DevTools) | ✅ Activo |
| **Backups** | `.github/workflows/` | GitHub Actions | ⚠️ Necesita DATABASE_URL secret |

---

## 1️⃣ VERCEL ANALYTICS - Tracking de Usuarios

### 📁 Código Implementado

**Archivo:** `app/layout.tsx` (líneas 7-8, 62)

```tsx
import { Analytics } from '@vercel/analytics/react'

// ... dentro del body
<Analytics />
```

### 👀 Cómo Verlo

#### A) En Desarrollo (Local)
No se ve en desarrollo. Solo funciona en producción de Vercel.

#### B) En Producción (Vercel)

1. **Despliega tu app a Vercel:**
   ```bash
   vercel --prod
   ```

2. **Ve al Dashboard:**
   - URL: https://vercel.com/dashboard
   - Selecciona tu proyecto "food-orders-crm"
   - Click en pestaña **"Analytics"**

3. **Qué verás:**
   - 📈 Visitantes en tiempo real
   - 📊 Top páginas visitadas
   - 🌍 Ubicación geográfica de usuarios
   - 📱 Dispositivos (Desktop/Mobile/Tablet)
   - 🔗 Rutas más populares
   - ⏱️ Tiempo de permanencia

#### C) Ejemplo de Métricas:

```
┌──────────────────────────────────────┐
│  Analytics Dashboard                  │
├──────────────────────────────────────┤
│  Visitors (Last 7 days)               │
│  ████████████ 1,234                   │
│                                       │
│  Top Pages:                           │
│  1. /dashboard        456 visits      │
│  2. /orders           234 visits      │
│  3. /products         123 visits      │
│                                       │
│  Top Countries:                       │
│  🇵🇦 Panama          78%              │
│  🇺🇸 USA             15%              │
│  🇨🇷 Costa Rica      7%               │
└──────────────────────────────────────┘
```

---

## 2️⃣ VERCEL SPEED INSIGHTS - Performance

### 📁 Código Implementado

**Archivo:** `app/layout.tsx` (líneas 8, 63)

```tsx
import { SpeedInsights } from '@vercel/speed-insights/next'

// ... dentro del body
<SpeedInsights />
```

### 👀 Cómo Verlo

#### En Producción (Vercel)

1. **Ve al Dashboard:**
   - https://vercel.com/dashboard
   - Tu proyecto → Pestaña **"Speed Insights"**

2. **Métricas Core Web Vitals:**

   - **LCP** (Largest Contentful Paint): ⏱️ Tiempo hasta que se carga el contenido principal
     - ✅ Bueno: < 2.5s
     - ⚠️ Necesita mejora: 2.5s - 4s
     - 🔴 Pobre: > 4s

   - **FID** (First Input Delay): ⌨️ Tiempo hasta que la página responde a interacciones
     - ✅ Bueno: < 100ms
     - ⚠️ Necesita mejora: 100ms - 300ms
     - 🔴 Pobre: > 300ms

   - **CLS** (Cumulative Layout Shift): 📐 Estabilidad visual (elementos que se mueven)
     - ✅ Bueno: < 0.1
     - ⚠️ Necesita mejora: 0.1 - 0.25
     - 🔴 Pobre: > 0.25

   - **TTFB** (Time to First Byte): 🌐 Velocidad del servidor
     - ✅ Bueno: < 800ms
     - ⚠️ Necesita mejora: 800ms - 1800ms
     - 🔴 Pobre: > 1800ms

3. **Ejemplo de Dashboard:**

```
┌──────────────────────────────────────┐
│  Speed Insights                       │
├──────────────────────────────────────┤
│  Overall Score: 92/100  ✅            │
│                                       │
│  LCP:  1.8s   ✅ Good                 │
│  FID:  45ms   ✅ Good                 │
│  CLS:  0.05   ✅ Good                 │
│  TTFB: 450ms  ✅ Good                 │
│                                       │
│  Real User Metrics (últimas 24h)     │
│  Desktop: 95/100                      │
│  Mobile:  88/100                      │
└──────────────────────────────────────┘
```

---

## 3️⃣ SENTRY - Error Tracking

### 📁 Código Implementado

**Archivos:**
- `sentry.client.config.ts` - Errores del navegador
- `sentry.server.config.ts` - Errores del servidor
- `sentry.edge.config.ts` - Errores en Edge Runtime
- `next.config.js` - Wrapper de Sentry
- `SENTRY_SETUP.md` - Guía completa de configuración

### 👀 Cómo Configurarlo y Verlo

#### Paso 1: Crear Cuenta en Sentry

1. Ve a https://sentry.io
2. Click en **"Start Free"**
3. Regístrate con GitHub o email
4. Crea un nuevo proyecto:
   - Platform: **Next.js**
   - Project name: `food-orders-crm`

#### Paso 2: Obtener Credenciales

Después de crear el proyecto, obtendrás:

```
DSN: https://abcd1234@o123456.ingest.sentry.io/789012
Organization: tu-organizacion
Project: food-orders-crm
Auth Token: (generado en User Settings → Auth Tokens)
```

#### Paso 3: Agregar a `.env.local`

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://tu-dsn-aqui@o123456.ingest.sentry.io/789012
SENTRY_ORG=tu-organizacion
SENTRY_PROJECT=food-orders-crm
SENTRY_AUTH_TOKEN=tu-token-aqui
```

#### Paso 4: Ver Errores en Dashboard

1. **Dashboard:** https://sentry.io
2. **Qué verás:**
   - 🐛 Todos los errores capturados
   - 📊 Gráficas de frecuencia
   - 🔍 Stack traces detallados
   - 👤 Usuario afectado (si está autenticado)
   - 🌐 Browser/OS del usuario
   - 📍 Línea exacta del código con error
   - 🎬 Session replay (reproducir lo que hizo el usuario)

#### Ejemplo de Error Capturado:

```
┌──────────────────────────────────────┐
│  TypeError: Cannot read 'name'        │
│  of undefined                         │
├──────────────────────────────────────┤
│  📅 Oct 30, 2025 3:45 PM              │
│  👤 User: seller@example.com          │
│  🌐 Chrome 119 on Windows 11          │
│  📱 Desktop - 1920x1080               │
│                                       │
│  Stack Trace:                         │
│  ❌ app/products/page.tsx:145         │
│     const name = product.name         │
│     ↑ product is undefined            │
│                                       │
│  Breadcrumbs (últimas acciones):      │
│  1. Navegó a /products                │
│  2. Hizo click en "Ver más"           │
│  3. API call a /api/products/123      │
│  4. ❌ Error                           │
└──────────────────────────────────────┘
```

---

## 4️⃣ REACT QUERY - Caching y DevTools

### 📁 Código Implementado

**Archivos:**
- `components/providers/QueryProvider.tsx` - Configuración global
- `hooks/useQueries.ts` - Hooks personalizados (9 hooks)
- `app/layout.tsx` - Wrapeado con QueryProvider

### 👀 Cómo Verlo

#### A) En el Código (Usar los Hooks)

**Antes** (sin cache):
```tsx
// Hacía fetch cada vez que montabas el componente
const [orders, setOrders] = useState([])
useEffect(() => {
  fetch('/api/orders').then(...)
}, [])
```

**Ahora** (con cache):
```tsx
import { useOrders } from '@/hooks/useQueries'

// Cache automático de 2 minutos
const { data: orders, isLoading, error } = useOrders()

// Si vuelves a esta página en <2 min, NO hace otra llamada API
// Los datos se reutilizan del cache ⚡
```

#### B) React Query DevTools en el Navegador

1. **Inicia tu app en desarrollo:**
   ```bash
   npm run dev
   ```

2. **Abre tu navegador:**
   ```
   http://localhost:3000
   ```

3. **Busca el ícono en la esquina inferior izquierda:**
   ```
   ┌──────────────────────────────────┐
   │                                  │
   │                                  │
   │                                  │
   │                                  │
   │                                  │
   │  [🌸 React Query]  ← Click aquí │
   └──────────────────────────────────┘
   ```

4. **Se abrirá el panel de DevTools:**

```
┌────────────────────────────────────────────────┐
│  React Query DevTools                          │
├────────────────────────────────────────────────┤
│  Queries (5)                                   │
│                                                │
│  🟢 ['orders']                 fresh (1.2 min) │
│     Cached: 15 items                           │
│     Last fetched: 2s ago                       │
│     Stale in: 58s                              │
│                                                │
│  🟢 ['products']               fresh (3.8 min) │
│     Cached: 42 items                           │
│     Last fetched: 1m ago                       │
│     Stale in: 3m 12s                           │
│                                                │
│  🟡 ['stats']                  stale           │
│     Cached: {...}                              │
│     Will refetch in background                 │
│                                                │
│  🔴 ['clients']                fetching...     │
│     Loading...                                 │
│                                                │
│  ⚪ ['dashboard-analytics']    inactive        │
│     Not used in current page                   │
└────────────────────────────────────────────────┘
```

#### C) Ver el Impacto en Network

1. **Abre DevTools del navegador** (F12)
2. **Ve a la pestaña Network**
3. **Navega entre páginas:**

**SIN React Query:**
```
Dashboard → Orders → Dashboard → Orders
  ↓           ↓           ↓           ↓
 4 API       3 API       4 API       3 API
 calls       calls       calls       calls

Total: 14 API calls 😰
```

**CON React Query:**
```
Dashboard → Orders → Dashboard → Orders
  ↓           ↓           ↓           ↓
 4 API       3 API      (cache)     (cache)
 calls       calls      0 calls     0 calls

Total: 7 API calls ⚡ (50% menos!)
```

#### D) Hooks Disponibles

En `hooks/useQueries.ts` tienes estos hooks listos para usar:

```tsx
// Órdenes
useOrders(status?)          // Cache: 2 min
useRecentOrders(limit)      // Cache: 1 min

// Productos
useProducts(search?)        // Cache: 5 min
useLowStockProducts()       // Cache: 3 min

// Clientes
useClients(page, search?)   // Cache: 5 min

// Estadísticas
useStats()                  // Cache: 2 min + auto-refetch cada 5 min
useDashboardAnalytics()     // Cache: 3 min + auto-refetch cada 10 min

// Mutaciones
useCreateOrder()            // Invalida cache de orders al crear
useUpdateOrderStatus()      // Invalida cache al actualizar
useOptimisticOrderUpdate()  // Actualización optimista (UI instantánea)
```

---

## 5️⃣ IMAGE OPTIMIZATION - Next.js Image

### 📁 Código Implementado

**Archivos:**
- `next.config.js` - Configuración de `remotePatterns`
- `components/chat/ChatWindow.tsx` - Imágenes en chat
- `app/buyer/catalog/page.tsx` - Imágenes de productos
- `app/buyer/cart/page.tsx` - Imágenes en carrito

### 👀 Cómo Verlo

#### A) En el Código

**Antes:**
```tsx
<img 
  src={product.imageUrl} 
  alt={product.name}
  className="w-24 h-24"
/>
```

**Ahora:**
```tsx
import Image from 'next/image'

<Image 
  src={product.imageUrl} 
  alt={product.name}
  width={96}
  height={96}
  sizes="96px"
/>
// Automáticamente:
// - Lazy loading ✅
// - WebP conversion ✅
// - Responsive sizes ✅
// - Blur placeholder ✅
```

#### B) Ver la Optimización en Acción

1. **Abre DevTools** (F12)
2. **Ve a Network → Img**
3. **Recarga la página**
4. **Observa las imágenes:**

**Imagen Original:**
```
product-photo.jpg
Size: 2.4 MB
Format: JPEG
Dimensions: 4000x3000
Load time: 1.8s
```

**Con Next.js Image:**
```
product-photo.jpg?w=96&q=75
Size: 8.5 KB  ⚡ (99.6% más pequeño!)
Format: WebP
Dimensions: 96x96 (scaled)
Load time: 120ms  ⚡ (15x más rápido!)
```

#### C) Ver Lazy Loading

1. **Abre el catálogo** (`/buyer/catalog`)
2. **Abre DevTools → Network → Img**
3. **Scroll lentamente hacia abajo**
4. **Observa:** Las imágenes solo se cargan cuando están por aparecer en pantalla

```
[Scroll Down]
  ↓
[Image 1 appears]  → Request sent ✅
[Image 2 appears]  → Request sent ✅
[Image 3 appears]  → Request sent ✅

Images 4-20: Not loaded yet (saving bandwidth) ⚡
```

---

## 6️⃣ BACKUPS AUTOMÁTICOS - GitHub Actions

### 📁 Código Implementado

**Archivos:**
- `.github/workflows/database-backup.yml` - Workflow automático
- `VERCEL_POSTGRES_BACKUPS.md` - Guía completa

### 👀 Cómo Verlo

#### Paso 1: Configurar GitHub Secret

1. **Ve a tu repositorio:**
   ```
   https://github.com/tucano1306/CRM
   ```

2. **Settings → Secrets and variables → Actions**

3. **Click en "New repository secret"**
   - Name: `DATABASE_URL`
   - Value: Tu connection string de Vercel Postgres
     ```
     postgres://user:pass@host:5432/database?sslmode=require
     ```

#### Paso 2: Ver Backups Ejecutándose

1. **Ve a GitHub Actions:**
   ```
   https://github.com/tucano1306/CRM/actions
   ```

2. **Verás el workflow "Database Backup":**

```
┌──────────────────────────────────────────────────┐
│  Database Backup                                 │
├──────────────────────────────────────────────────┤
│  ✅ #1 - Oct 30, 2025 2:00 AM                    │
│     Duration: 42s                                │
│     Backup size: 2.3 MB (compressed)             │
│     Status: Success                              │
│                                                  │
│  ✅ #2 - Oct 29, 2025 2:00 AM                    │
│     Duration: 38s                                │
│     Backup size: 2.1 MB (compressed)             │
│     Status: Success                              │
│                                                  │
│  ⏱️ Next run: Oct 31, 2025 2:00 AM               │
└──────────────────────────────────────────────────┘
```

#### Paso 3: Descargar un Backup

1. **Click en un workflow exitoso**
2. **Scroll hasta "Artifacts"**
3. **Click en "database-backup-123"**
4. **Descarga el archivo `.gz`**
5. **Descomprime:**
   ```bash
   gunzip backup-20251030-020000.sql.gz
   ```

#### Paso 4: Ejecutar Backup Manual

1. **Ve a Actions → Database Backup**
2. **Click en "Run workflow"**
3. **Select branch: main**
4. **Click en "Run workflow" verde**
5. **Espera 30-60 segundos**
6. **Descarga desde Artifacts**

---

## 🧪 Cómo Probar Todo Junto

### Test Completo de Monitoreo

```bash
# 1. Iniciar en desarrollo
npm run dev

# 2. Abrir navegador
http://localhost:3000

# 3. Abrir DevTools (F12)
```

#### Checklist de Verificación:

**React Query DevTools:**
- [ ] Ícono visible en esquina inferior izquierda
- [ ] Al hacer click, se abre panel de queries
- [ ] Queries aparecen cuando navegas

**Image Optimization:**
- [ ] Network → Img muestra formato WebP
- [ ] Imágenes tienen parámetros `?w=` en URL
- [ ] Lazy loading funciona (imágenes cargan al scroll)

**Sentry (si configuraste DSN):**
- [ ] Prueba un error intencional:
  ```tsx
  throw new Error('Test Sentry')
  ```
- [ ] Verifica que aparece en sentry.io

**Analytics (después de deploy a Vercel):**
- [ ] Dashboard de Vercel muestra visitantes
- [ ] Speed Insights muestra métricas Core Web Vitals

**Backups:**
- [ ] GitHub Actions muestra workflows
- [ ] Ejecuta backup manual
- [ ] Descarga y verifica el archivo SQL

---

## 📱 Acceso Rápido

### URLs Importantes

```
🚀 Tu App (Local):
   http://localhost:3000

📊 Vercel Dashboard:
   https://vercel.com/dashboard
   → Analytics
   → Speed Insights

🐛 Sentry Dashboard:
   https://sentry.io
   → Issues
   → Performance

🔄 GitHub Actions:
   https://github.com/tucano1306/CRM/actions

📚 Documentación:
   ./SENTRY_SETUP.md
   ./VERCEL_POSTGRES_BACKUPS.md
```

### Comandos Útiles

```bash
# Desarrollo (con React Query DevTools)
npm run dev

# Build de producción
npm run build

# Deploy a Vercel
vercel --prod

# Ver logs de Sentry (si configurado)
# (Automático en sentry.io)

# Ejecutar backup manual (local)
pg_dump $DATABASE_URL > backup.sql

# Ejecutar tests
npm test

# Ver coverage de tests
npm test -- --coverage
```

---

## 🎯 Próximos Pasos

Ahora que todo está implementado:

1. **Desplegar a Vercel** para ver Analytics y Speed Insights
2. **Configurar Sentry** siguiendo `SENTRY_SETUP.md`
3. **Agregar `DATABASE_URL`** a GitHub Secrets para backups
4. **Monitorear métricas** semanalmente
5. **Revisar errores** en Sentry
6. **Optimizar** basado en Speed Insights

---

**Última actualización:** Octubre 30, 2025  
**Mantenido por:** GitHub Copilot  
**Versión:** 2.0 (Post-MMP Optimizations)
