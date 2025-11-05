# 🚨 Error: Project not found - Solución

## ❌ Error Encontrado en GitHub Actions

```
Error: Project not found ({"VERCEL_PROJECT_ID":"***","VERCEL_ORG_ID":"***"})
Error: Process completed with exit code 1.
```

**Causa:** Los secrets `VERCEL_ORG_ID` o `VERCEL_PROJECT_ID` están mal escritos, tienen espacios extra, o no coinciden exactamente con tus valores de Vercel.

---

## ✅ Valores Correctos

Estos son los valores EXACTOS que deben estar en GitHub Secrets:

```
VERCEL_ORG_ID: team_u2DHcO8TLl2G9Okki1XvwAc3
VERCEL_PROJECT_ID: prj_gw52jnR3EpLcAncD78BdsGhiDmG4
```

⚠️ **IMPORTANTE:** 
- Son **case-sensitive** (mayúsculas/minúsculas importan)
- No deben tener espacios al inicio o final
- Deben coincidir EXACTAMENTE

---

## 🔧 Solución Paso a Paso

### 1️⃣ Ve a GitHub Secrets
```
https://github.com/tucano1306/CRM/settings/secrets/actions
```

### 2️⃣ Verifica o Actualiza VERCEL_ORG_ID

**Opción A: Si NO existe el secret**
1. Click en **"New repository secret"**
2. Name: `VERCEL_ORG_ID`
3. Secret: `team_u2DHcO8TLl2G9Okki1XvwAc3`
4. Click **"Add secret"**

**Opción B: Si YA existe pero tiene error**
1. Encuentra `VERCEL_ORG_ID` en la lista
2. Click en **"Update"** (icono de lápiz)
3. Borra el valor actual
4. Pega: `team_u2DHcO8TLl2G9Okki1XvwAc3`
5. Click **"Update secret"**

### 3️⃣ Verifica o Actualiza VERCEL_PROJECT_ID

**Opción A: Si NO existe el secret**
1. Click en **"New repository secret"**
2. Name: `VERCEL_PROJECT_ID`
3. Secret: `prj_gw52jnR3EpLcAncD78BdsGhiDmG4`
4. Click **"Add secret"**

**Opción B: Si YA existe pero tiene error**
1. Encuentra `VERCEL_PROJECT_ID` en la lista
2. Click en **"Update"** (icono de lápiz)
3. Borra el valor actual
4. Pega: `prj_gw52jnR3EpLcAncD78BdsGhiDmG4`
5. Click **"Update secret"**

---

## ⚠️ Errores Comunes

### ❌ Espacios extra
```
# MAL (tiene espacio al final)
team_u2DHcO8TLl2G9Okki1XvwAc3 

# BIEN
team_u2DHcO8TLl2G9Okki1XvwAc3
```

### ❌ Mayúsculas/minúsculas incorrectas
```
# MAL (minúsculas donde debería ser mayúscula)
team_u2dhco8tll2g9okki1xvwac3

# BIEN
team_u2DHcO8TLl2G9Okki1XvwAc3
```

### ❌ Falta el prefijo
```
# MAL (falta "team_")
u2DHcO8TLl2G9Okki1XvwAc3

# BIEN
team_u2DHcO8TLl2G9Okki1XvwAc3
```

---

## ✅ Verificación Final

Después de actualizar los secrets, deberías tener estos **5 secrets** en GitHub:

- ✅ `CLERK_SECRET_KEY` (empieza con `sk_`)
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (empieza con `pk_`)
- ✅ `VERCEL_TOKEN` (token largo generado en Vercel)
- ✅ `VERCEL_ORG_ID` = `team_u2DHcO8TLl2G9Okki1XvwAc3`
- ✅ `VERCEL_PROJECT_ID` = `prj_gw52jnR3EpLcAncD78BdsGhiDmG4`

---

## 🔄 Probar Nuevamente

Una vez que hayas actualizado los secrets:

1. **Ve al workflow que falló:**
   ```
   https://github.com/tucano1306/CRM/actions
   ```

2. **Re-run el workflow:**
   - Click en el workflow que falló
   - Click en **"Re-run all jobs"** (esquina superior derecha)
   - O haz un nuevo commit:
   ```powershell
   git commit --allow-empty -m "fix: Update Vercel secrets" --no-verify
   git push origin main
   ```

---

## 🎯 Qué Esperar Después del Fix

Si los secrets están correctos, en el job "Deploy to Vercel" verás:

```
✓ Pull Vercel Environment Information
  Retrieving project...
  ✓ Downloaded project settings for food-order-crm
  
✓ Build Project Artifacts
  Building...
  Compiled successfully
  
✓ Deploy to Vercel Production
  Deploying to production...
  ✓ Production: https://food-order-crm.vercel.app
```

---

## 📋 Checklist de Solución

- [ ] Verificar que `VERCEL_ORG_ID` sea exactamente: `team_u2DHcO8TLl2G9Okki1XvwAc3`
- [ ] Verificar que `VERCEL_PROJECT_ID` sea exactamente: `prj_gw52jnR3EpLcAncD78BdsGhiDmG4`
- [ ] Sin espacios al inicio o final en ninguno de los dos
- [ ] Case-sensitive respetado (mayúsculas/minúsculas)
- [ ] Secrets actualizados en GitHub
- [ ] Re-run del workflow ejecutado

---

## 🆘 Si Sigue Fallando

Si después de verificar los valores el error persiste:

1. **Borra y vuelve a crear los secrets** (a veces GitHub cachea valores incorrectos)
2. **Verifica que tengas permisos** en el team de Vercel
3. **Verifica que el proyecto exista** en Vercel:
   ```
   https://vercel.com/tucano0109-5495s-projects/food-order-crm
   ```

4. **Comparte el log completo** del job "Deploy to Vercel" para análisis detallado

---

**📍 Valores correctos a copiar:**

```
VERCEL_ORG_ID
team_u2DHcO8TLl2G9Okki1XvwAc3

VERCEL_PROJECT_ID
prj_gw52jnR3EpLcAncD78BdsGhiDmG4
```

**🔗 URL para actualizar secrets:**
https://github.com/tucano1306/CRM/settings/secrets/actions
