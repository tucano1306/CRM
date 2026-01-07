# Quick Start - Herramientas DevOps

## 🚀 Inicio Rápido en 5 Pasos

### 1. Variables de Entorno
Copia `.env.example` y configura tus credenciales:
```bash
cp .env.example .env
# Editar .env con tus valores
```

### 2. Iniciar Servicios Base
```bash
# Aplicación principal + DB + Redis
docker-compose up -d
```

### 3. Iniciar Monitoreo
```bash
# Prometheus + Grafana + Exportadores
docker-compose --profile monitoring up -d
```

### 4. Iniciar CI/CD
```bash
# Jenkins + SonarQube
docker-compose --profile ci up -d
```

### 5. Verificar
```bash
# Ver todos los servicios
docker-compose ps

# URLs de acceso
echo "App: http://localhost:3000"
echo "Jenkins: http://localhost:8082"
echo "Grafana: http://localhost:3001"
echo "Prometheus: http://localhost:9090"
echo "SonarQube: http://localhost:9000"
```

## 🎯 Accesos Rápidos

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Aplicación | http://localhost:3000 | - |
| Jenkins | http://localhost:8082 | admin / (ver .env) |
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| SonarQube | http://localhost:9000 | admin / admin |
| Adminer | http://localhost:8080 | - |

## 📋 Comandos Esenciales

### Deployment
```bash
# Deploy a staging
ansible-playbook -i ansible/inventories/staging ansible/playbooks/deploy.yml

# Deploy a producción
ansible-playbook -i ansible/inventories/production ansible/playbooks/deploy.yml
```

### Monitoreo
```bash
# Ver métricas en tiempo real
docker-compose logs -f prometheus

# Ver alertas activas
curl http://localhost:9090/api/v1/alerts
```

### CI/CD
```bash
# Trigger build manual
# Ir a Jenkins UI → Build Now

# Ver estado de pipeline
docker-compose logs -f jenkins
```

### Backup
```bash
# Backup de base de datos
ansible-playbook -i ansible/inventories/production ansible/playbooks/backup.yml
```

## 🔧 Troubleshooting Rápido

### Servicio no inicia
```bash
docker-compose logs [service_name]
docker-compose restart [service_name]
```

### Limpiar y reiniciar
```bash
docker-compose down
docker-compose up -d
```

### Ver recursos
```bash
docker stats
docker system df
```

## 📚 Documentación Completa

Ver [DEVOPS_TOOLS_GUIDE.md](./DEVOPS_TOOLS_GUIDE.md) para documentación detallada.
