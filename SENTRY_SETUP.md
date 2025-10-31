# 🔍 Configuración de Sentry

## 📦 Ya instalado

- `@sentry/nextjs` ✅
- Archivos de configuración creados ✅
- Integración en `next.config.js` ✅

## 🚀 Pasos para activar Sentry

### 1. Crear cuenta en Sentry (gratis)

1. Ve a https://sentry.io/signup/
2. Regístrate gratis (5,000 eventos/mes)
3. Crea un nuevo proyecto:
   - Platform: **Next.js**
   - Project name: **food-orders-crm**

### 2. Obtener credenciales

Después de crear el proyecto, copia:

**DSN (Data Source Name):**
```
https://[KEY]@[ORG].ingest.sentry.io/[PROJECT]
```

**Organización:**
```
tu-organizacion-slug
```

**Proyecto:**
```
food-orders-crm
```

**Auth Token:**
1. Ve a Settings → Account → Auth Tokens
2. Crea un nuevo token con permisos:
   - `project:read`
   - `project:releases`
3. Copia el token

### 3. Configurar variables de entorno

Actualiza `.env.local`:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://[KEY]@[ORG].ingest.sentry.io/[PROJECT]
SENTRY_ORG=tu-organizacion-slug
SENTRY_PROJECT=food-orders-crm
SENTRY_AUTH_TOKEN=tu-token-secreto
```

### 4. Configurar en Vercel

Cuando hagas deploy a Vercel, agrega estas mismas variables en:

**Vercel Dashboard → Settings → Environment Variables**

```
NEXT_PUBLIC_SENTRY_DSN = (valor del DSN)
SENTRY_ORG = (nombre de tu org)
SENTRY_PROJECT = food-orders-crm
SENTRY_AUTH_TOKEN = (tu token)
```

### 5. Probar errores

Puedes probar que funciona con:

```typescript
// En cualquier componente o API
throw new Error('Sentry test error!')
```

O usar el botón de prueba que crearemos:

```tsx
<button onClick={() => {
  throw new Error('Sentry test from button')
}}>
  Test Sentry
</button>
```

## 📊 Dashboard de Sentry

Una vez configurado, en https://sentry.io verás:

- **Issues:** Errores capturados con stack traces
- **Performance:** Tiempos de respuesta de APIs
- **Releases:** Versiones deployadas
- **Alerts:** Notificaciones automáticas

## 🔔 Notificaciones

Sentry te enviará emails automáticamente cuando:
- Haya un nuevo error
- Un error aumente en frecuencia
- Un error afecte a muchos usuarios

## 💡 Uso en el código

### Capturar error manualmente:

```typescript
import * as Sentry from '@sentry/nextjs'

try {
  // código que puede fallar
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'orders',
      action: 'create'
    },
    user: {
      id: userId,
      email: userEmail
    }
  })
}
```

### Agregar contexto:

```typescript
Sentry.setUser({
  id: userId,
  email: userEmail,
  role: userRole
})

Sentry.setContext('order', {
  orderId: order.id,
  amount: order.totalAmount
})
```

### Breadcrumbs (rastro de acciones):

```typescript
Sentry.addBreadcrumb({
  category: 'order',
  message: 'User clicked create order',
  level: 'info'
})
```

## 🎯 Features incluidos

- ✅ Captura automática de errores no manejados
- ✅ Source maps para debugging
- ✅ Performance monitoring
- ✅ User context (quién experimentó el error)
- ✅ Breadcrumbs (qué hizo el usuario antes)
- ✅ Release tracking
- ✅ Email notifications

## 🔒 Seguridad

- Solo se activa en producción (`NODE_ENV === 'production'`)
- Source maps se ocultan de clientes
- Datos sensibles se pueden filtrar

## 📝 Siguiente paso

Una vez configures Sentry, haz deploy a Vercel y:

1. Visita tu app
2. Causa un error intencional
3. Ve a tu dashboard de Sentry
4. Verás el error capturado con todos los detalles

## 🆘 Problemas comunes

**Error: "Invalid DSN"**
- Verifica que copiaste el DSN completo
- Debe empezar con `https://`

**No se suben source maps**
- Verifica que `SENTRY_AUTH_TOKEN` sea correcto
- Verifica permisos del token

**No aparecen errores en Sentry**
- Verifica que esté en producción (`NODE_ENV=production`)
- Revisa la consola del navegador
- Verifica que el DSN sea correcto

## 📚 Documentación oficial

https://docs.sentry.io/platforms/javascript/guides/nextjs/
