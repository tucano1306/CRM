# 🚀 DevOps Guide - Food Orders CRM

## Tabla de Contenidos

1. [Arquitectura Docker](#arquitectura-docker)
2. [Quick Start](#quick-start)
3. [Ambientes](#ambientes)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Monitoreo](#monitoreo)
6. [Seguridad](#seguridad)
7. [Troubleshooting](#troubleshooting)

## Arquitectura Docker

### Servicios

```
┌─────────────────────────────────────────────────┐
│                   Nginx (opcional)              │
│          Reverse Proxy + SSL + Cache            │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│              Next.js Application                │
│         Node.js 22 + Next.js 15                 │
└─────┬─────────────────────────────────┬─────────┘
      │                                 │
      ▼                                 ▼
┌─────────────────┐          ┌──────────────────┐
│   PostgreSQL    │          │      Redis       │
│   Database      │          │      Cache       │
└─────────────────┘          └──────────────────┘
```

### Características

- ✅ Multi-stage build para optimización de imagen
- ✅ Imágenes Alpine para menor tamaño
- ✅ Non-root user para seguridad
- ✅ Health checks automáticos
- ✅ Persistent volumes para datos
- ✅ Network isolation
- ✅ Auto-restart policies

## Quick Start

### Prerequisitos

```bash
# Verificar versiones
docker --version          # Mínimo 24.0
docker-compose --version  # Mínimo 2.20
```

### Opción 1: Development (Recomendado para desarrollo local)

```bash
# 1. Clonar y configurar
git clone <repo-url>
cd food-orders-crm
cp .env.docker.example .env

# 2. Editar .env con tus credenciales

# 3. Iniciar solo infraestructura
make dev
# o
docker-compose -f docker-compose.dev.yml up -d

# 4. En otra terminal, correr la app localmente
npm install
npm run dev

# 5. Acceder
# App: http://localhost:3000
# Adminer (DB UI): http://localhost:8080
```

### Opción 2: Production (Full containerizado)

```bash
# 1. Build y start
make prod-build
# o
docker-compose up -d --build

# 2. Ejecutar migraciones
make db-migrate
# o
docker-compose exec app npx prisma migrate deploy

# 3. (Opcional) Seed data
make db-seed

# 4. Acceder
# App: http://localhost:3000
```

### Opción 3: Production con Nginx

```bash
# 1. Configurar SSL certificates
mkdir -p nginx/ssl
# Agregar certificate.crt y private.key

# 2. Editar nginx/nginx.conf con tu dominio

# 3. Start con profile production
make prod-nginx
# o
docker-compose --profile production up -d

# 4. Acceder
# HTTP: http://localhost:80
# HTTPS: https://localhost:443
```

## Ambientes

### Development Environment

**Archivo:** `docker-compose.dev.yml`

**Incluye:**
- PostgreSQL (puerto 5432)
- Redis (puerto 6379)
- Adminer (puerto 8080)

**Uso:**
```bash
make dev              # Start
make dev-down         # Stop
make dev-logs         # View logs
```

**Ventajas:**
- ✅ Rápido rebuild
- ✅ Hot reload de Next.js
- ✅ Debugging tools accesibles
- ✅ No necesita rebuild de Docker para cambios de código

### Production Environment

**Archivo:** `docker-compose.yml`

**Incluye:**
- Todos los servicios de development
- Next.js App containerizada
- Nginx (opcional con profile)

**Uso:**
```bash
make prod             # Start production
make prod-build       # Build + Start
make prod-nginx       # Start con Nginx
```

**Ventajas:**
- ✅ Optimizado para performance
- ✅ Multi-stage build
- ✅ Seguridad hardened
- ✅ Auto-scaling ready

## CI/CD Pipeline

### GitHub Actions Workflow

**Archivo:** `.github/workflows/docker-ci-cd.yml`

**Pipeline Stages:**

```
┌─────────────┐
│   Trigger   │  Push/PR/Release
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Test      │  Lint + TypeCheck + Unit Tests
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Build     │  Docker Build + Push to Registry
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Security   │  Trivy Vulnerability Scan
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Deploy    │  Deploy to Production (on release)
└─────────────┘
```

### Configurar Secrets en GitHub

```
Settings → Secrets and variables → Actions → New repository secret
```

**Required Secrets:**

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY

# Database
DATABASE_URL
DIRECT_URL

# Production Server (for deployment)
PROD_HOST            # IP o hostname del servidor
PROD_USER            # Usuario SSH
PROD_SSH_KEY         # Private key SSH

# Notifications (opcional)
SLACK_WEBHOOK        # Para notificaciones
```

### Triggers

```yaml
# Automatic triggers:
- Push to main/develop → Build & Test
- Pull Request → Build & Test
- Create Release → Build & Test & Deploy

# Manual trigger:
gh workflow run docker-ci-cd.yml
```

## Monitoreo

### Health Checks

**Endpoint de Health:**
```bash
curl http://localhost:3000/api/health

# Response:
{
  "status": "ok",
  "timestamp": "2025-10-29T...",
  "services": {
    "database": "connected",
    "api": "operational"
  },
  "performance": {
    "responseTime": "45ms"
  }
}
```

**Docker Health Checks:**
```bash
# Ver estado de health
docker-compose ps

# Detalles de health check
docker inspect crm-app | jq '.[0].State.Health'
```

### Logs

```bash
# Todos los servicios
make logs
docker-compose logs -f

# Servicio específico
make logs-app
make logs-db
make logs-redis

# Filtrar por tiempo
docker-compose logs --since 1h app

# Buscar en logs
docker-compose logs app | grep ERROR
```

### Resource Monitoring

```bash
# Stats en tiempo real
make stats
docker stats

# Solo un contenedor
docker stats crm-app

# Disk usage
docker system df
```

### Prometheus + Grafana (Avanzado)

Para implementar monitoring completo, agregar a `docker-compose.yml`:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Seguridad

### Best Practices Implementadas

✅ **Multi-stage builds** - Reduce attack surface
✅ **Non-root user** - App corre como user `nextjs` (uid 1001)
✅ **Alpine images** - Menor superficie de ataque
✅ **Security headers** - Configurados en Nginx
✅ **Secrets management** - Usar `.env` (nunca commitear)
✅ **Network isolation** - Red Docker privada
✅ **Health checks** - Auto-recovery
✅ **Resource limits** - Previene DoS

### Security Checklist

```bash
# 1. Cambiar passwords por defecto
sed -i 's/crmpassword/NEW_SECURE_PASSWORD/' .env

# 2. Usar strong passwords
openssl rand -base64 32

# 3. Scan de vulnerabilidades
docker scan food-orders-crm:latest

# 4. Actualizar imágenes base
docker-compose pull
docker-compose up -d

# 5. Review logs por actividad sospechosa
docker-compose logs | grep -i "error\|fail\|attack"
```

### SSL/TLS Configuration

```bash
# 1. Obtener certificados (Let's Encrypt)
certbot certonly --standalone -d your-domain.com

# 2. Copiar a nginx/ssl/
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/certificate.crt
cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/private.key

# 3. Restart Nginx
docker-compose restart nginx
```

## Troubleshooting

### Container no inicia

```bash
# Ver logs
docker-compose logs app

# Inspeccionar configuración
docker-compose config

# Recrear desde cero
docker-compose down
docker-compose up -d --force-recreate

# Si persiste, rebuild
docker-compose down
docker-compose build --no-cache app
docker-compose up -d
```

### Puerto en uso

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Cambiar puerto en .env
echo "APP_PORT=3001" >> .env
```

### Database connection failed

```bash
# 1. Verificar que DB esté corriendo
docker-compose ps db

# 2. Test connection
docker-compose exec db pg_isready -U crmuser

# 3. Verificar DATABASE_URL en .env
# Debe apuntar a 'db' (nombre del servicio Docker)
DATABASE_URL="postgresql://user:pass@db:5432/food_orders_crm"

# 4. Restart app
docker-compose restart app
```

### Out of disk space

```bash
# Limpiar recursos no usados
docker system prune -a --volumes

# Ver uso de disco
docker system df

# Limpiar build cache
docker builder prune -a
```

### Migrations fail

```bash
# 1. Verificar estado de migrations
docker-compose exec app npx prisma migrate status

# 2. Reset database (⚠️ borra datos)
docker-compose exec app npx prisma migrate reset

# 3. Apply migrations manualmente
docker-compose exec app npx prisma migrate deploy

# 4. Si hay conflictos, resolve migrations
docker-compose exec app npx prisma migrate resolve
```

### Performance lento

```bash
# 1. Check resource usage
docker stats

# 2. Increase memory limits en docker-compose.yml
services:
  app:
    mem_limit: 2g
    mem_reservation: 1g

# 3. Add Redis caching
# Ya incluido en docker-compose.yml

# 4. Optimize database
docker-compose exec db psql -U crmuser -d food_orders_crm -c "VACUUM ANALYZE;"
```

## Comandos Rápidos

```bash
# Makefile commands (recomendado)
make dev              # Start development
make prod             # Start production
make logs             # View all logs
make db-migrate       # Run migrations
make db-backup        # Backup database
make clean            # Remove containers
make help             # Ver todos los comandos

# Docker Compose directo
docker-compose up -d              # Start
docker-compose down               # Stop
docker-compose restart app        # Restart app
docker-compose logs -f app        # Logs
docker-compose exec app sh        # Shell

# Database
docker-compose exec db psql -U crmuser food_orders_crm
docker-compose exec app npx prisma studio

# Backup/Restore
docker-compose exec db pg_dump -U crmuser food_orders_crm > backup.sql
docker-compose exec -T db psql -U crmuser food_orders_crm < backup.sql
```

## Recursos Adicionales

- 📖 [Docker Documentation](https://docs.docker.com/)
- 📖 [Next.js Docker](https://nextjs.org/docs/deployment#docker-image)
- 📖 [Prisma Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)
- 📖 [DOCKER.md](./DOCKER.md) - Guía detallada de Docker
- 📖 [Makefile](./Makefile) - Todos los comandos disponibles

## Soporte

Para problemas o preguntas:

1. Check logs: `make logs`
2. Check health: `make health`
3. Review [Troubleshooting](#troubleshooting)
4. Open issue en GitHub
