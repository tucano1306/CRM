# 🌐 Configuración de URLs Separadas para Vendedor y Comprador

## 📋 Opción 1: Subdominios (Recomendado para Vercel)

### **Arquitectura Recomendada:**
- **Vendedores**: `seller.tuempresa.com` o `vendor.tuempresa.com`
- **Compradores**: `buyer.tuempresa.com` o `shop.tuempresa.com`

### **Pasos para Configurar:**

#### **1. Registrar un Dominio**
- Compra un dominio (ej: `tuempresa.com`) en:
  - Namecheap
  - GoDaddy
  - Google Domains
  - Cloudflare

#### **2. En Vercel Dashboard:**

1. Ve a tu proyecto: https://vercel.com/tucano0109-5495s-projects/food-order-crm/settings/domains

2. **Agregar Dominio Principal:**
   - Click "Add Domain"
   - Agrega: `tuempresa.com`
   - Vercel te dará instrucciones DNS

3. **Agregar Subdominios:**
   - Click "Add Domain" nuevamente
   - Agrega: `seller.tuempresa.com`
   - Click "Add Domain" nuevamente
   - Agrega: `buyer.tuempresa.com`

#### **3. Configurar DNS en tu Proveedor:**

Agrega estos registros DNS:

```
Type: A
Name: @
Value: 76.76.21.21
TTL: 3600

Type: CNAME
Name: seller
Value: cname.vercel-dns.com
TTL: 3600

Type: CNAME
Name: buyer
Value: cname.vercel-dns.com
TTL: 3600
```

#### **4. Middleware para Redirección Automática:**

El middleware detectará el subdominio y redirigirá automáticamente:

**Crear archivo: `middleware-domains.ts`** (concepto):

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const { host } = req.headers
  
  // Detectar subdominio
  if (host?.includes('seller.') || host?.includes('vendor.')) {
    // Usuarios en seller subdomain deben ser SELLER
    const role = getUserRole(req) // Función que obtiene el rol de Clerk
    
    if (role !== 'SELLER') {
      return NextResponse.redirect(new URL('/login?role=seller', req.url))
    }
  }
  
  if (host?.includes('buyer.') || host?.includes('shop.')) {
    // Usuarios en buyer subdomain deben ser CLIENT
    const role = getUserRole(req)
    
    if (role !== 'CLIENT') {
      return NextResponse.redirect(new URL('/login?role=buyer', req.url))
    }
  }
  
  return NextResponse.next()
}
```

---

## 📋 Opción 2: Proyectos Separados en Vercel (Más Simple)

Si quieres URLs completamente diferentes sin configurar dominios:

### **1. Crear 2 Deployments Separados:**

#### **Deployment 1: Para Vendedores**
```powershell
# Crear branch específico para sellers
git checkout -b sellers-only

# Modificar middleware.ts para forzar rol SELLER
# Modificar páginas para mostrar solo vistas de vendedor

# Deploy este branch
vercel --prod
```

URL resultante: `food-order-sellers.vercel.app`

#### **Deployment 2: Para Compradores**
```powershell
# Crear branch específico para buyers
git checkout -b buyers-only

# Modificar middleware.ts para forzar rol CLIENT
# Modificar páginas para mostrar solo vistas de comprador

# Deploy este branch
vercel --prod
```

URL resultante: `food-order-buyers.vercel.app`

**Desventaja**: Mantener 2 codebases separados

---

## 📋 Opción 3: Query Parameter (Sin Cambios de Infraestructura)

La opción más simple sin configurar dominios:

### **URLs:**
- **Vendedores**: `https://tuapp.vercel.app/?mode=seller`
- **Compradores**: `https://tuapp.vercel.app/?mode=buyer`

### **Implementación:**

**Modificar middleware.ts:**

```typescript
export default clerkMiddleware(async (auth, req) => {
  const { searchParams } = req.nextUrl
  const mode = searchParams.get('mode')
  
  // Si hay modo específico, forzar ese rol
  if (mode === 'seller') {
    // Verificar que el usuario sea SELLER
    const { sessionClaims } = await auth()
    if (sessionClaims?.role !== 'SELLER') {
      return NextResponse.redirect(new URL('/login?required_role=seller', req.url))
    }
  }
  
  if (mode === 'buyer') {
    // Verificar que el usuario sea CLIENT
    const { sessionClaims } = await auth()
    if (sessionClaims?.role !== 'CLIENT') {
      return NextResponse.redirect(new URL('/login?required_role=buyer', req.url))
    }
  }
  
  // Resto del middleware...
})
```

---

## ✅ Recomendación

**Para tu caso (deployment reciente en Vercel), te recomiendo Opción 1:**

### **Por qué Subdominios:**
1. ✅ Profesional y escalable
2. ✅ SEO friendly
3. ✅ Fácil de recordar para usuarios
4. ✅ Un solo codebase, un deployment
5. ✅ Vercel lo soporta nativamente

### **Configuración Rápida:**

1. **Compra dominio** (ej: `bargain-food.com`) - $10-15/año
2. **Configura en Vercel**:
   - `seller.bargain-food.com` → Para vendedores
   - `shop.bargain-food.com` → Para compradores
   - `www.bargain-food.com` → Landing page

3. **Modifica middleware.ts** para detectar subdominio y aplicar reglas

---

## 🚀 Próximos Pasos

¿Qué opción prefieres?

1. **Subdominios con dominio propio** (Recomendado)
   - Necesitas comprar un dominio primero
   - Te ayudo a configurar el middleware

2. **Query Parameters** (Más rápido, sin costos)
   - Implementación inmediata
   - URLs tipo: `?mode=seller` o `?mode=buyer`

3. **Proyectos separados en Vercel** (No recomendado)
   - Mantener 2 repos/branches
   - Más complejo de mantener

**Dime cuál prefieres y te ayudo con la implementación específica!**
