# Guía de Herramientas DevOps - Food Orders CRM

## 📚 Tabla de Contenidos
- [Descripción General](#descripción-general)
- [Herramientas Implementadas](#herramientas-implementadas)
- [Instalación y Configuración](#instalación-y-configuración)
- [Uso de Herramientas](#uso-de-herramientas)
- [Workflows y Pipelines](#workflows-y-pipelines)
- [Monitoreo y Alertas](#monitoreo-y-alertas)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Descripción General

Este proyecto integra un stack completo de herramientas DevOps para automatización, monitoreo y gestión de infraestructura:

- **Jenkins**: CI/CD y automatización de pipelines
- **Ansible**: Gestión de configuración y deployment
- **Puppet**: Aprovisionamiento y configuración de servidores
- **Prometheus**: Recolección de métricas
- **Grafana**: Visualización de métricas
- **SonarQube**: Análisis de calidad de código

---

## 🛠️ Herramientas Implementadas

### 1. Jenkins - CI/CD

**Ubicación**: `http://localhost:8082`

#### Características
- Pipeline automatizado de build, test y deploy
- Integración con SonarQube
- Escaneo de seguridad con Trivy
- Deployment automatizado con Ansible
- Notificaciones de build

#### Archivos de Configuración
- `Jenkinsfile` - Pipeline principal
- `jenkins/casc.yaml` - Configuration as Code

### 2. Prometheus - Monitoreo

**Ubicación**: `http://localhost:9090`

#### Métricas Recolectadas
- Métricas de aplicación (Next.js)
- Métricas de base de datos (PostgreSQL)
- Métricas de cache (Redis)
- Métricas de sistema (Node Exporter)
- Métricas de contenedores (cAdvisor)

#### Archivos de Configuración
- `prometheus/prometheus.yml` - Configuración principal
- `prometheus/alerts/` - Reglas de alertas

### 3. Grafana - Dashboards

**Ubicación**: `http://localhost:3001`

**Credenciales por defecto**:
- Usuario: `admin`
- Password: `admin`

#### Dashboards Incluidos
- Application Dashboard - Métricas de la aplicación
- Database Dashboard - Métricas de PostgreSQL
- System Dashboard - Métricas del sistema

#### Archivos de Configuración
- `grafana/dashboards/` - Dashboards predefinidos
- `grafana/provisioning/` - Datasources y provisionamiento

### 4. Ansible - Deployment

#### Playbooks Disponibles
1. **setup.yml** - Configuración inicial de servidores
2. **deploy.yml** - Deployment de la aplicación
3. **backup.yml** - Backup de base de datos

#### Inventarios
- `ansible/inventories/production` - Servidores de producción
- `ansible/inventories/staging` - Servidores de staging

### 5. Puppet - Gestión de Configuración

#### Módulos Implementados
- **base** - Configuración básica del sistema
- **security** - Hardening y firewall
- **docker** - Instalación de Docker
- **monitoring** - Node Exporter
- **foodorderscrm** - Configuración de la aplicación

#### Archivos de Configuración
- `puppet/manifests/site.pp` - Manifest principal
- `puppet/modules/` - Módulos de Puppet
- `puppet/hiera.yaml` - Configuración de Hiera
- `puppet/data/` - Datos jerárquicos

### 6. SonarQube - Análisis de Código

**Ubicación**: `http://localhost:9000`

#### Análisis Configurado
- Cobertura de tests
- Code smells
- Vulnerabilidades de seguridad
- Duplicación de código
- Complejidad ciclomática

---

## 📦 Instalación y Configuración

### Paso 1: Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
# Database
POSTGRES_USER=crmuser
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=food_orders_crm

# Redis
REDIS_PASSWORD=your_redis_password

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Grafana
GRAFANA_USER=admin
GRAFANA_PASSWORD=your_grafana_password

# Jenkins
JENKINS_ADMIN_PASSWORD=your_jenkins_password

# Docker Registry
DOCKER_USERNAME=your_docker_user
DOCKER_PASSWORD=your_docker_password

# GitHub
GITHUB_USERNAME=your_github_user
GITHUB_TOKEN=your_github_token

# SonarQube
SONARQUBE_TOKEN=your_sonarqube_token
```

### Paso 2: Iniciar Servicios de Monitoreo

```bash
# Iniciar Prometheus, Grafana y exportadores
docker-compose --profile monitoring up -d
```

### Paso 3: Iniciar Servicios CI/CD

```bash
# Iniciar Jenkins y SonarQube
docker-compose --profile ci up -d
```

### Paso 4: Verificar Servicios

```bash
# Ver estado de todos los contenedores
docker-compose ps

# Ver logs
docker-compose logs -f prometheus
docker-compose logs -f jenkins
```

---

## 🚀 Uso de Herramientas

### Jenkins

#### Acceder a Jenkins
1. Abrir `http://localhost:8082`
2. Usar credenciales configuradas en `.env`

#### Ejecutar Pipeline Manual
```bash
# Desde la UI de Jenkins
1. Ir a "food-orders-crm-pipeline"
2. Click en "Build Now"
3. Ver progreso en "Build History"
```

#### Ver Resultados de Tests
1. Ir al build específico
2. Click en "Test Results"
3. Ver "Coverage Report"

### Ansible

#### Setup Inicial de Servidores
```bash
# Configurar servidores de producción
ansible-playbook -i ansible/inventories/production ansible/playbooks/setup.yml

# Configurar servidores de staging
ansible-playbook -i ansible/inventories/staging ansible/playbooks/setup.yml
```

#### Deployment de Aplicación
```bash
# Deploy a producción
ansible-playbook -i ansible/inventories/production \
  ansible/playbooks/deploy.yml \
  --extra-vars "docker_tag=latest"

# Deploy a staging
ansible-playbook -i ansible/inventories/staging \
  ansible/playbooks/deploy.yml \
  --extra-vars "docker_tag=develop"
```

#### Backup de Base de Datos
```bash
# Ejecutar backup manual
ansible-playbook -i ansible/inventories/production \
  ansible/playbooks/backup.yml
```

#### Verificar Conectividad
```bash
# Ping a todos los servidores
ansible all -i ansible/inventories/production -m ping

# Ver información de servidores
ansible all -i ansible/inventories/production -m setup
```

### Puppet

#### Aplicar Configuración
```bash
# En el servidor Puppet master
puppet agent --test

# Aplicar configuración específica
puppet apply puppet/manifests/site.pp

# Verificar sintaxis
puppet parser validate puppet/manifests/site.pp
```

#### Ver Recursos Gestionados
```bash
# Listar recursos
puppet resource package
puppet resource service
```

### Prometheus

#### Consultas Útiles
```promql
# Tasa de requests HTTP
rate(http_requests_total[5m])

# Tiempo de respuesta p95
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Uso de memoria
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Conexiones a base de datos
pg_stat_database_numbackends
```

### Grafana

#### Importar Dashboard
1. Ir a Grafana (`http://localhost:3001`)
2. Click en "+" → "Import"
3. Upload JSON desde `grafana/dashboards/`
4. Seleccionar datasource "Prometheus"

#### Crear Alertas
1. Ir al panel del dashboard
2. Click en "Edit"
3. Pestaña "Alert"
4. Configurar condiciones y notificaciones

---

## 🔄 Workflows y Pipelines

### Pipeline CI/CD Completo

```
1. Commit a GitHub
   ↓
2. Jenkins detecta cambio (webhook/poll)
   ↓
3. Checkout código
   ↓
4. Instalar dependencias
   ↓
5. Linting
   ↓
6. Tests unitarios
   ↓
7. Análisis SonarQube
   ↓
8. Quality Gate check
   ↓
9. Build Docker image
   ↓
10. Escaneo de seguridad (Trivy)
   ↓
11. Push a registry
   ↓
12. Deploy con Ansible
   ↓
13. Smoke tests
   ↓
14. Notificación
```

### Workflow de Deployment

#### Staging (rama develop)
```bash
git push origin develop
# → Jenkins ejecuta pipeline
# → Deploy automático a staging
# → Tests de smoke
```

#### Production (rama main)
```bash
git push origin main
# → Jenkins ejecuta pipeline
# → Quality Gate
# → Aprobación manual requerida
# → Deploy a producción
# → Health checks
```

---

## 📊 Monitoreo y Alertas

### Alertas Configuradas

#### Críticas
- **ApplicationDown**: Aplicación no responde
- **PostgresDown**: Base de datos caída
- **RedisDown**: Cache no disponible
- **DiskSpaceLow**: Espacio en disco < 10%

#### Warnings
- **HighErrorRate**: Tasa de errores > 5%
- **HighResponseTime**: P95 > 2 segundos
- **HighMemoryUsage**: Uso de memoria > 90%
- **HighCPUUsage**: Uso de CPU > 80%
- **SlowQueries**: Queries lentas en DB

### Dashboard Recomendados

#### Application Overview
- Request rate
- Response time (p50, p95, p99)
- Error rate
- Active sessions

#### Infrastructure
- CPU usage
- Memory usage
- Disk I/O
- Network traffic

#### Database
- Connections
- Query performance
- Locks y deadlocks
- Cache hit ratio

---

## 🔧 Troubleshooting

### Jenkins

#### Pipeline Falla en SonarQube
```bash
# Verificar que SonarQube está corriendo
docker-compose ps sonarqube

# Ver logs
docker-compose logs sonarqube

# Verificar token en Jenkins credentials
```

#### No Puede Conectar con Docker
```bash
# Verificar permisos del socket
ls -la /var/run/docker.sock

# Agregar usuario jenkins al grupo docker
docker exec -u root crm-jenkins usermod -aG docker jenkins
docker restart crm-jenkins
```

### Ansible

#### SSH Connection Failed
```bash
# Verificar conectividad
ssh deploy@target-server

# Verificar clave SSH
ssh-add -l

# Test conexión Ansible
ansible all -i inventory -m ping -vvv
```

#### Deployment Falla
```bash
# Ver logs detallados
ansible-playbook playbook.yml -vvv

# Ejecutar solo una tarea
ansible-playbook playbook.yml --start-at-task="task name"

# Modo check (dry-run)
ansible-playbook playbook.yml --check
```

### Prometheus

#### Targets Down
```bash
# Verificar configuración
docker exec crm-prometheus promtool check config /etc/prometheus/prometheus.yml

# Ver logs
docker-compose logs prometheus

# Verificar conectividad
curl http://target:port/metrics
```

#### Alertas No Se Envían
```bash
# Verificar Alertmanager
docker-compose logs alertmanager

# Test configuración
docker exec crm-prometheus promtool check config /etc/alertmanager/alertmanager.yml

# Verificar reglas
docker exec crm-prometheus promtool check rules /etc/prometheus/alerts/*.yml
```

### Puppet

#### Agent No Se Conecta
```bash
# Verificar servicio
systemctl status puppet

# Test conexión
puppet agent --test --server puppet.foodorderscrm.local

# Ver logs
tail -f /var/log/puppetlabs/puppet/puppet.log
```

#### Recursos No Se Aplican
```bash
# Verificar sintaxis
puppet parser validate site.pp

# Dry-run
puppet agent --test --noop

# Ver catálogo compilado
puppet catalog find $(hostname) --render-as yaml
```

---

## 📝 Comandos Útiles

### Docker Compose

```bash
# Iniciar todos los servicios
docker-compose up -d

# Solo monitoreo
docker-compose --profile monitoring up -d

# Solo CI/CD
docker-compose --profile ci up -d

# Ver logs
docker-compose logs -f [service_name]

# Restart servicio
docker-compose restart [service_name]

# Detener todo
docker-compose down

# Limpiar volúmenes
docker-compose down -v
```

### Mantenimiento

```bash
# Backup de configuraciones
tar -czf devops-config-backup.tar.gz prometheus/ grafana/ jenkins/ ansible/ puppet/

# Limpiar imágenes Docker viejas
docker image prune -a -f

# Ver uso de disco
docker system df

# Limpiar todo (cuidado!)
docker system prune -a --volumes
```

---

## 🔐 Seguridad

### Recomendaciones

1. **Cambiar Passwords por Defecto**
   - Jenkins admin password
   - Grafana admin password
   - SonarQube admin password

2. **Configurar HTTPS**
   - Usar Nginx como reverse proxy
   - Certificados SSL con Let's Encrypt

3. **Secrets Management**
   - Usar Docker secrets
   - Vault para credenciales
   - No commitear archivos .env

4. **Firewall**
   - Cerrar puertos innecesarios
   - Whitelist de IPs para servicios admin

5. **Actualizaciones**
   - Mantener imágenes Docker actualizadas
   - Parches de seguridad automáticos

---

## 📞 Soporte

Para problemas o preguntas:
- Email: devops@foodorderscrm.com
- Issues: GitHub Issues
- Documentación: `/docs` folder

---

## 📄 Licencia

Este proyecto está bajo la licencia especificada en el archivo LICENSE.
