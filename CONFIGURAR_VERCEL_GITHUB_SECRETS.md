# 🚀 Configuración de Secrets para Vercel en GitHub Actions

## 📋 Secrets Requeridos

Para que el workflow pueda desplegar automáticamente a Vercel, necesitas agregar **3 secrets** en GitHub.

---

## 🔑 1. Obtener VERCEL_TOKEN

### Paso 1: Ir a Vercel Settings
```
https://vercel.com/account/tokens
```

### Paso 2: Crear un Token
1. Click en **"Create Token"**
2. **Token Name:** `GitHub Actions CI/CD`
3. **Scope:** `Full Account`
4. **Expiration:** `No Expiration` (o elige una fecha futura)
5. Click **"Create"**

### Paso 3: Copiar el Token
⚠️ **IMPORTANTE:** Solo se muestra una vez. Cópialo inmediatamente.

Ejemplo de token:
```
vercel_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔑 2. Obtener VERCEL_ORG_ID

### Opción A: Desde el archivo `.vercel/project.json` (Recomendado)

1. Abre PowerShell en tu proyecto local
2. Ejecuta:
   ```powershell
   Get-Content ".vercel\project.json" | ConvertFrom-Json | Select-Object orgId
   ```

3. Copia el `orgId` que aparece

### Opción B: Desde Vercel CLI

```powershell
vercel whoami
```

Busca `Org ID` en la salida.

### Opción C: Desde Vercel Dashboard

1. Ve a: https://vercel.com/tucano0109-5495s-projects/settings
2. En la URL, el ID después de `/settings/` es tu ORG_ID

Ejemplo de ORG_ID:
```
team_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔑 3. Obtener VERCEL_PROJECT_ID

### Opción A: Desde el archivo `.vercel/project.json` (Recomendado)

```powershell
Get-Content ".vercel\project.json" | ConvertFrom-Json | Select-Object projectId
```

### Opción B: Desde Vercel Dashboard

1. Ve a tu proyecto: https://vercel.com/tucano0109-5495s-projects/food-order-crm/settings
2. Ve a **Settings → General**
3. Busca **"Project ID"** en la sección de información

Ejemplo de PROJECT_ID:
```
prj_xxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 📦 Agregar Secrets a GitHub

### Paso 1: Ve a GitHub Repository Settings
```
https://github.com/tucano1306/CRM/settings/secrets/actions
```

### Paso 2: Agregar cada Secret

Click en **"New repository secret"** y agrega cada uno:

#### Secret 1: VERCEL_TOKEN
- **Name:** `VERCEL_TOKEN`
- **Value:** El token que copiaste de Vercel
- Click **"Add secret"**

#### Secret 2: VERCEL_ORG_ID
- **Name:** `VERCEL_ORG_ID`
- **Value:** El orgId de tu cuenta/team
- Click **"Add secret"**

#### Secret 3: VERCEL_PROJECT_ID
- **Name:** `VERCEL_PROJECT_ID`
- **Value:** El projectId de `food-order-crm`
- Click **"Add secret"**

---

## ✅ Verificar Secrets

Después de agregarlos, deberías ver en:
```
https://github.com/tucano1306/CRM/settings/secrets/actions
```

Los siguientes secrets:
- ✅ `CLERK_SECRET_KEY`
- ✅ `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- ✅ `VERCEL_TOKEN` ← Nuevo
- ✅ `VERCEL_ORG_ID` ← Nuevo
- ✅ `VERCEL_PROJECT_ID` ← Nuevo

---

## 🔄 Cómo Funciona el Deploy Automático

### Flujo del Workflow:

```
1. Lint & Type Check ✅
2. Unit Tests ✅
3. Database Validation ✅
4. E2E Tests ⚠️
5. Build Docker Image ✅
6. Security Scan ✅
7. Deploy to Vercel 🚀 ← NUEVO
8. Notify Success ✅
```

### Cuando se ejecuta el Deploy:

- ✅ **Solo en push a `main`** (no en PRs)
- ✅ **Solo si todos los jobs anteriores pasan**
- ✅ **Despliega a producción automáticamente**

### URL del Deployment:

La URL se mostrará en los logs del workflow:
```
✅ Deployed to: https://food-order-ij0lim8d0-tucano0109-5495s-projects.vercel.app
```

---

## 🧪 Script Rápido para Obtener IDs

Ejecuta esto en PowerShell para obtener ambos IDs:

```powershell
# Verifica que existe el archivo
if (Test-Path ".vercel\project.json") {
    $config = Get-Content ".vercel\project.json" | ConvertFrom-Json
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "📋 IDs de Vercel para GitHub Secrets" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "VERCEL_ORG_ID:" -ForegroundColor Yellow
    Write-Host $config.orgId -ForegroundColor Green
    Write-Host ""
    Write-Host "VERCEL_PROJECT_ID:" -ForegroundColor Yellow
    Write-Host $config.projectId -ForegroundColor Green
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Copia estos valores a GitHub Secrets" -ForegroundColor White
    Write-Host "https://github.com/tucano1306/CRM/settings/secrets/actions" -ForegroundColor Blue
    Write-Host "========================================" -ForegroundColor Cyan
} else {
    Write-Host "❌ Archivo .vercel\project.json no encontrado" -ForegroundColor Red
    Write-Host "Ejecuta: vercel link" -ForegroundColor Yellow
}
```

---

## 🎯 Ambiente de GitHub (Environment)

El workflow crea un ambiente llamado **"production"** que:
- 🔒 Puede requerir aprobación manual (opcional)
- 📊 Guarda historial de deployments
- 🔗 Muestra URL del deployment

Para ver deployments:
```
https://github.com/tucano1306/CRM/deployments
```

---

## ⚙️ Configuración Opcional: Protection Rules

Si quieres que los deployments requieran aprobación manual:

1. Ve a: https://github.com/tucano1306/CRM/settings/environments
2. Click en **"production"**
3. Marca ✅ **"Required reviewers"**
4. Agrega tu usuario como reviewer
5. Ahora cada deploy a producción pedirá aprobación

---

## 🚨 Troubleshooting

### Error: "Invalid token"
- Verifica que copiaste el token completo
- Genera un nuevo token en Vercel
- Actualiza el secret en GitHub

### Error: "Project not found"
- Verifica el `VERCEL_PROJECT_ID`
- Ejecuta el script de PowerShell para obtenerlo de nuevo

### Error: "Insufficient permissions"
- Asegúrate de que el token tenga scope `Full Account`
- O crea un token con permisos específicos del proyecto

### El deploy no se ejecuta
- Verifica que el push fue a la rama `main`
- Verifica que los jobs anteriores (build, security) pasaron
- Revisa los logs en GitHub Actions

---

## 📊 Comparación: Manual vs Automático

### Antes (Manual):
```bash
# En tu computadora local
vercel --prod
```
- ❌ Depende de que recuerdes hacerlo
- ❌ Solo desde tu máquina
- ❌ No hay registro en GitHub

### Ahora (Automático):
```bash
git push origin main
```
- ✅ Deploy automático después de tests
- ✅ Funciona desde cualquier lugar
- ✅ Registro completo en GitHub Actions
- ✅ Rollback fácil si algo falla

---

## 🎉 Siguiente Paso

1. **Obtén los 3 secrets** (usa el script de PowerShell)
2. **Agrégalos a GitHub** (Settings → Secrets → Actions)
3. **Haz un push a main** para probar el deploy automático
4. **Verifica en GitHub Actions** que el workflow se ejecuta completo

---

## 📚 Referencias

- **Vercel CLI Docs:** https://vercel.com/docs/cli
- **GitHub Actions Vercel:** https://github.com/vercel/actions
- **Vercel Tokens:** https://vercel.com/guides/how-do-i-use-a-vercel-api-access-token

---

**Tiempo estimado de configuración:** 5-10 minutos

Una vez configurado, ¡nunca más tendrás que hacer `vercel --prod` manualmente! 🚀
