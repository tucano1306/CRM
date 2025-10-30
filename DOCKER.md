# ==============================================================================
# Docker Deployment Guide - Food Orders CRM
# ==============================================================================

## 📋 Prerequisites

- Docker Engine 24.0+
- Docker Compose 2.20+
- 4GB RAM minimum (8GB recommended)
- 20GB disk space

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Copy environment template
cp .env.docker.example .env

# Edit .env with your actual values
nano .env  # or use your preferred editor
```

### 2. Development Mode

Run only database and Redis for local development:

```bash
# Start infrastructure
docker-compose -f docker-compose.dev.yml up -d

# Your app runs locally with:
npm run dev

# Access Adminer (DB UI): http://localhost:8080
```

### 3. Production Mode

Run the full stack in containers:

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Access the app: http://localhost:3000
```

## 🔧 Available Commands

### Build

```bash
# Linux/Mac
./docker-build.sh

# Windows PowerShell
.\docker-build.ps1

# Manual
docker build -t food-orders-crm:latest .
```

### Start Services

```bash
# Development (DB + Redis only)
docker-compose -f docker-compose.dev.yml up -d

# Production (Full stack)
docker-compose up -d

# Production with Nginx
docker-compose --profile production up -d
```

### Stop Services

```bash
# Stop all containers
docker-compose down

# Stop and remove volumes (⚠️ deletes data)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
docker-compose logs -f redis
```

### Database Operations

```bash
# Run Prisma migrations
docker-compose exec app npx prisma migrate deploy

# Seed database
docker-compose exec app npx prisma db seed

# Open Prisma Studio
docker-compose exec app npx prisma studio

# Backup database
docker-compose exec db pg_dump -U crmuser food_orders_crm > backup.sql

# Restore database
docker-compose exec -T db psql -U crmuser food_orders_crm < backup.sql
```

### Container Management

```bash
# List running containers
docker-compose ps

# Restart a service
docker-compose restart app

# Rebuild and restart
docker-compose up -d --build app

# Shell into container
docker-compose exec app sh
docker-compose exec db psql -U crmuser food_orders_crm
```

## 📊 Monitoring

### Health Checks

```bash
# Check app health
curl http://localhost:3000/api/health

# Check all services
docker-compose ps
```

### Resource Usage

```bash
# View stats
docker stats

# Specific container
docker stats crm-app
```

## 🔐 Security Checklist

- [ ] Change default passwords in `.env`
- [ ] Use strong PostgreSQL password
- [ ] Use strong Redis password
- [ ] Configure SSL certificates for Nginx
- [ ] Set up firewall rules
- [ ] Enable Docker security scanning
- [ ] Regularly update base images

## 🌐 Production Deployment

### With Nginx (Recommended)

1. **Configure SSL certificates:**
   ```bash
   mkdir -p nginx/ssl
   # Add your certificate.crt and private.key
   ```

2. **Update nginx.conf:**
   - Replace `your-domain.com` with actual domain
   - Configure SSL paths

3. **Start with production profile:**
   ```bash
   docker-compose --profile production up -d
   ```

### Environment Variables for Production

Required variables in `.env`:

```env
# Database
POSTGRES_PASSWORD=super_secure_password_here
DATABASE_URL=postgresql://crmuser:super_secure_password_here@db:5432/food_orders_crm

# Redis
REDIS_PASSWORD=another_secure_password

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
CLERK_SECRET_KEY=sk_live_xxxxx

# Production
NODE_ENV=production
```

## 🔄 Update & Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build app
```

### Database Migrations

```bash
# Create migration (development)
npx prisma migrate dev --name your_migration_name

# Apply migration (production)
docker-compose exec app npx prisma migrate deploy
```

### Backup Strategy

```bash
# Automated backup script
docker-compose exec db pg_dump -U crmuser food_orders_crm | \
  gzip > backups/backup-$(date +%Y%m%d-%H%M%S).sql.gz
```

## 🐛 Troubleshooting

### Container won't start

```bash
# Check logs
docker-compose logs app

# Check if ports are in use
netstat -tulpn | grep 3000

# Remove and recreate
docker-compose down
docker-compose up -d --force-recreate
```

### Database connection issues

```bash
# Check if DB is ready
docker-compose exec db pg_isready -U crmuser

# Reset database (⚠️ deletes data)
docker-compose down -v
docker-compose up -d
docker-compose exec app npx prisma migrate deploy
```

### Out of disk space

```bash
# Clean unused Docker resources
docker system prune -a --volumes

# Check disk usage
docker system df
```

## 📈 Performance Tuning

### Database Optimization

Edit `docker-compose.yml` for PostgreSQL:

```yaml
db:
  command: >
    postgres
    -c shared_buffers=256MB
    -c effective_cache_size=1GB
    -c maintenance_work_mem=64MB
    -c checkpoint_completion_target=0.9
```

### Redis Configuration

For production workloads:

```yaml
redis:
  command: >
    redis-server
    --maxmemory 512mb
    --maxmemory-policy allkeys-lru
    --appendonly yes
```

## 🔗 Useful Links

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Next.js Docker Deployment](https://nextjs.org/docs/deployment#docker-image)
- [Prisma in Docker](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

## 📞 Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Review health checks: `docker-compose ps`
- Inspect container: `docker-compose exec app sh`
