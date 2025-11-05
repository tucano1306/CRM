# 🔑 Configurar Secrets de GitHub para Deploy Automático a Vercel

## ❌ Error Actual

```
Error: No existing credentials found. Please run `vercel login` or pass "--token"
```

**Causa:** Los secrets de GitHub no están configurados o están vacíos.

---

## ✅ Solución - 3 Pasos Rápidos

### 📋 Paso 1: Obtener los IDs (YA TIENES ESTOS)

```
VERCEL_ORG_ID: team_u2DHcO8TLl2G9Okki1XvwAc3
VERCEL_PROJECT_ID: prj_gw52jnR3EpLcAncD78BdsGhiDmG4
```

---

### 🔑 Paso 2: Crear Token en Vercel

1. **Abre esta URL:**
   ```
   https://vercel.com/account/tokens
   ```

2. **Click en "Create Token"**

3. **Configuración del Token:**
   - **Token Name:** `GitHub Actions CI/CD`
   - **Scope:** Selecciona **"Full Account"**
   - **Expiration:** `No Expiration` (o elige una fecha futura)

4. **Click "Create"**

5. **IMPORTANTE:** Copia el token INMEDIATAMENTE (solo se muestra una vez)
   ```
   Ejemplo: vercel_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
   ```

---

### 🔐 Paso 3: Agregar Secrets a GitHub

1. **Ve a GitHub Secrets:**
   ```
   https://github.com/tucano1306/CRM/settings/secrets/actions
   ```

2. **Click en "New repository secret"** para cada uno:

#### Secret 1: CLERK_SECRET_KEY (Requerido para el build)
- **Name:** `CLERK_SECRET_KEY`
- **Secret:** Tu Clerk Secret Key (empieza con `sk_live_` o `sk_test_`)
- **Dónde obtenerlo:**
  - Ve a: https://dashboard.clerk.com/
  - Selecciona tu aplicación
  - Ve a: API Keys
  - Copia el **Secret Key**
- Click **"Add secret"**

#### Secret 2: NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (Requerido para el build)
- **Name:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Secret:** Tu Clerk Publishable Key (empieza con `pk_live_` o `pk_test_`)
- **Dónde obtenerlo:** Mismo lugar que el Secret Key
- Click **"Add secret"**

#### Secret 3: VERCEL_TOKEN
- **Name:** `VERCEL_TOKEN`
- **Secret:** Pega el token que copiaste de Vercel
- Click **"Add secret"**

#### Secret 4: VERCEL_ORG_ID
- **Name:** `VERCEL_ORG_ID`
- **Secret:** `team_u2DHcO8TLl2G9Okki1XvwAc3`
- Click **"Add secret"**

#### Secret 5: VERCEL_PROJECT_ID
- **Name:** `VERCEL_PROJECT_ID`
- **Secret:** `prj_gw52jnR3EpLcAncD78BdsGhiDmG4`
- Click **"Add secret"**

---

## ✅ Verificar que se Agregaron

Después de agregar los 3 secrets, en esta página:
```
https://github.com/tucano1306/CRM/settings/secrets/actions
```

Deberías ver:

- ✅ `CLERK_SECRET_KEY` ← **NUEVO**
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` ← **NUEVO**
- ✅ `VERCEL_TOKEN` ← **NUEVO**
- ✅ `VERCEL_ORG_ID` ← **NUEVO**
- ✅ `VERCEL_PROJECT_ID` ← **NUEVO**

**Total: 5 secrets**

---

## 🔄 Probar el Workflow

Una vez agregados los secrets:

1. **Haz un commit vacío para disparar el workflow:**
   ```powershell
   git commit --allow-empty -m "test: Trigger CI/CD with Vercel secrets"
   git push origin main
   ```

2. **Ve a GitHub Actions:**
   ```
   https://github.com/tucano1306/CRM/actions
   ```

3. **Verifica que el job "Deploy to Vercel" se ejecuta correctamente**

---

## 📊 Diagrama del Flujo

```
GitHub Actions Workflow
  ↓
Lee secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
  ↓
Ejecuta: vercel pull --token=$VERCEL_TOKEN
  ↓
Build: vercel build --prod
  ↓
Deploy: vercel deploy --prebuilt --prod
  ↓
✅ Deployment exitoso
```

---

## 🚨 Troubleshooting

### Error: "Invalid token"
- Verifica que copiaste el token completo
- Genera un nuevo token y actualiza el secret

### Error: "Project not found"
- Verifica que `VERCEL_PROJECT_ID` sea correcto
- Debe ser: `prj_gw52jnR3EpLcAncD78BdsGhiDmG4`

### Error: "Team not found"
- Verifica que `VERCEL_ORG_ID` sea correcto
- Debe ser: `team_u2DHcO8TLl2G9Okki1XvwAc3`

### El workflow sigue fallando
- Verifica que los 3 secrets estén agregados sin espacios extra
- Verifica que el token tenga permisos de "Full Account"

---

## 📝 Checklist

**Clerk (Autenticación):**
- [ ] `CLERK_SECRET_KEY` copiado de Clerk Dashboard
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` copiado de Clerk Dashboard
- [ ] Ambos agregados a GitHub Secrets

**Vercel (Deployment):**
- [ ] Token creado en Vercel (https://vercel.com/account/tokens)
- [ ] Token copiado y guardado temporalmente
- [ ] `VERCEL_TOKEN` agregado a GitHub Secrets
- [ ] `VERCEL_ORG_ID` = `team_u2DHcO8TLl2G9Okki1XvwAc3` agregado
- [ ] `VERCEL_PROJECT_ID` = `prj_gw52jnR3EpLcAncD78BdsGhiDmG4` agregado

**Verificación:**
- [ ] 5 secrets totales agregados en GitHub
- [ ] Commit de prueba realizado
- [ ] Workflow ejecutándose en GitHub Actions
- [ ] Deploy a Vercel exitoso

---

## 🎯 Resultado Esperado

Después de configurar los secrets, cuando hagas `git push origin main`:

1. ✅ GitHub Actions se dispara automáticamente
2. ✅ Ejecuta tests, build, security scan
3. ✅ Despliega a Vercel automáticamente
4. ✅ URL del deployment aparece en los logs
5. ✅ Aplicación actualizada en producción

---

## ⏱️ Tiempo Estimado

**Total: 5-10 minutos**
- Crear token: 2 min
- Agregar secrets: 3 min
- Probar workflow: 5 min

---

**🚀 ¡Vamos! Empieza creando el token en Vercel ahora.**

**URL:** https://vercel.com/account/tokens
