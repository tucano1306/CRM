# 🔄 CI/CD Pipeline - Workflow Completo Restaurado

## ✅ Problema Resuelto

**Antes:** Solo se ejecutaba el workflow simple `test.yml` con un solo job.

**Ahora:** Se ejecutará el pipeline completo `docker-ci-cd.yml` con todos los jobs.

---

## 📊 Pipeline Completo - Jobs que se Ejecutarán

### 1️⃣ **Lint & Type Check** 
- ✅ ESLint para verificar calidad de código
- ✅ TypeScript type checking
- ⏱️ ~2-3 minutos

### 2️⃣ **Unit Tests**
- ✅ 497 tests unitarios
- ✅ Coverage report
- ✅ Upload a Codecov
- ⏱️ ~1-2 minutos

### 3️⃣ **Database Validation**
- ✅ PostgreSQL 16 Alpine (servicio)
- ✅ Prisma migrate deploy
- ✅ Schema validation
- ⏱️ ~2-3 minutos

### 4️⃣ **E2E Tests (Bypass Auth)**
- ✅ Playwright con Chromium
- ✅ Tests de navegación
- ✅ Screenshots en caso de fallo
- ⏱️ ~3-5 minutos
- 🔧 `continue-on-error: true` (no bloquea el build)

### 5️⃣ **Build & Push Docker Image**
- ✅ Docker Buildx
- ✅ Push a GitHub Container Registry (ghcr.io)
- ✅ Tags: `latest`, `main-<sha>`, `branch-name`
- ✅ Multi-platform: `linux/amd64`
- ⏱️ ~5-8 minutos

### 6️⃣ **Security Scan (Trivy)**
- ✅ Vulnerability scanning
- ✅ Upload a GitHub Security
- ✅ Severidades: CRITICAL, HIGH
- ⏱️ ~2-3 minutos

### 7️⃣ **Notify Success**
- ✅ Mensaje de confirmación
- ✅ URLs de imagen Docker
- ⏱️ ~10 segundos

---

## 🔀 Dependencias entre Jobs

```
lint ──┬─→ test-unit ──┬─→ build ──→ security ──→ notify
       │                │
       └─→ database ────┘
                │
                └─→ test-e2e
```

**Flujo:**
1. `lint` se ejecuta primero
2. `test-unit` y `database` esperan a `lint`
3. `test-e2e` espera a `lint` y `database`
4. `build` espera a `lint`, `test-unit`, `test-e2e`, `database`
5. `security` espera a `build`
6. `notify` espera a `build` y `security`

---

## ⚙️ Triggers del Workflow

### Push a ramas:
```yaml
on:
  push:
    branches: [main, develop]
```

### Pull Requests:
```yaml
  pull_request:
    branches: [main]
```

### Comportamiento:

| Evento | Branch | Jobs que se ejecutan |
|--------|--------|---------------------|
| Push | `main` | Todos los 7 jobs (incluye Docker push + Security) |
| Push | `develop` | Todos los 7 jobs |
| Pull Request | `*` → `main` | Solo lint, tests, database (sin Docker push) |

---

## 🐳 Imagen Docker

### Registry:
```
ghcr.io/tucano1306/crm
```

### Tags generados automáticamente:
```bash
# Si estás en main:
ghcr.io/tucano1306/crm:latest
ghcr.io/tucano1306/crm:main-dbbe2ac

# Si estás en develop:
ghcr.io/tucano1306/crm:develop
ghcr.io/tucano1306/crm:develop-abc1234
```

---

## 📦 Secrets Requeridos

Verifica que tienes estos secrets configurados en GitHub:

### Settings → Secrets and variables → Actions

**Secrets necesarios:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

**Secrets opcionales (generados automáticamente):**
- `GITHUB_TOKEN` - GitHub lo proporciona automáticamente para push a GHCR

---

## 🔍 Verificar que Funciona

### 1. Ve a GitHub Actions:
```
https://github.com/tucano1306/CRM/actions
```

### 2. Deberías ver el workflow "CI/CD Pipeline" ejecutándose

### 3. Click en el workflow para ver todos los jobs:

```
✅ Lint & Type Check
✅ Unit Tests  
✅ Database Validation
⚠️ E2E Tests (Bypass Auth)  ← Puede fallar, no bloquea
✅ Build & Push Docker Image
✅ Security Scan (Trivy)
✅ Notify Success
```

### 4. Tiempo total estimado: ~15-20 minutos

---

## 🛠️ Configuración de E2E Tests

**Nota importante:** Los tests E2E pueden fallar en CI porque:
- Requieren configuración específica de Clerk
- Playwright puede tener problemas con auth mock
- Es normal que tengan `continue-on-error: true`

**Si quieres que los E2E pasen:**

1. Verifica que existe: `__tests__/e2e/navigation-with-bypass.spec.ts`
2. Configura secrets de Clerk correctamente
3. Ajusta el spec file para CI environment

---

## 📝 Archivos de Workflow

### Workflow activo:
```
.github/workflows/docker-ci-cd.yml
```

### Otros workflows:
```
.github/workflows/database-backup.yml  ← Para backups automáticos
```

### Workflow eliminado:
```
❌ .github/workflows/test.yml  ← Ya no existe (era redundante)
```

---

## 🎯 Próximo Paso

**Monitorea el workflow en GitHub:**
```
https://github.com/tucano1306/CRM/actions/runs/<run-id>
```

El push que acabas de hacer (`dbbe2ac`) debería activar el pipeline completo.

---

## 🔧 Si Algo Falla

### Job: Lint & Type Check
**Error común:** Errores de ESLint/TypeScript
**Solución:** 
```bash
npm run lint
npx tsc --noEmit
```
Arregla los errores localmente y vuelve a pushear.

### Job: Unit Tests
**Error común:** Tests fallando
**Solución:**
```bash
npm test
```
Asegúrate de que todos los tests pasen localmente.

### Job: Database Validation
**Error común:** Migraciones inválidas
**Solución:**
```bash
npx prisma validate
npx prisma migrate dev
```

### Job: E2E Tests
**Error común:** Playwright timeout, auth issues
**Solución:** Este job tiene `continue-on-error: true`, no bloqueará el build.

### Job: Build Docker
**Error común:** Build context demasiado grande
**Solución:** Verifica `.dockerignore` esté configurado correctamente.

### Job: Security Scan
**Error común:** Vulnerabilidades CRITICAL/HIGH encontradas
**Solución:** Revisa el reporte en GitHub Security tab y actualiza dependencias.

---

## 📊 Matriz de Ejecución

| Push a | Lint | Tests | DB | E2E | Docker | Security | Notify |
|--------|------|-------|----|----|--------|----------|--------|
| `main` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| `develop` | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ |
| PR → `main` | ✅ | ✅ | ✅ | ⚠️ | ❌ | ❌ | ❌ |

**Leyenda:**
- ✅ Se ejecuta siempre
- ⚠️ Se ejecuta pero puede fallar sin bloquear
- ❌ No se ejecuta en este escenario

---

## ✅ Checklist de Verificación

- [x] Workflow `test.yml` eliminado
- [x] Push a GitHub completado
- [ ] Workflow "CI/CD Pipeline" ejecutándose en Actions
- [ ] Todos los jobs en verde (excepto E2E que puede fallar)
- [ ] Imagen Docker pusheada a ghcr.io
- [ ] Security scan completado
- [ ] Notificación de éxito

---

**🎉 Tu pipeline CI/CD completo está activo nuevamente!**

Monitorea en: https://github.com/tucano1306/CRM/actions
