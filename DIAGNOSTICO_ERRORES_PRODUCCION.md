# 🚨 Diagnóstico de Errores en Producción

## ❌ Errores Detectados

### 1. Error 401 Unauthorized
```
Failed to load resource: the server responded with a status of 401
```

**Causa:** Clerk no puede autenticar al usuario. Posibles razones:
- La `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` en Vercel no coincide con el environment de Clerk
- Estás usando claves de **test** localmente pero claves de **live** en producción (o viceversa)
- El dominio de Vercel no está autorizado en Clerk

---

### 2. Error 500 en /api/notifications
```
GET /api/notifications 500 (Internal Server Error)
```

**Causa:** El endpoint falla porque:
- No puede autenticar al usuario (relacionado con el 401)
- Posible error en la conexión a la base de datos
- Error en el código del API route

---

## 🔧 Solución Paso a Paso

### Paso 1: Verificar Clerk Environment Match

1. **Ve a tu Clerk Dashboard:**
   ```
   https://dashboard.clerk.com/
   ```

2. **Selecciona tu aplicación**

3. **Ve a API Keys**

4. **Verifica si estás usando:**
   - ✅ **Development** (claves `sk_test_...` y `pk_test_...`)
   - ✅ **Production** (claves `sk_live_...` y `pk_live_...`)

5. **Importante:** Si tu app local usa claves de **test**, Vercel también debe usar claves de **test** (o crea un proyecto separado en Clerk para producción)

---

### Paso 2: Verificar Domain en Clerk

1. En Clerk Dashboard, ve a **"Domains"**

2. Verifica que esté autorizado:
   ```
   food-order-od8gotayl-tucano0109-5495s-projects.vercel.app
   ```

3. Si no está, agrégalo:
   - Click en **"Add domain"**
   - Pega: `food-order-od8gotayl-tucano0109-5495s-projects.vercel.app`
   - Guarda

---

### Paso 3: Verificar Variables en Vercel

Ejecuta localmente:
```powershell
# Ver las claves que tienes en .env.local
Get-Content .env.local | Select-String "CLERK"
```

Luego compara con las que están en Vercel:
```
https://vercel.com/tucano0109-5495s-projects/food-order-crm/settings/environment-variables
```

**Deben coincidir:**
- `CLERK_SECRET_KEY` debe ser la misma en ambos
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` debe ser la misma en ambos
- Si usas test localmente, usa test en Vercel
- Si usas live, usa live en ambos

---

### Paso 4: Actualizar Variables en Vercel (Si es necesario)

Si las claves no coinciden:

1. **Ve a Vercel Environment Variables:**
   ```
   https://vercel.com/tucano0109-5495s-projects/food-order-crm/settings/environment-variables
   ```

2. **Encuentra estas variables:**
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

3. **Click en los 3 puntos (⋮) → Edit**

4. **Actualiza con los valores correctos de tu `.env.local`**

5. **IMPORTANTE:** Marca **Production**, **Preview**, y **Development**

6. **Click "Save"**

---

### Paso 5: Re-deploy

Después de actualizar las variables:

```powershell
# Opción 1: Redeploy desde la terminal
vercel --prod

# Opción 2: Desde GitHub (recomendado)
git commit --allow-empty -m "fix: Update Clerk environment variables" --no-verify
git push origin main
```

---

## 🔍 Diagnóstico del Error /api/notifications

Vamos a revisar el código del endpoint:

### Script de Diagnóstico

Ejecuta esto localmente para ver si el endpoint funciona:

```powershell
# Inicia el servidor local
npm run dev

# En otra terminal, prueba el endpoint (necesitas estar autenticado)
# Abre http://localhost:3000 y luego abre la consola del navegador
# Ejecuta:
fetch('/api/notifications')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

Si falla localmente también, el problema está en el código.
Si funciona localmente pero no en producción, es problema de environment variables.

---

## 📋 Checklist de Verificación

### Clerk Configuration:
- [ ] Clerk Dashboard → API Keys copiadas
- [ ] Verificar si son claves de **test** o **live**
- [ ] `CLERK_SECRET_KEY` en Vercel = `CLERK_SECRET_KEY` en .env.local
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` en Vercel = en .env.local
- [ ] Dominio de Vercel agregado en Clerk Domains

### Vercel Configuration:
- [ ] Variables de entorno actualizadas
- [ ] Variables aplicadas a **Production**
- [ ] Re-deploy ejecutado
- [ ] Logs revisados después del deploy

### Testing:
- [ ] Abrir https://food-order-od8gotayl-tucano0109-5495s-projects.vercel.app
- [ ] Intentar login
- [ ] Verificar consola del navegador (F12)
- [ ] Probar modo seller y buyer

---

## 🚨 Error Común: Test vs Live Keys

**Problema más frecuente:**

```
Local (.env.local):
CLERK_SECRET_KEY=sk_test_ABC123...           ← TEST
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_XYZ789...  ← TEST

Vercel (Production):
CLERK_SECRET_KEY=sk_live_DEF456...           ← LIVE ❌ MISMATCH
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_UVW012...  ← LIVE
```

**Solución:**
- Usa las **mismas claves** en local y producción
- O configura un **Instance separado** en Clerk para producción

---

## 🔧 Script de Verificación Rápida

```powershell
# Ejecuta esto para ver tus claves locales (enmascaradas)
$env:CLERK_SECRET_KEY = (Get-Content .env.local | Select-String "^CLERK_SECRET_KEY=").ToString().Split("=")[1]
$env:CLERK_PUBLISHABLE_KEY = (Get-Content .env.local | Select-String "^NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=").ToString().Split("=")[1]

Write-Host "Local CLERK_SECRET_KEY:" ($env:CLERK_SECRET_KEY.Substring(0, 15) + "...")
Write-Host "Local CLERK_PUBLISHABLE_KEY:" ($env:CLERK_PUBLISHABLE_KEY.Substring(0, 15) + "...")

if ($env:CLERK_SECRET_KEY -like "sk_test_*") {
    Write-Host "✅ Usando claves de TEST" -ForegroundColor Green
    Write-Host "⚠️  Verifica que Vercel también use claves de TEST" -ForegroundColor Yellow
} else {
    Write-Host "✅ Usando claves de LIVE (producción)" -ForegroundColor Green
    Write-Host "⚠️  Verifica que Vercel también use claves de LIVE" -ForegroundColor Yellow
}
```

---

## 📞 Próximos Pasos

1. **Ejecuta el script de verificación arriba**
2. **Compara con las variables en Vercel**
3. **Actualiza si es necesario**
4. **Re-deploy**
5. **Prueba la aplicación**

---

**URLs de referencia:**
- Clerk Dashboard: https://dashboard.clerk.com/
- Vercel Env Vars: https://vercel.com/tucano0109-5495s-projects/food-order-crm/settings/environment-variables
- App en Producción: https://food-order-od8gotayl-tucano0109-5495s-projects.vercel.app
