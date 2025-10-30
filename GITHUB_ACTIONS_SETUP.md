# 🚀 Configuración de GitHub Actions

Esta guía te ayudará a configurar GitHub Actions para CI/CD automático de tu Food Orders CRM.

## 📋 Pre-requisitos

- ✅ Repositorio en GitHub
- ✅ Docker instalado localmente
- ✅ Cuenta de Clerk configurada
- ✅ Código pusheado a GitHub

## 🔐 Paso 1: Configurar GitHub Secrets

Los secrets son variables de entorno seguras que GitHub Actions usará. **NUNCA** commitees estas claves al código.

### Ir a la configuración de Secrets:

1. Ve a tu repositorio en GitHub: `https://github.com/tucano1306/CRM`
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**

### Secrets necesarios:

#### 1. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
```
Valor: pk_test_b3B0aW1hbC1nb29zZS02NS5jbGVyay5hY2NvdW50cy5kZXYk
```
- **Nombre del secret**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- **Valor**: Tu clave pública de Clerk (la que está en tu `.env.local`)

> ⚠️ **Importante**: Copia el valor EXACTO de tu archivo `.env.local`

#### 2. `CLERK_SECRET_KEY` (Opcional, para tests)
```
Valor: sk_test_...
```
- **Nombre del secret**: `CLERK_SECRET_KEY`
- **Valor**: Tu clave secreta de Clerk

---

## 🎯 Paso 2: Habilitar GitHub Container Registry (GHCR)

GitHub Container Registry es donde se almacenarán tus imágenes Docker.

### Habilitar GHCR:

1. Ve a tu **perfil de GitHub** (click en tu avatar)
2. Click en **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. Click en **Generate new token** → **Generate new token (classic)**
4. Dale un nombre: `GitHub Actions GHCR`
5. Selecciona los siguientes scopes:
   - ✅ `write:packages` (para subir imágenes)
   - ✅ `read:packages` (para leer imágenes)
   - ✅ `delete:packages` (para eliminar imágenes antiguas)
6. Click en **Generate token**
7. **COPIA EL TOKEN** (solo se muestra una vez)

> ℹ️ **Nota**: El workflow ya usa `GITHUB_TOKEN` automático, pero puedes necesitar este token para deployment manual.

---

## 📦 Paso 3: Verificar que el workflow esté activo

### Verificar archivo del workflow:

El workflow ya está en: `.github/workflows/docker-ci-cd.yml`

### ¿Qué hace este workflow?

```yaml
✅ Lint (cuando haces push a main o develop)
   └─ Revisa código con ESLint
   └─ Type checking con TypeScript

✅ Database (valida Prisma)
   └─ Inicia PostgreSQL de prueba
   └─ Ejecuta migraciones
   └─ Valida schema

✅ Build (solo en push, NO en PR)
   └─ Construye imagen Docker
   └─ Sube a GitHub Container Registry (ghcr.io)
   └─ Cachea capas para builds más rápidos

✅ Security (solo en main)
   └─ Escanea vulnerabilidades con Trivy
   └─ Sube resultados a GitHub Security

✅ Notify (notifica éxito)
```

---

## 🏃 Paso 4: Probar el workflow

### Método 1: Push a main

```bash
# Asegúrate de estar en la rama main
git checkout main

# Haz un cambio pequeño (por ejemplo, edita README.md)
echo "# Test CI/CD" >> README.md

# Commit y push
git add .
git commit -m "test: Probar GitHub Actions"
git push origin main
```

### Método 2: Ejecutar manualmente

1. Ve a tu repo en GitHub
2. Click en **Actions**
3. Click en **CI/CD Pipeline** en el menú lateral
4. Click en **Run workflow** (esquina superior derecha)
5. Selecciona la rama `main`
6. Click en **Run workflow**

---

## 📊 Paso 5: Monitorear la ejecución

### Ver los logs:

1. Ve a **Actions** en tu repositorio
2. Verás tu workflow ejecutándose (círculo amarillo = en progreso)
3. Click en el nombre del workflow para ver detalles
4. Click en cada job (lint, database, build, etc.) para ver logs

### Estados posibles:

- 🟡 **Amarillo** (En progreso): El workflow está corriendo
- 🟢 **Verde** (Success): Todo pasó correctamente
- 🔴 **Rojo** (Failed): Algo falló, revisa los logs

---

## 🐳 Paso 6: Ver tu imagen Docker

Después de un build exitoso:

1. Ve a tu repositorio en GitHub
2. Click en **Packages** (en el menú del repo)
3. Verás tu imagen: `ghcr.io/tucano1306/crm`

### Tags disponibles:

- `latest` - Última versión de main
- `main-abc123` - Build específico con hash del commit
- `develop` - Última versión de develop

---

## 🚨 Solución de Problemas

### Error: "Resource not accessible by integration"

**Solución**: Ve a Settings → Actions → General → Workflow permissions
- Selecciona: **Read and write permissions**
- Marca: **Allow GitHub Actions to create and approve pull requests**

### Error: "Invalid NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"

**Solución**: Verifica que el secret esté bien copiado:
1. Settings → Secrets → Actions
2. Edita `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
3. Copia de nuevo el valor EXACTO de tu `.env.local`

### Error: "Prisma migrate failed"

**Solución**: Verifica que tus migraciones estén en el repo:
```bash
git add prisma/migrations/
git commit -m "fix: Add Prisma migrations"
git push
```

### Build muy lento

**Solución**: El primer build toma 5-10 minutos. Los siguientes serán más rápidos gracias al cache.

---

## 📝 Configuración Avanzada (Opcional)

### Agregar deployment automático a producción:

Crea un nuevo workflow: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  release:
    types: [published]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/food-orders-crm
            docker pull ghcr.io/tucano1306/crm:latest
            docker-compose up -d --force-recreate
            docker image prune -f
```

Necesitarás estos secrets adicionales:
- `PROD_HOST`: IP o dominio de tu servidor
- `PROD_USER`: Usuario SSH (ejemplo: `root`)
- `PROD_SSH_KEY`: Clave privada SSH

---

## ✅ Checklist Final

- [ ] Secrets configurados en GitHub
- [ ] Workflow permissions: Read and write
- [ ] Push a main exitoso
- [ ] Build completado correctamente
- [ ] Imagen visible en Packages
- [ ] Security scan completado

---

## 🎉 ¡Listo!

Ahora cada vez que hagas push a `main` o `develop`:

1. ✅ Se ejecutarán los tests
2. ✅ Se validará la base de datos
3. ✅ Se construirá una imagen Docker
4. ✅ Se subirá a GitHub Container Registry
5. ✅ Se escaneará por vulnerabilidades

**Próximo paso**: Configurar deployment automático a tu servidor de producción.

---

## 📚 Recursos

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Trivy Security Scanner](https://github.com/aquasecurity/trivy-action)
