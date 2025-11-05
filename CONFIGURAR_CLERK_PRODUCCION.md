# 🔧 Configurar Clerk para Producción - Guía Paso a Paso

## 🎯 Objetivo
Crear un entorno de producción separado en Clerk con claves LIVE para tu deployment en Vercel.

---

## 📋 Paso 1: Crear Production Instance en Clerk

### Opción A: Usar el mismo proyecto (Más simple)

1. **Ve a Clerk Dashboard:**
   ```
   https://dashboard.clerk.com/
   ```

2. **Selecciona tu aplicación**

3. **Ve a "API Keys"** en el menú lateral

4. **Verás dos secciones:**
   - 🧪 **Development** (claves `sk_test_...` y `pk_test_...`) ← Las que usas ahora
   - 🚀 **Production** (claves `sk_live_...` y `pk_live_...`) ← Las que necesitas

5. **Copia las claves de Production:**
   - `Secret Key` (empieza con `sk_live_...`)
   - `Publishable Key` (empieza con `pk_live_...`)

---

### Opción B: Crear un proyecto separado (Recomendado para producción real)

1. **Ve a Clerk Dashboard:**
   ```
   https://dashboard.clerk.com/
   ```

2. **Click en el selector de aplicaciones** (arriba a la izquierda)

3. **Click en "+ Create Application"**

4. **Configuración:**
   - **Application Name:** `Food Order CRM - Production`
   - **Sign-in options:** Marca lo mismo que tu app de desarrollo
     - ☑️ Email
     - ☑️ Google (si lo usas)
     - ☑️ Otros providers que tengas
   - Click **"Create application"**

5. **Te mostrará las claves automáticamente - CÓPIALAS:**
   - `CLERK_SECRET_KEY` (empieza con `sk_live_...`)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (empieza con `pk_live_...`)

---

## 📋 Paso 2: Autorizar Dominio de Vercel en Clerk

1. **En Clerk Dashboard, ve a "Domains"**

2. **Verás tu dominio de desarrollo:**
   ```
   localhost:3000 (Development)
   ```

3. **Agrega el dominio de Vercel:**
   - Click en **"Add domain"** o **"Add satellite domain"**
   - Pega: `food-order-od8gotayl-tucano0109-5495s-projects.vercel.app`
   - Selecciona: **Production**
   - Click **"Add domain"**

4. **IMPORTANTE:** Si Vercel te asigna un dominio personalizado más adelante, agrégalo también:
   ```
   Ejemplo: food-order-crm.vercel.app
   ```

---

## 📋 Paso 3: Configurar Redirects en Clerk

1. **En Clerk Dashboard, ve a "Paths"**

2. **Verifica estas rutas (deben coincidir con tu app):**
   - **Sign in:** `/sign-in`
   - **Sign up:** `/sign-up`
   - **After sign in:** `/dashboard`
   - **After sign up:** `/dashboard`

3. **Si son diferentes, actualízalas**

---

## 📋 Paso 4: Actualizar Variables en Vercel

1. **Ve a Vercel Environment Variables:**
   ```
   https://vercel.com/tucano0109-5495s-projects/food-order-crm/settings/environment-variables
   ```

2. **Actualiza CLERK_SECRET_KEY:**
   - Encuentra `CLERK_SECRET_KEY` en la lista
   - Click en los **3 puntos (⋮)** → **Edit**
   - **Borra el valor actual**
   - **Pega la nueva clave de Production** (la que empieza con `sk_live_...`)
   - **Environments:** ☑️ **Production** solamente (desmarca Preview y Development)
   - Click **"Save"**

3. **Actualiza NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:**
   - Encuentra `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` en la lista
   - Click en los **3 puntos (⋮)** → **Edit**
   - **Borra el valor actual**
   - **Pega la nueva clave de Production** (la que empieza con `pk_live_...`)
   - **Environments:** ☑️ **Production** solamente
   - Click **"Save"**

4. **Verifica otras variables de Clerk (deben estar así):**

   | Variable | Valor | Environment |
   |----------|-------|-------------|
   | `CLERK_SECRET_KEY` | `sk_live_...` | Production |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Production |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | Production |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | Production |
   | `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` | Production |
   | `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` | Production |

---

## 📋 Paso 5: Re-deploy a Vercel

Después de actualizar las variables, necesitas re-deployar:

### Opción 1: Desde la terminal (Rápido)

```powershell
vercel --prod
```

### Opción 2: Desde GitHub (Recomendado - usa el pipeline completo)

```powershell
git commit --allow-empty -m "fix: Configure Clerk production keys" --no-verify
git push origin main
```

---

## 📋 Paso 6: Verificar el Deployment

1. **Espera 2-4 minutos a que el deployment complete**

2. **Ve a la URL de producción:**
   ```
   https://food-order-od8gotayl-tucano0109-5495s-projects.vercel.app
   ```

3. **Prueba el login:**
   - Click en **"Sign In"** o **"Login"**
   - Intenta autenticarte
   - Verifica que no haya errores 401 en la consola (F12)

4. **Prueba las funcionalidades:**
   - Modo Seller: https://food-order-od8gotayl-tucano0109-5495s-projects.vercel.app/?mode=seller
   - Modo Buyer: https://food-order-od8gotayl-tucano0109-5495s-projects.vercel.app/?mode=buyer

---

## 🚨 Troubleshooting

### Error: "Invalid publishable key"
- Verifica que copiaste la clave completa (sin espacios)
- Debe empezar con `pk_live_`
- Verifica que sea de la sección "Production" en Clerk

### Error: "Cross-origin request blocked"
- Verifica que el dominio de Vercel esté en Clerk → Domains
- Debe ser exactamente: `food-order-od8gotayl-tucano0109-5495s-projects.vercel.app`

### Aún sale error 401
- Espera 1-2 minutos (Vercel cachea las env vars)
- Haz "Hard Refresh" en el navegador: `Ctrl + Shift + R` (Windows)
- Verifica los logs de Vercel: `vercel logs`

### La app funciona pero no hay usuarios
- **Normal:** Production es un ambiente limpio sin usuarios de desarrollo
- Necesitarás crear usuarios nuevos en producción
- O importarlos desde development (Clerk tiene herramientas para esto)

---

## 📋 Checklist Final

**Clerk Configuration:**
- [ ] Claves de Production copiadas (`sk_live_...` y `pk_live_...`)
- [ ] Dominio de Vercel agregado en Clerk Domains
- [ ] Paths configurados correctamente en Clerk

**Vercel Configuration:**
- [ ] `CLERK_SECRET_KEY` actualizado con clave live
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` actualizado con clave live
- [ ] Variables aplicadas solo a **Production** environment
- [ ] Re-deploy ejecutado

**Testing:**
- [ ] App abre sin errores
- [ ] Login funciona correctamente
- [ ] No hay errores 401 en consola
- [ ] Modo seller y buyer funcionan
- [ ] API de notifications responde (sin 500)

---

## 🎯 Resumen de Comandos

```powershell
# Re-deploy desde GitHub (recomendado)
git commit --allow-empty -m "fix: Configure Clerk production keys" --no-verify
git push origin main

# O re-deploy directo desde Vercel CLI
vercel --prod

# Ver deployment URL
vercel ls

# Ver logs si hay errores
vercel logs <deployment-url>
```

---

## 📞 Próximos Pasos

1. **Ejecuta estos pasos en orden**
2. **Copia las claves LIVE de Clerk**
3. **Actualiza en Vercel (solo Production environment)**
4. **Re-deploy**
5. **Prueba la aplicación**

---

**URLs de Referencia:**
- Clerk Dashboard: https://dashboard.clerk.com/
- Vercel Env Vars: https://vercel.com/tucano0109-5495s-projects/food-order-crm/settings/environment-variables
- App Producción: https://food-order-od8gotayl-tucano0109-5495s-projects.vercel.app

---

## 💡 Tip Final

Una vez que esto funcione, actualiza también tus **GitHub Secrets** con las claves de production para que el CI/CD use las correctas:

```
https://github.com/tucano1306/CRM/settings/secrets/actions
```

- Actualiza `CLERK_SECRET_KEY` → clave live
- Actualiza `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` → clave live
