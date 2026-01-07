# 🚀 DevOps Dashboard en Vercel

## ✅ Acceso al Dashboard

Tu dashboard DevOps ahora está disponible en Vercel en la ruta:

**https://tu-dominio.vercel.app/devops**

O localmente:

**http://localhost:3000/devops**

---

## 📱 Acceso desde la Página Principal

En la página principal de tu aplicación (http://localhost:3000), encontrarás un botón al final de la tarjeta principal:

**🚀 DevOps Dashboard**

Haz clic ahí para acceder al dashboard completo.

---

## 🌟 Características del Dashboard

### ✅ Sin Errores de Accesibilidad
- Todos los elementos interactivos son botones o enlaces nativos
- Contraste de colores mejorado
- Navegación con teclado completa
- Compatible con lectores de pantalla

### 📊 Servicios Organizados por Categoría

#### Servicios Principales
- Aplicación (puerto 3000)
- Adminer - Database UI (puerto 8080)

#### Monitoreo
- Grafana (puerto 3001)
- Prometheus (puerto 9090)
- Alertmanager (puerto 9093)
- cAdvisor (puerto 8081)

#### CI/CD
- Jenkins (puerto 8082)
- SonarQube (puerto 9000)

### ⚡ Funcionalidades

1. **Acceso Directo**: Botón para abrir cada servicio
2. **Copiar URLs**: Copia URLs con un clic
3. **Comandos Rápidos**: Copia comandos al clipboard
4. **Acciones Rápidas**: Botones para comandos comunes
5. **Información Contextual**: Credenciales y requisitos

---

## 🚀 Deploy en Vercel

### Paso 1: Conectar con Vercel

```bash
# Si no tienes Vercel CLI
npm i -g vercel

# Login
vercel login

# Link proyecto
vercel link
```

### Paso 2: Deploy

```bash
# Deploy preview
vercel

# Deploy a producción
vercel --prod
```

### Paso 3: Acceder

Una vez desplegado, accede a:
```
https://tu-proyecto.vercel.app/devops
```

---

## 📋 URLs de Producción vs Local

### En Vercel (Producción)
```
https://tu-proyecto.vercel.app/devops
```
- Dashboard funcional
- Comandos copiables
- Enlaces a servicios locales (para desarrollo)

### Local (Desarrollo)
```
http://localhost:3000/devops
```
- Dashboard funcional
- Servicios accesibles directamente
- Comandos ejecutables

---

## 🎯 Cómo Usar

### En Producción (Vercel)
1. Accede a tu URL de Vercel + `/devops`
2. Ve todos los servicios organizados
3. Copia comandos para ejecutar localmente
4. Usa como referencia rápida

### En Desarrollo (Local)
1. Ejecuta `npm run dev`
2. Ve a http://localhost:3000/devops
3. Haz clic en los servicios para abrirlos
4. Copia y ejecuta comandos

---

## 🔗 Integración con la App

El dashboard está integrado en tu aplicación Next.js:

- **Ruta**: `/devops`
- **Layout**: Usa el layout global
- **Acceso**: Botón en la página principal
- **SEO**: Metadata configurada

---

## 📱 Responsive

El dashboard funciona perfectamente en:
- ✅ Desktop
- ✅ Tablet
- ✅ Mobile

---

## 🎨 Personalización

Para personalizar el dashboard, edita:

```
app/devops/page.tsx
```

Puedes:
- Agregar más servicios
- Cambiar colores
- Modificar comandos
- Agregar nuevas secciones

---

## 🔐 Seguridad

**Importante**: El dashboard muestra URLs locales. En producción:

1. No expone credenciales reales
2. Los servicios están en localhost
3. Solo accesible si tienes acceso a la máquina

---

## 📚 Enlaces Útiles

Desde el dashboard puedes acceder a:
- Documentación del proyecto
- Repositorio GitHub
- Volver a la aplicación principal

---

## ✨ Próximos Pasos

1. **Deploy a Vercel**:
   ```bash
   vercel --prod
   ```

2. **Compartir URL**:
   ```
   https://tu-proyecto.vercel.app/devops
   ```

3. **Usar como Referencia**: El equipo puede ver servicios y comandos disponibles

---

**¡Disfruta de tu dashboard DevOps profesional en Vercel!** 🎉
