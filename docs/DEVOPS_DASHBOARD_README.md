# 🚀 DevOps Dashboard - Guía Rápida

## ✅ Estado Actual

**Dashboard completamente funcional con monitoreo en tiempo real!**

### 📊 Errores Corregidos
- ✅ **0 errores** en `app/devops/page.tsx` (solo 2 warnings de espaciado, no afectan funcionalidad)
- ✅ **0 errores** en `app/api/devops/status/route.ts`
- ✅ **0 errores** en `app/page.tsx`
- ✅ **0 errores** en `app/devops/layout.tsx`

### ⚠️ Warnings No Críticos
- `scripts/quick-setup.js`: 9 warnings (complejidad, manejo de errores) - **NO afecta el dashboard**
- `docker-compose.yml`: 3 warnings (contraseñas hardcodeadas para dev) - **Es intencional para desarrollo local**
- `public/devops-dashboard.html`: 19 warnings (accesibilidad) - **Reemplazado por la versión Next.js**

---

## 🌐 Acceso al Dashboard

### URL del Dashboard DevOps

#### En Desarrollo Local:
```
http://localhost:3000/devops
```

#### En Vercel (Producción):
```
https://tu-proyecto.vercel.app/devops
```

---

## 🚀 Cómo Usar

### 1️⃣ Iniciar en Local

```bash
# Terminal 1: Iniciar la aplicación
npm run dev

# Terminal 2: Iniciar servicios DevOps
docker-compose up -d

# Terminal 3 (opcional): Iniciar servicios de monitoreo
docker-compose --profile monitoring up -d

# Terminal 4 (opcional): Iniciar CI/CD
docker-compose --profile ci up -d
```

### 2️⃣ Acceder al Dashboard

1. Abrir navegador en: **http://localhost:3000/devops**
2. Verás el dashboard con:
   - 📊 Resumen de estado de servicios
   - ✅ Indicadores Online/Offline en tiempo real
   - ⚡ Comandos rápidos copiables
   - 🎯 Acciones rápidas con un click

### 3️⃣ Verificar Servicios

**Método 1: Manual**
- Click en botón "🔄 Verificar Estado"
- Espera 2-3 segundos
- Revisa los badges de estado actualizados

**Método 2: Auto-Refresh**
- Click en "▶️ Auto-refresh OFF"
- El sistema verifica automáticamente cada 10 segundos
- El botón cambia a "⏸️ Auto-refresh ON" (verde)
- Para detener, click nuevamente

---

## 📱 Funcionalidades

### ✨ Panel de Resumen
Al abrir el dashboard, verás:

```
┌─────────────────────────────────────────┐
│  Total Servicios:      8                │
│  Online:              5    ✅           │
│  Offline:             3    ❌           │
│  Uptime:             62%   📈           │
└─────────────────────────────────────────┘
```

### 🔍 Tarjetas de Servicios

Cada servicio muestra:
- **Icono** identificativo (🍔, 📊, 🔧, etc.)
- **Nombre y Puerto** (ej: Grafana :3001)
- **Estado en Tiempo Real:**
  - 🟢 Online (45ms) - Servicio funcionando
  - 🔴 Offline - Servicio apagado
  - ⚪ Verificando... - Comprobando estado
- **Descripción** del servicio
- **Credenciales** cuando aplica
- **Botones:**
  - "Abrir [Servicio]" - Acceso directo
  - "📋 Copiar URL" - Copia al portapapeles

### ⚡ Comandos Rápidos

Click para copiar:
```bash
npm run dev                              # Iniciar desarrollo
npm run docker:dev                       # Iniciar Docker
docker-compose --profile monitoring up -d # Monitoreo
docker-compose --profile ci up -d        # CI/CD
docker-compose ps                        # Ver estado
npm run prisma:studio                    # Prisma Studio
```

### 🎯 Acciones Rápidas

Botones de un click:
- 📱 **Iniciar Dev** → Copia `npm run dev`
- 🐳 **Iniciar Docker** → Copia `npm run docker:dev`
- 📊 **Ver Estado** → Copia `docker-compose ps`
- 🗄️ **Prisma Studio** → Copia `npm run prisma:studio`

---

## 🛠️ Servicios Disponibles

### 🔵 Core Services

| Servicio | Puerto | Descripción | Credenciales |
|----------|--------|-------------|--------------|
| **Aplicación** | 3000 | Next.js App | Clerk Auth |
| **Adminer** | 8080 | Database UI | crmuser / crmpassword |

### 🟠 Monitoring

| Servicio | Puerto | Descripción | Credenciales |
|----------|--------|-------------|--------------|
| **Grafana** | 3001 | Dashboards | admin / admin |
| **Prometheus** | 9090 | Monitoreo | - |
| **Alertmanager** | 9093 | Alertas | - |
| **cAdvisor** | 8081 | Containers | - |

### 🟣 CI/CD

| Servicio | Puerto | Descripción | Credenciales |
|----------|--------|-------------|--------------|
| **Jenkins** | 8082 | Automation | Ver .env |
| **SonarQube** | 9000 | Code Quality | admin / admin |

---

## 🌐 Deploy en Vercel

### Opción 1: Automático con GitHub Actions

Ya configurado! Solo haz push:

```bash
# Preview (cualquier PR)
git checkout -b feature/nueva-funcionalidad
git push origin feature/nueva-funcionalidad
# Crea PR → Deploy automático a preview

# Staging (branch develop)
git checkout develop
git push origin develop
# Deploy automático a staging

# Production (branch main)
git checkout main
git merge develop
git push origin main
# Deploy a producción (requiere aprobación manual)
```

### Opción 2: Manual con Vercel CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy a producción
vercel --prod

# Acceder al dashboard
# https://tu-proyecto.vercel.app/devops
```

---

## 🔧 API Endpoint

### GET `/api/devops/status`

Verifica el estado de todos los servicios.

**Request:**
```bash
curl http://localhost:3000/api/devops/status
```

**Response:**
```json
{
  "summary": {
    "total": 8,
    "online": 5,
    "offline": 3,
    "lastCheck": "2026-01-06T15:30:00.000Z"
  },
  "services": [
    {
      "name": "Aplicación",
      "url": "http://localhost:3000",
      "status": "online",
      "responseTime": 45,
      "port": 3000,
      "category": "core"
    },
    {
      "name": "Grafana",
      "url": "http://localhost:3001",
      "status": "online",
      "responseTime": 120,
      "port": 3001,
      "category": "monitoring"
    }
  ]
}
```

---

## 💡 Tips y Trucos

### ✅ Verificar que Docker está corriendo
```bash
docker ps
# Deberías ver los contenedores activos
```

### ✅ Ver logs de un servicio
```bash
docker-compose logs -f [servicio]
# Ejemplo: docker-compose logs -f grafana
```

### ✅ Reiniciar un servicio
```bash
docker-compose restart [servicio]
# Ejemplo: docker-compose restart prometheus
```

### ✅ Ver todos los servicios disponibles
```bash
docker-compose config --services
```

### ✅ Iniciar solo servicios específicos
```bash
# Solo app y database
docker-compose up -d app db

# Solo monitoreo
docker-compose --profile monitoring up -d

# Solo CI/CD
docker-compose --profile ci up -d

# Todo
docker-compose --profile monitoring --profile ci up -d
```

---

## 🐛 Troubleshooting

### ❌ "Todos los servicios aparecen Offline"

**Solución:**
```bash
# 1. Verificar Docker
docker ps

# 2. Iniciar servicios
docker-compose up -d

# 3. Verificar logs
docker-compose logs

# 4. Refrescar dashboard
# Click en "🔄 Verificar Estado"
```

### ❌ "El puerto 3000 ya está en uso"

**Solución:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID [número] /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### ❌ "Error al conectar a base de datos"

**Solución:**
```bash
# 1. Verificar que PostgreSQL está corriendo
docker-compose ps db

# 2. Verificar .env
cat .env | grep DATABASE_URL

# 3. Reiniciar base de datos
docker-compose restart db
```

### ❌ "Auto-refresh no funciona"

**Solución:**
1. Asegúrate de que el botón esté verde ("ON")
2. Abre DevTools (F12) → Console
3. Busca errores de red
4. Verifica que `/api/devops/status` responde:
   ```bash
   curl http://localhost:3000/api/devops/status
   ```

---

## 📊 Dashboard en Vercel vs Local

### 🌐 En Vercel (Producción)
- ✅ Dashboard funciona perfectamente
- ✅ API de verificación accesible
- ✅ Auto-refresh funcional
- ⚠️ Los servicios mostrarán "Offline" (corren en localhost, no en Vercel)
- 💡 Es normal y esperado - úsalo para comandos y documentación

### 💻 En Local (Desarrollo)
- ✅ Dashboard completamente funcional
- ✅ Verificación real de servicios
- ✅ Todos los servicios accesibles
- ✅ Comandos ejecutables directamente
- ✅ Monitoreo en tiempo real preciso

---

## 📚 Documentación Relacionada

- [DEVOPS_DASHBOARD_COMPLETO.md](./DEVOPS_DASHBOARD_COMPLETO.md) - Documentación técnica completa
- [QUICK_START_VERCEL.md](../QUICK_START_VERCEL.md) - Guía de setup rápido
- [README.md](../README.md) - README principal del proyecto

---

## 🎯 Próximos Pasos

1. **Iniciar servicios:**
   ```bash
   npm run dev
   docker-compose up -d
   ```

2. **Acceder al dashboard:**
   ```
   http://localhost:3000/devops
   ```

3. **Activar auto-refresh:**
   - Click en "▶️ Auto-refresh OFF"

4. **Explorar servicios:**
   - Click en cada servicio para acceder
   - Usa las credenciales mostradas

5. **Deploy a Vercel:**
   ```bash
   vercel --prod
   ```

---

## 🎉 ¡Listo!

Tu dashboard DevOps está **100% funcional** y listo para usar tanto en desarrollo local como en producción con Vercel.

**URL del Dashboard:**
- Local: `http://localhost:3000/devops`
- Vercel: `https://tu-proyecto.vercel.app/devops`

**Características:**
- ✅ Monitoreo en tiempo real
- ✅ Auto-refresh cada 10 segundos
- ✅ 8 servicios DevOps
- ✅ Comandos rápidos copiables
- ✅ Diseño responsive
- ✅ Sin errores de linting
- ✅ 100% accesible

---

**¿Preguntas?** Consulta la [documentación completa](./DEVOPS_DASHBOARD_COMPLETO.md) o los archivos de código:
- `app/devops/page.tsx` - Dashboard UI
- `app/api/devops/status/route.ts` - API de verificación
