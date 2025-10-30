# 🚢 Production Deployment Guide

## Pre-Deployment Checklist

### 1. Server Requirements

- [ ] Ubuntu 22.04 LTS o superior
- [ ] Docker Engine 24.0+
- [ ] Docker Compose 2.20+
- [ ] Mínimo 4GB RAM
- [ ] Mínimo 20GB storage
- [ ] Dominio configurado (para SSL)

### 2. Environment Configuration

- [ ] `.env` configurado con valores de producción
- [ ] Passwords fuertes generados
- [ ] Clerk keys de producción configuradas
- [ ] Database URL apuntando al host correcto

### 3. Security

- [ ] Firewall configurado (solo 80, 443, 22 abiertos)
- [ ] SSL certificates obtenidos
- [ ] Secrets no committeados a Git
- [ ] SSH key-based authentication habilitado

## Deployment Methods

### Method 1: Manual Deployment

#### Step 1: Preparar el Servidor

```bash
# Conectar al servidor
ssh user@your-server.com

# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version

# Crear directorio para la app
sudo mkdir -p /opt/food-orders-crm
sudo chown $USER:$USER /opt/food-orders-crm
```

#### Step 2: Transferir Archivos

```bash
# Desde tu máquina local
rsync -avz --exclude 'node_modules' --exclude '.next' \
  ./ user@your-server.com:/opt/food-orders-crm/

# O clonar desde Git (recomendado)
ssh user@your-server.com
cd /opt/food-orders-crm
git clone https://github.com/your-org/food-orders-crm.git .
```

#### Step 3: Configurar Environment

```bash
# En el servidor
cd /opt/food-orders-crm

# Crear .env desde template
cp .env.docker.example .env

# Editar con valores de producción
nano .env

# Configurar:
# - POSTGRES_PASSWORD=<strong-password>
# - REDIS_PASSWORD=<strong-password>
# - CLERK_SECRET_KEY=<production-key>
# - DATABASE_URL=postgresql://...
```

#### Step 4: SSL Certificates (Let's Encrypt)

```bash
# Instalar certbot
sudo apt install certbot -y

# Obtener certificados
sudo certbot certonly --standalone -d your-domain.com

# Copiar a nginx/ssl
sudo mkdir -p nginx/ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem nginx/ssl/certificate.crt
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem nginx/ssl/private.key
sudo chown $USER:$USER nginx/ssl/*
```

#### Step 5: Deploy

```bash
# Build y start
docker-compose build
docker-compose --profile production up -d

# Ejecutar migraciones
docker-compose exec app npx prisma migrate deploy

# (Opcional) Seed initial data
docker-compose exec app npx prisma db seed

# Verificar status
docker-compose ps
curl http://localhost:3000/api/health
```

#### Step 6: Configurar Auto-Renewal SSL

```bash
# Test renewal
sudo certbot renew --dry-run

# Crear script de renovación
sudo nano /etc/cron.monthly/renew-ssl.sh

# Contenido del script:
#!/bin/bash
certbot renew --quiet
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/food-orders-crm/nginx/ssl/certificate.crt
cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/food-orders-crm/nginx/ssl/private.key
docker-compose -f /opt/food-orders-crm/docker-compose.yml restart nginx

# Dar permisos
sudo chmod +x /etc/cron.monthly/renew-ssl.sh
```

### Method 2: Automated Deployment (CI/CD)

#### Step 1: Configurar GitHub Secrets

En GitHub: `Settings → Secrets → Actions`

```
PROD_HOST=your-server.com
PROD_USER=deploy_user
PROD_SSH_KEY=<private-ssh-key-content>
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

#### Step 2: Preparar Servidor para CI/CD

```bash
# Crear usuario de deployment
sudo adduser deploy_user
sudo usermod -aG docker deploy_user

# Configurar SSH key
sudo -u deploy_user mkdir -p /home/deploy_user/.ssh
sudo nano /home/deploy_user/.ssh/authorized_keys
# Pegar public key
sudo chmod 600 /home/deploy_user/.ssh/authorized_keys
sudo chown -R deploy_user:deploy_user /home/deploy_user/.ssh

# Dar permisos
sudo chown -R deploy_user:deploy_user /opt/food-orders-crm
```

#### Step 3: Trigger Deployment

```bash
# Crear un release en GitHub
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# O crear release desde GitHub UI
# GitHub Actions automáticamente:
# 1. Buildea la imagen
# 2. La sube a Container Registry
# 3. Se conecta al servidor
# 4. Pull de la nueva imagen
# 5. Restart de containers
```

### Method 3: Docker Swarm (Multi-node)

```bash
# Inicializar swarm
docker swarm init

# Deploy stack
docker stack deploy -c docker-compose.yml crm

# Escalar servicios
docker service scale crm_app=3

# Ver estado
docker service ls
docker stack ps crm
```

## Post-Deployment

### 1. Verificar Health

```bash
# Health check
curl https://your-domain.com/api/health

# Expected response:
{
  "status": "ok",
  "services": {
    "database": "connected",
    "api": "operational"
  }
}
```

### 2. Monitoreo

```bash
# Ver logs
docker-compose logs -f app

# Stats de recursos
docker stats

# Verificar que todos los containers estén running
docker-compose ps
```

### 3. Configurar Backups Automáticos

```bash
# Crear script de backup
sudo nano /opt/backup-crm.sh

# Contenido:
#!/bin/bash
BACKUP_DIR="/opt/backups/food-orders-crm"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR
cd /opt/food-orders-crm

# Backup database
docker-compose exec -T db pg_dump -U crmuser food_orders_crm | \
  gzip > $BACKUP_DIR/db-backup-$DATE.sql.gz

# Backup volumes
docker run --rm -v crm-app-uploads:/data -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/uploads-$DATE.tar.gz -C /data .

# Mantener solo últimos 7 días
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

# Dar permisos y agregar a cron
sudo chmod +x /opt/backup-crm.sh

# Ejecutar diario a las 2 AM
sudo crontab -e
# Agregar: 0 2 * * * /opt/backup-crm.sh
```

### 4. Configurar Monitoring (Opcional)

```bash
# Agregar Prometheus + Grafana
cat >> docker-compose.yml << 'EOF'

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - crm-network

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    networks:
      - crm-network

volumes:
  prometheus_data:
  grafana_data:
EOF

# Restart con nuevos servicios
docker-compose up -d
```

## Maintenance

### Updates

```bash
# Pull latest code
cd /opt/food-orders-crm
git pull origin main

# Rebuild and restart
docker-compose build
docker-compose up -d

# Run new migrations
docker-compose exec app npx prisma migrate deploy
```

### Database Migrations

```bash
# Ver estado de migrations
docker-compose exec app npx prisma migrate status

# Aplicar migrations pendientes
docker-compose exec app npx prisma migrate deploy

# Rollback (si es necesario)
# Restaurar backup y aplicar migrations específicas
```

### Scaling

```bash
# Escalar horizontalmente (con load balancer)
docker-compose up -d --scale app=3

# Configurar Nginx como load balancer
# Editar nginx/nginx.conf:
upstream nextjs_app {
    server app_1:3000;
    server app_2:3000;
    server app_3:3000;
}
```

## Troubleshooting

### Containers no inician

```bash
# Ver logs
docker-compose logs app

# Verificar recursos
df -h
free -m

# Recrear containers
docker-compose down
docker-compose up -d --force-recreate
```

### SSL Issues

```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Test SSL
curl -vI https://your-domain.com
```

### Database Issues

```bash
# Conectar a database
docker-compose exec db psql -U crmuser food_orders_crm

# Ver conexiones activas
SELECT * FROM pg_stat_activity;

# Restart database
docker-compose restart db
```

### Performance Issues

```bash
# Aumentar recursos en docker-compose.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G

# Optimizar database
docker-compose exec db psql -U crmuser -d food_orders_crm -c "VACUUM ANALYZE;"

# Habilitar Redis caching en app
```

## Rollback Strategy

### Quick Rollback

```bash
# 1. Tag versión actual
docker tag food-orders-crm:latest food-orders-crm:backup

# 2. Pull versión anterior del registry
docker pull ghcr.io/your-org/food-orders-crm:v1.0.0

# 3. Tag como latest
docker tag ghcr.io/your-org/food-orders-crm:v1.0.0 food-orders-crm:latest

# 4. Restart
docker-compose up -d --force-recreate app

# 5. Rollback migrations si es necesario
# Restaurar backup de DB
```

## Security Hardening

```bash
# 1. Firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 2. Fail2ban
sudo apt install fail2ban -y
sudo systemctl enable fail2ban

# 3. Automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure unattended-upgrades

# 4. Docker security
docker run --security-opt no-new-privileges --read-only ...

# 5. Regular audits
docker scan food-orders-crm:latest
```

## Support & Monitoring

### Dashboards

- Application: https://your-domain.com
- Adminer (DB): https://your-domain.com:8080
- Prometheus: https://your-domain.com:9090
- Grafana: https://your-domain.com:3001

### Logs Location

```bash
/opt/food-orders-crm/
├── logs/              # Application logs
├── backups/           # Database backups
└── nginx/logs/        # Nginx access/error logs
```

### Contact

- Email: devops@your-domain.com
- Slack: #crm-production
- On-call: PagerDuty
