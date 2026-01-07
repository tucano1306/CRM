# README - Herramientas DevOps

## 🎯 Resumen de Implementación

Se han implementado las siguientes herramientas DevOps en el proyecto Food Orders CRM:

### ✅ Herramientas Implementadas

1. **Jenkins** - CI/CD Automation
   - Pipeline completo de build, test y deploy
   - Integración con SonarQube
   - Configuration as Code (JCasC)
   - Deployment automatizado con Ansible

2. **Ansible** - Configuration Management & Deployment
   - Playbooks para setup, deploy y backup
   - Inventarios para staging y producción
   - Roles modulares para diferentes componentes

3. **Puppet** - Infrastructure as Code
   - Manifests para configuración de servidores
   - Módulos para base, security, docker, monitoring
   - Gestión centralizada de configuración

4. **Prometheus** - Metrics Collection
   - Monitoreo de aplicación, database, cache
   - Alertas configuradas (críticas y warnings)
   - Exportadores para diferentes servicios

5. **Grafana** - Visualization
   - Dashboards predefinidos
   - Datasource de Prometheus configurado
   - Visualización en tiempo real

6. **SonarQube** - Code Quality (ya existente)
   - Integración con pipeline de Jenkins
   - Análisis automático de código

## 📁 Estructura de Archivos Creados

```
food-order-crm/
├── prometheus/
│   ├── prometheus.yml          # Configuración principal
│   ├── alertmanager.yml        # Gestión de alertas
│   └── alerts/
│       ├── app-alerts.yml      # Alertas de aplicación
│       └── database-alerts.yml # Alertas de BD
│
├── grafana/
│   ├── dashboards/
│   │   └── app-dashboard.json  # Dashboard principal
│   └── provisioning/
│       └── datasources/
│           └── prometheus.yml  # Datasource config
│
├── jenkins/
│   └── casc.yaml              # Configuration as Code
│
├── ansible/
│   ├── ansible.cfg            # Configuración de Ansible
│   ├── inventories/
│   │   ├── production         # Servidores producción
│   │   └── staging           # Servidores staging
│   └── playbooks/
│       ├── setup.yml         # Setup inicial
│       ├── deploy.yml        # Deployment
│       └── backup.yml        # Backups
│
├── puppet/
│   ├── puppet.conf           # Configuración Puppet
│   ├── hiera.yaml           # Datos jerárquicos
│   ├── manifests/
│   │   └── site.pp          # Manifest principal
│   ├── modules/
│   │   ├── base/            # Módulo base
│   │   ├── security/        # Hardening
│   │   ├── docker/          # Docker setup
│   │   ├── monitoring/      # Node Exporter
│   │   └── foodorderscrm/   # Aplicación
│   └── data/
│       └── common.yaml      # Variables comunes
│
├── docs/
│   ├── DEVOPS_TOOLS_GUIDE.md    # Guía completa
│   └── DEVOPS_QUICK_START.md    # Quick start
│
├── Jenkinsfile                   # Pipeline CI/CD
├── Makefile.devops              # Comandos útiles
├── .env.example                 # Template variables
└── docker-compose.yml           # Actualizado con todos los servicios
```

## 🚀 Inicio Rápido

### 1. Configurar Variables de Entorno
```bash
cp .env.example .env
# Editar .env con tus credenciales
```

### 2. Iniciar Servicios
```bash
# Servicios base (app + DB + Redis)
docker-compose up -d

# Agregar monitoreo
docker-compose --profile monitoring up -d

# Agregar CI/CD
docker-compose --profile ci up -d

# O todos a la vez
docker-compose --profile monitoring --profile ci up -d
```

### 3. Acceder a los Servicios

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| Aplicación | http://localhost:3000 | - |
| Jenkins | http://localhost:8082 | admin / (ver .env) |
| Grafana | http://localhost:3001 | admin / admin |
| Prometheus | http://localhost:9090 | - |
| SonarQube | http://localhost:9000 | admin / admin |

## 📖 Documentación

- **[Guía Completa](docs/DEVOPS_TOOLS_GUIDE.md)** - Documentación detallada de todas las herramientas
- **[Quick Start](docs/DEVOPS_QUICK_START.md)** - Inicio rápido en 5 pasos

## 🔧 Comandos Principales

### Con Make (recomendado)
```bash
# Ver todos los comandos
make -f Makefile.devops help

# Iniciar servicios
make -f Makefile.devops start-all

# Deploy
make -f Makefile.devops deploy-staging
make -f Makefile.devops deploy-production

# Monitoreo
make -f Makefile.devops monitor
make -f Makefile.devops health

# Backup
make -f Makefile.devops backup-db
```

### Docker Compose
```bash
# Ver todos los servicios
docker-compose ps

# Logs
docker-compose logs -f [servicio]

# Restart
docker-compose restart [servicio]
```

### Ansible
```bash
# Setup inicial de servidores
ansible-playbook -i ansible/inventories/production ansible/playbooks/setup.yml

# Deploy
ansible-playbook -i ansible/inventories/production ansible/playbooks/deploy.yml

# Backup
ansible-playbook -i ansible/inventories/production ansible/playbooks/backup.yml
```

### Puppet
```bash
# Aplicar configuración
puppet apply puppet/manifests/site.pp

# Validar sintaxis
puppet parser validate puppet/manifests/site.pp
```

## 📊 Pipeline CI/CD

El pipeline de Jenkins ejecuta automáticamente:

1. ✅ Checkout del código
2. ✅ Instalación de dependencias
3. ✅ Linting
4. ✅ Tests unitarios
5. ✅ Análisis SonarQube
6. ✅ Quality Gate check
7. ✅ Build de Docker image
8. ✅ Escaneo de seguridad
9. ✅ Push a registry
10. ✅ Deploy automático (staging) o manual (production)
11. ✅ Smoke tests
12. ✅ Notificaciones

## 🎯 Próximos Pasos

1. **Configurar credenciales en Jenkins**
   - Docker registry
   - GitHub
   - SonarQube token

2. **Actualizar inventarios de Ansible**
   - IPs de servidores reales
   - Configuración de SSH

3. **Configurar notificaciones**
   - SMTP para Alertmanager
   - Slack/Teams webhooks

4. **Personalizar dashboards de Grafana**
   - Métricas específicas del negocio
   - Alertas personalizadas

5. **Setup de Puppet Master** (opcional)
   - Solo si usarás Puppet en producción
   - Configurar certificados

## ⚠️ Notas Importantes

- Cambiar **TODOS** los passwords por defecto antes de producción
- Configurar HTTPS para servicios expuestos
- Revisar reglas de firewall
- Configurar backups automáticos
- Mantener actualizadas las imágenes Docker

## 🐛 Troubleshooting

Ver sección de Troubleshooting en [DEVOPS_TOOLS_GUIDE.md](docs/DEVOPS_TOOLS_GUIDE.md)

## 📞 Soporte

- Issues: GitHub Issues del proyecto
- Documentación: `/docs` folder
- Email: devops@foodorderscrm.com

---

**¡Disfruta de tu infraestructura DevOps completa!** 🚀
