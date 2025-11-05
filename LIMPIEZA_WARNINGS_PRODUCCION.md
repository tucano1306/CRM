# 🧹 Limpieza de Warnings de Producción

## 📊 Warnings Detectados

### 1. Sentry Warnings (3 warnings)
### 2. React Hooks Warnings (4 warnings)
### 3. Webpack Cache Warnings (3 warnings)

---

## ✅ Soluciones por Prioridad

### 🔴 Prioridad ALTA: Sentry Global Error Handler

**Warning:**
```
[@sentry/nextjs] It seems like you don't have a global error handler set up
```

**Solución:**

Crea el archivo `app/global-error.tsx`:

```tsx
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold">Algo salió mal</h1>
            <p className="text-muted-foreground">
              Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado.
            </p>
            <Button onClick={reset}>Intentar nuevamente</Button>
          </div>
        </div>
      </body>
    </html>
  )
}
```

**Ejecutar:**
```powershell
# Crear el archivo
New-Item -Path "app/global-error.tsx" -ItemType File -Force
```

---

### 🟡 Prioridad MEDIA: Sentry Configuration Files

**Warning:**
```
[@sentry/nextjs] It appears you've configured a `sentry.edge.config.ts` file
[@sentry/nextjs] DEPRECATION WARNING: Renaming `sentry.client.config.ts`
```

**Solución:**

Estas advertencias indican que Sentry recomienda usar el nuevo formato de Next.js 15.

**Opción 1: Suprimir warnings (Rápido)**

Agregar a `.env.local` y Vercel:
```
SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1
```

**Opción 2: Migrar a nuevo formato (Correcto pero más trabajo)**

Esto requiere refactorizar los archivos de configuración de Sentry.

**Recomendación:** Usa Opción 1 por ahora. La migración puede hacerse después.

---

### 🟢 Prioridad BAJA: React Hooks Dependencies

**Warnings en:**
- `app/buyer/cart/page.tsx` (línea 107, 134)
- `app/chat/page.tsx` (línea 27)
- `app/clients/page.tsx` (línea 55)

**Problema:** useEffect tiene dependencias faltantes.

**Solución Rápida:**

Agregar `// eslint-disable-next-line react-hooks/exhaustive-deps` encima de cada useEffect problemático.

**Solución Correcta:**

Incluir las dependencias faltantes o usar `useCallback`.

---

### ⚪ Prioridad BAJA: Webpack Cache

**Warning:**
```
[webpack.cache.PackFileCacheStrategy] Serializing big strings (175kiB)
```

**Causa:** Archivos grandes en el cache de webpack.

**Solución:** Esto es solo una advertencia de performance, no afecta funcionalidad.

**Opcional:** Agregar a `next.config.js`:
```js
webpack: (config) => {
  config.cache = false // Deshabilita cache si molesta
  return config
}
```

---

## 🚀 Acciones Inmediatas Recomendadas

### 1️⃣ Suprimir warnings de Sentry (30 segundos)

**En Vercel:**

Ve a: https://vercel.com/tucano0109-5495s-projects/food-order-crm/settings/environment-variables

Agrega:
- Name: `SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING`
- Value: `1`
- Environments: Production, Preview, Development

**Localmente en `.env.local`:**
```bash
SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1
```

---

### 2️⃣ Crear global-error.tsx (2 minutos)

Crea `app/global-error.tsx` con el código de arriba.

---

### 3️⃣ Opcional: Fix React Hooks (5-10 minutos)

Si los warnings de React hooks te molestan, podemos arreglarlos.

---

## 📋 Comandos Rápidos

```powershell
# 1. Suprimir Sentry warnings localmente
Add-Content .env.local "`nSENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1"

# 2. Crear global error handler
# (Copia el código manualmente al archivo app/global-error.tsx)

# 3. Commit y push
git add .
git commit -m "fix: Add Sentry global error handler and suppress warnings"
git push origin main
```

---

## ✅ Resultado Esperado

Después de aplicar las soluciones:

- ✅ Sin warnings de Sentry en build
- ✅ Global error handler configurado
- ✅ Errores de React capturados por Sentry
- ⚠️ Warnings de React hooks permanecen (no críticos)
- ⚠️ Warnings de webpack permanecen (solo performance)

---

## 🎯 Priorización

**Hacer AHORA:**
1. ✅ Agregar variable de entorno `SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1`

**Hacer HOY:**
2. ✅ Crear `app/global-error.tsx`

**Hacer DESPUÉS (opcional):**
3. ⏳ Fix React hooks warnings
4. ⏳ Migrar Sentry a nuevo formato (cuando tengas tiempo)

---

## 📞 ¿Quieres que lo haga ahora?

Puedo:
1. ✅ Crear el archivo `global-error.tsx`
2. ✅ Agregar la variable de entorno a `.env.local`
3. ✅ Hacer commit y push

¿Procedo? 🚀
