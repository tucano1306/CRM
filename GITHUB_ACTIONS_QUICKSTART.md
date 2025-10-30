# 🚀 Quick Start - GitHub Actions

## ✅ Archivos Listos

Los siguientes archivos ya están configurados:

- `.github/workflows/docker-ci-cd.yml` - Workflow principal
- `GITHUB_ACTIONS_SETUP.md` - Guía completa
- `check-github-secrets.ps1` - Verificador de secrets
- `Dockerfile` - Multi-stage con Alpine 3.19
- `docker-compose.yml` - Configuración de servicios

## 🔑 Secrets Detectados

✅ **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**: `pk_test_b3B0aW1hbC1nb29zZS02NS5jbGVyay5hY2NvdW50cy5kZXYk`
✅ **CLERK_SECRET_KEY**: `sk_test_QDkA3kI...` (detectado)

## 📝 Próximos Pasos

### 1️⃣ Configurar Secrets (2 minutos)

Abre: https://github.com/tucano1306/CRM/settings/secrets/actions

Click "New repository secret" y agrega:

**Secret #1:**
```
Name:  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
Value: pk_test_b3B0aW1hbC1nb29zZS02NS5jbGVyay5hY2NvdW50cy5kZXYk
```

### 2️⃣ Configurar Permisos (1 minuto)

Abre: https://github.com/tucano1306/CRM/settings/actions

Selecciona:
- ✅ **Read and write permissions**
- ✅ **Allow GitHub Actions to create and approve pull requests**

### 3️⃣ Push y Activar (30 segundos)

```bash
git add .
git commit -m "ci: Configure GitHub Actions CI/CD pipeline"
git push origin main
```

### 4️⃣ Ver en Acción

Abre: https://github.com/tucano1306/CRM/actions

Verás el workflow ejecutándose automáticamente! 🎉

## 🔄 ¿Qué hace el Workflow?

```
┌─────────────────────────────────────────────┐
│  PUSH a main/develop                        │
└──────────────┬──────────────────────────────┘
               │
       ┌───────▼────────┐
       │   LINT & TYPE  │
       │     CHECK      │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │   DATABASE     │
       │  VALIDATION    │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │  BUILD DOCKER  │
       │     IMAGE      │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │   SECURITY     │
       │     SCAN       │
       └───────┬────────┘
               │
       ┌───────▼────────┐
       │    PUSH TO     │
       │     GHCR       │
       └────────────────┘
```

## 📊 Resultado Esperado

Después del primer push exitoso:

✅ Código linted
✅ TypeScript validado
✅ Migraciones de Prisma verificadas
✅ Imagen Docker construida
✅ Imagen subida a `ghcr.io/tucano1306/crm`
✅ Vulnerabilidades escaneadas

## 🐳 Usar la Imagen de GHCR

Después del build, puedes usar la imagen desde cualquier servidor:

```bash
# Pull desde GitHub Container Registry
docker pull ghcr.io/tucano1306/crm:latest

# O usar en docker-compose
services:
  app:
    image: ghcr.io/tucano1306/crm:latest
```

## 🆘 Solución Rápida de Problemas

### Error: "Resource not accessible"
→ Ve a Settings → Actions → General
→ Selecciona "Read and write permissions"

### Error: "Secret not found"
→ Verifica que el secret se llame EXACTAMENTE:
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

### Build lento
→ Es normal. Primer build: ~5-10 min
→ Builds siguientes: ~2-3 min (gracias al cache)

## 📚 Más Info

Lee `GITHUB_ACTIONS_SETUP.md` para documentación completa.

---

**¿Listo para activar CI/CD?** 🚀

Ejecuta:
```bash
.\check-github-secrets.ps1  # Verificar
git add .                    # Agregar archivos
git commit -m "ci: Setup"    # Commit
git push origin main         # Activar!
```
