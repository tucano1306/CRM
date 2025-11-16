# 🚀 Estrategia de Caching - Plan de Implementación

## Estado Actual: ❌ Sin SSG/ISR

El proyecto actualmente NO implementa Static Site Generation (SSG) ni Incremental Static Regeneration (ISR). Todas las páginas son client-side rendered.

## 📋 Plan de Implementación SSG/ISR

### 1. Páginas Candidatas para SSG

#### ✅ Páginas Públicas (Ideal para SSG)
```typescript
// app/page.tsx - Landing page
export const metadata = {
  title: 'Bargain - Food Orders CRM',
  description: 'Sistema de gestión de pedidos de comida'
}

// Convertir a SSG - No requiere autenticación
```

#### ✅ Páginas de Catálogo (Ideal para ISR)
```typescript
// app/buyer/catalog/page.tsx
// Productos cambian ocasionalmente - perfecto para ISR

export const revalidate = 3600 // Revalidar cada hora

export default async function CatalogPage({ 
  searchParams 
}: { 
  searchParams: { category?: string } 
}) {
  // Fetch products server-side
  const products = await getProducts(searchParams.category)
  
  return (
    <div>
      {/* Render products */}
    </div>
  )
}
```

### 2. Implementación por Fases

#### **Fase 1: Landing Page (SSG Puro)**
```typescript
// app/page.tsx
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Food Orders CRM',
  description: 'Sistema de gestión de pedidos'
}

// Remove 'use client' - Make it server component
export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Static content only */}
    </div>
  )
}
```

#### **Fase 2: Catálogo de Productos (ISR)**
```typescript
// app/catalog/page.tsx
export const revalidate = 1800 // 30 minutos

interface Product {
  id: string
  name: string
  price: number
  // ...
}

async function getProducts(): Promise<Product[]> {
  // Server-side data fetching
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: { sellers: true }
  })
  return products
}

export default async function PublicCatalogPage() {
  const products = await getProducts()
  
  return (
    <div>
      <h1>Catálogo de Productos</h1>
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
```

#### **Fase 3: Páginas de Producto Individual (ISR con Dynamic Params)**
```typescript
// app/product/[id]/page.tsx
export const revalidate = 3600 // 1 hora

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    select: { id: true }
  })
  
  return products.map((product) => ({
    id: product.id,
  }))
}

export default async function ProductPage({
  params
}: {
  params: { id: string }
}) {
  const product = await getProduct(params.id)
  
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </div>
  )
}
```

### 3. Estrategia Híbrida Recomendada

#### **SSG (Static):** 
- ✅ Landing page
- ✅ Páginas de información
- ✅ Términos y condiciones

#### **ISR (Incremental Static):**
- ✅ Catálogo público de productos
- ✅ Páginas de producto individual
- ✅ Páginas de vendedor público

#### **SSR/Client (Dynamic):**
- ✅ Dashboard (requiere auth)
- ✅ Órdenes (datos privados)
- ✅ Chat (tiempo real)

### 4. Configuración Next.js

```javascript
// next.config.js
const nextConfig = {
  // Habilitar ISR
  experimental: {
    incrementalCacheHandlerPath: require.resolve('./cache-handler.js'),
  },
  
  // Configurar headers de cache
  async headers() {
    return [
      {
        source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/public/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=1800, stale-while-revalidate=86400',
          },
        ],
      },
    ]
  },
}
```

### 5. APIs Públicas para SSG/ISR

```typescript
// app/api/public/products/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      sellers: {
        select: {
          seller: {
            select: { name: true }
          }
        }
      }
    }
  })

  return NextResponse.json(products, {
    headers: {
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=86400'
    }
  })
}
```

### 6. Beneficios Esperados

#### **Performance:**
- ⚡ Carga instantánea de páginas estáticas
- 🚀 Mejor Core Web Vitals
- 📱 Mejor experiencia en móviles

#### **SEO:**
- 🔍 Mejor indexación de productos
- 📈 Mejor ranking en búsquedas
- 🌐 Social media previews

#### **Costos:**
- 💰 Menos compute time en Vercel
- 🔄 Menos requests a base de datos
- ⚡ Menor latencia global

### 7. Plan de Migración

#### **Semana 1:**
- Convertir landing page a SSG
- Crear API pública de productos

#### **Semana 2:**
- Implementar catálogo con ISR
- Páginas de producto individual

#### **Semana 3:**
- Optimizar headers de cache
- Monitorear performance

#### **Semana 4:**
- A/B test de performance
- Ajustes finales

## 🚨 Consideraciones Importantes

### **No convertir a SSG/ISR:**
- ❌ Páginas con autenticación
- ❌ Dashboards personalizados
- ❌ Chat en tiempo real
- ❌ Formularios dinámicos

### **Mantener Client-side:**
- ✅ `/dashboard/*`
- ✅ `/orders/*`
- ✅ `/chat/*`
- ✅ APIs privadas

## 📊 Métricas a Monitorear

- **TTFB:** Time to First Byte
- **LCP:** Largest Contentful Paint  
- **CLS:** Cumulative Layout Shift
- **FID:** First Input Delay
- **Vercel Analytics:** Page views y performance

---

**Prioridad:** Alta 📈
**Impacto:** Muy Alto 🚀
**Esfuerzo:** Medio 🔧