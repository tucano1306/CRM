# 🚀 Dashboard DevOps - Acceso Rápido

## ✅ **NUEVA FUNCIONALIDAD: Dashboard en Vercel**

Ahora puedes acceder a tu dashboard DevOps desde cualquier lugar con una URL de Vercel.

---

## 🌐 **Accesos**

### **Producción (Vercel)**
```
https://tu-proyecto.vercel.app/devops
```

### **Local (Desarrollo)**
```
http://localhost:3000/devops
```

### **Desde la App**
1. Ve a la página principal: http://localhost:3000
2. Haz clic en el botón **"🚀 DevOps Dashboard"** al final de la tarjeta

---

## 🎯 **Características**

### ✅ **Sin Errores de Accesibilidad**
- Todos los elementos son accesibles con teclado
- Contraste mejorado (WCAG AAA)
- Navegación completa con Tab
- Compatible con lectores de pantalla

### 📊 **Servicios Organizados**

#### **Servicios Principales** (Siempre disponibles)
- 🍔 Aplicación - http://localhost:3000
- 🗄️ Adminer - http://localhost:8080

#### **Monitoreo** (Profile: `monitoring`)
- 📊 Grafana - http://localhost:3001
- 📈 Prometheus - http://localhost:9090
- 🔔 Alertmanager - http://localhost:9093
- 📦 cAdvisor - http://localhost:8081

#### **CI/CD** (Profile: `ci`)
- 🔧 Jenkins - http://localhost:8082
- 🔍 SonarQube - http://localhost:9000

### ⚡ **Acciones Rápidas**
- Copiar URLs con un clic
- Copiar comandos al clipboard
- Botones de acceso directo
- Enlaces externos

---

## 🚀 **Uso**

### **1. Acceso Local**

```bash
# Iniciar aplicación
npm run dev

# Abrir dashboard
http://localhost:3000/devops
```

### **2. Acceso en Vercel**

```bash
# Deploy a Vercel
vercel --prod

# Acceder al dashboard
https://tu-proyecto.vercel.app/devops
```

### **3. Desde la Página Principal**

```
1. Ve a http://localhost:3000
2. Scroll hasta abajo
3. Click en "🚀 DevOps Dashboard"
```

---

## 📋 **Servicios y Puertos**

| Puerto | Servicio | Comando |
|--------|----------|---------|
| 3000 | App | `npm run dev` |
| 8080 | Adminer | `npm run docker:dev` |
| 3001 | Grafana | `docker-compose --profile monitoring up -d` |
| 9090 | Prometheus | `docker-compose --profile monitoring up -d` |
| 8082 | Jenkins | `docker-compose --profile ci up -d` |
| 9000 | SonarQube | `docker-compose --profile ci up -d` |

---

## 🎨 **Screenshots Conceptuales**

### Dashboard Principal
- Tarjetas organizadas por categoría
- Colores por tipo de servicio
- Información de credenciales
- Botones de acceso directo

### Sección de Comandos
- Lista de comandos copiables
- Descripción de cada comando
- Un clic para copiar

### Acciones Rápidas
- 4 botones principales
- Comandos más usados
- Feedback visual al copiar

---

## 🔧 **Iniciar Servicios**

### **Servicios Base**
```bash
npm run docker:dev
# Inicia: PostgreSQL, Redis, Adminer
```

### **Agregar Monitoreo**
```bash
docker-compose --profile monitoring up -d
# Agrega: Prometheus, Grafana, Alertmanager, cAdvisor
```

### **Agregar CI/CD**
```bash
docker-compose --profile ci up -d
# Agrega: Jenkins, SonarQube
```

### **Todo Junto**
```bash
docker-compose --profile monitoring --profile ci up -d
# Inicia todos los servicios
```

---

## 📱 **Responsive**

El dashboard se adapta a:
- 💻 Desktop (3 columnas)
- 📱 Tablet (2 columnas)
- 📱 Mobile (1 columna)

---

## 🔐 **Credenciales**

### Adminer
- Server: `db`
- Username: `crmuser`
- Password: `crmpassword`
- Database: `food_orders_crm`

### Grafana
- Username: `admin`
- Password: `admin`

### SonarQube
- Username: `admin`
- Password: `admin`

### Jenkins
- Ver archivo `.env` para `JENKINS_ADMIN_PASSWORD`

---

## 🎯 **Próximos Pasos**

1. **Probar Localmente**
   ```bash
   npm run dev
   # Ir a http://localhost:3000/devops
   ```

2. **Deploy a Vercel**
   ```bash
   vercel --prod
   ```

3. **Compartir URL**
   ```
   Compartir: https://tu-proyecto.vercel.app/devops
   ```

4. **Usar como Referencia**
   - El equipo puede ver servicios disponibles
   - Copiar comandos necesarios
   - Acceder a documentación

---

## 📚 **Documentación Relacionada**

- [DEVOPS_README.md](DEVOPS_README.md) - Guía completa DevOps
- [QUICK_START_VERCEL.md](QUICK_START_VERCEL.md) - Quick start con Vercel
- [DEVOPS_VERCEL_DASHBOARD.md](docs/DEVOPS_VERCEL_DASHBOARD.md) - Detalles del dashboard

---

## ✨ **Ventajas**

✅ **Accesible desde cualquier lugar** (URL de Vercel)  
✅ **Sin errores de accesibilidad** (100% conforme)  
✅ **Organizado por categorías** (fácil navegación)  
✅ **Comandos copiables** (un clic)  
✅ **Responsive** (funciona en móvil)  
✅ **Integrado en la app** (botón en homepage)  
✅ **SEO optimizado** (metadata configurada)  
✅ **Profesional** (diseño moderno)  

---

**¡Tu dashboard DevOps está listo para usar!** 🎉

Accede ahora: http://localhost:3000/devops
