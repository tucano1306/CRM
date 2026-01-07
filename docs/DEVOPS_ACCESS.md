# DevOps Dashboard - Acceso Rápido

## 🎯 Acceso a Herramientas DevOps

### Opción 1: Dashboard HTML (Recomendado)
Abre el archivo HTML en tu navegador:

```bash
# Windows
start public/devops-dashboard.html

# Mac/Linux
open public/devops-dashboard.html
```

O simplemente abre: `public/devops-dashboard.html` en tu navegador favorito.

### Opción 2: API Endpoint
```bash
# Iniciar la aplicación
npm run dev

# Acceder a la API
http://localhost:3000/api/devops
```

---

## 🚀 URLs de Acceso Directo

### Servicios Principales (Siempre Disponibles)
- **Aplicación**: http://localhost:3000
- **Adminer (DB UI)**: http://localhost:8080
  - Server: `db`
  - Username: `crmuser`
  - Password: `crmpassword`
  - Database: `food_orders_crm`

### Servicios de Monitoreo (Opcional - Profile `monitoring`)
```bash
# Iniciar servicios de monitoreo
docker-compose --profile monitoring up -d
```

- **Grafana**: http://localhost:3001 (admin / admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **cAdvisor**: http://localhost:8081

### Servicios CI/CD (Opcional - Profile `ci`)
```bash
# Iniciar servicios CI/CD
docker-compose --profile ci up -d
```

- **Jenkins**: http://localhost:8082 (ver .env para credenciales)
- **SonarQube**: http://localhost:9000 (admin / admin)

---

## ⚡ Comandos Quick Start

```bash
# Ver todos los servicios
docker-compose ps

# Iniciar solo base de datos
npm run docker:dev

# Iniciar desarrollo
npm run dev

# Ver base de datos con Prisma Studio
npm run prisma:studio

# Logs de servicios
docker-compose logs -f [servicio]
```

---

## 📊 Tabla de Puertos

| Puerto | Servicio | Estado | Perfil |
|--------|----------|--------|--------|
| 3000 | Next.js App | Siempre | default |
| 5432 | PostgreSQL | Siempre | default |
| 6379 | Redis | Siempre | default |
| 8080 | Adminer | Siempre | default |
| 8081 | cAdvisor | Opcional | monitoring |
| 8082 | Jenkins | Opcional | ci |
| 9000 | SonarQube | Opcional | ci |
| 9090 | Prometheus | Opcional | monitoring |
| 9093 | Alertmanager | Opcional | monitoring |
| 3001 | Grafana | Opcional | monitoring |

---

## 🔧 Iniciar Servicios Específicos

### Solo Base de Datos
```bash
docker-compose up -d db redis adminer
```

### Base de Datos + Monitoreo
```bash
docker-compose --profile monitoring up -d db redis adminer prometheus grafana
```

### Stack Completo
```bash
docker-compose --profile monitoring --profile ci up -d
```

---

## 📱 Bookmark estas URLs

Guarda estas URLs como marcadores en tu navegador:

- 🍔 App: http://localhost:3000
- 🗄️ DB: http://localhost:8080
- 📊 Grafana: http://localhost:3001
- 📈 Prometheus: http://localhost:9090
- 🔧 Jenkins: http://localhost:8082
- 🔍 SonarQube: http://localhost:9000

---

## ✅ Verificar Estado

```bash
# PowerShell
curl http://localhost:3000/api/health
curl http://localhost:9090/-/healthy
curl http://localhost:3001/api/health

# Navegador
# Abre: public/devops-dashboard.html
```

---

Para más información, consulta [DEVOPS_README.md](../DEVOPS_README.md)
