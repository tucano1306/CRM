# 🔧 Configuración de GitHub Secrets para Vercel Deploy

## ❌ Error Actual

```
Error: Project not found ({"VERCEL_PROJECT_ID":"***","VERCEL_ORG_ID":"***"})
```

**Causa:** Los secrets en GitHub Actions no coinciden con los IDs reales del proyecto Vercel.

---

## ✅ Solución: Actualizar GitHub Secrets

### 📋 Valores Correctos

Según tu archivo `.vercel/project.json`, los valores correctos son:

```bash
VERCEL_ORG_ID: team_u2DHcO8TLl2G9Okki1XvwAc3
VERCEL_PROJECT_ID: prj_2ERD19oqCkLGNWe16unlqAbOhFgs
VERCEL_PROJECT_NAME: food-order-crm
```

---

## 🔐 Pasos para Configurar Secrets

### 1. Acceder a Configuración de Secrets

1. Ve a tu repositorio: https://github.com/tucano1306/CRM
2. Click en **Settings** (⚙️)
3. En el menú izquierdo: **Secrets and variables** → **Actions**

### 2. Actualizar/Crear Secrets

Click en **New repository secret** o **Update** para cada uno:

#### Secret 1: VERCEL_ORG_ID
```
Name: VERCEL_ORG_ID
Value: team_u2DHcO8TLl2G9Okki1XvwAc3
```

#### Secret 2: VERCEL_PROJECT_ID
```
Name: VERCEL_PROJECT_ID
Value: prj_2ERD19oqCkLGNWe16unlqAbOhFgs
```

#### Secret 3: VERCEL_TOKEN

Si no tienes el token, créalo primero:

**Opción A - Desde Vercel Dashboard:**
1. Ve a: https://vercel.com/account/tokens
2. Click **Create Token**
3. Nombre: `GitHub Actions`
4. Scope: Full Account
5. Expiration: No expiration (o según preferencia)
6. Click **Create**
7. **¡COPIA EL TOKEN INMEDIATAMENTE!** (solo se muestra una vez)

**Opción B - Desde CLI:**
```bash
vercel token create github-actions
```

Luego agrega el secret:
```
Name: VERCEL_TOKEN
Value: [tu-token-de-vercel]
```

---

## 🔍 Verificar Configuración Local

Confirma que tu configuración local es correcta:

```bash
# Ver configuración Vercel local
cat .vercel/project.json

# Debería mostrar:
# {
#   "projectId": "prj_2ERD19oqCkLGNWe16unlqAbOhFgs",
#   "orgId": "team_u2DHcO8TLl2G9Okki1XvwAc3",
#   "projectName": "food-order-crm"
# }
```

---

## 🧪 Probar el Deploy

Una vez configurados los secrets:

### 1. Trigger Manual (GitHub UI)
1. Ve a **Actions** tab
2. Selecciona workflow **Deploy to Vercel**
3. Click **Run workflow**
4. Selecciona branch `main`
5. Click **Run workflow**

### 2. Trigger Automático
Simplemente haz push a `main`:
```bash
git commit --allow-empty -m "test: trigger vercel deploy"
git push
```

---

## 📊 Secrets Necesarios (Resumen)

| Secret Name | Valor | Dónde Obtenerlo |
|-------------|-------|-----------------|
| `VERCEL_ORG_ID` | `team_u2DHcO8TLl2G9Okki1XvwAc3` | `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | `prj_2ERD19oqCkLGNWe16unlqAbOhFgs` | `.vercel/project.json` |
| `VERCEL_TOKEN` | `[tu-token]` | https://vercel.com/account/tokens |
| `DATABASE_URL` | `postgresql://...` | Neon Dashboard |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_...` | Clerk Dashboard |
| `CLERK_SECRET_KEY` | `sk_...` | Clerk Dashboard |
| `RESEND_API_KEY` | `re_...` | Resend Dashboard |

---

## 🚨 Secrets Adicionales (Opcionales pero Recomendados)

Para funcionalidad completa, también configura:

```bash
# Base de datos
DATABASE_URL=postgresql://neondb_owner:...@ep-spring-night-adj6vmii-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require

# Autenticación (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=tu-email@dominio.com

# Seguridad
CRON_SECRET=[genera-un-string-aleatorio]

# Node (para builds)
NODE_ENV=production
SKIP_ENV_VALIDATION=false
```

---

## ✅ Verificación Post-Deploy

Después de un deploy exitoso:

1. **Check Actions Tab:**
   - ✅ Todos los jobs en verde
   - ✅ URL de deploy en el summary

2. **Check Vercel Dashboard:**
   - Ve a https://vercel.com/tucano1306/food-order-crm
   - Verifica que el deployment más reciente está activo

3. **Check Aplicación:**
   ```bash
   curl https://crm-food-order.vercel.app/api/health
   ```

---

## 🔄 Re-run Failed Deploy

Si el deploy falló por los secrets incorrectos:

1. Actualiza los secrets en GitHub
2. Ve a **Actions** → Click en el workflow fallido
3. Click **Re-run all jobs**

---

## 📝 Notas Importantes

- ⚠️ **El VERCEL_TOKEN es sensible**: No lo compartas ni lo commitees al repositorio
- 🔄 **Los tokens pueden expirar**: Si ves errores de autenticación, regenera el token
- 🔐 **Usa secrets para todo**: Nunca pongas credenciales en el código
- 📊 **Vercel CLI local**: Si tienes problemas, verifica con `vercel whoami` y `vercel ls`

---

## 🆘 Troubleshooting

### Error: "Invalid token"
```bash
# Re-generar token en Vercel y actualizar secret
vercel token create github-actions-new
```

### Error: "Project not found"
```bash
# Verificar que los IDs coinciden
cat .vercel/project.json
# Comparar con los secrets en GitHub Settings
```

### Error: "Insufficient permissions"
```bash
# Asegurar que el token tiene scope "Full Account"
# O crear un token nuevo con permisos adecuados
```

---

## 📞 Soporte

- Vercel Docs: https://vercel.com/docs/cli
- GitHub Actions: https://docs.github.com/en/actions
- Vercel Support: https://vercel.com/support

