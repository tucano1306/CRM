# 🚀 Guía de Instalación Local - Food Orders CRM

## Requisitos Previos

- Node.js 18+ instalado
- Git instalado
- Cuenta en GitHub
- Editor de código (VS Code recomendado)

---

## 📥 Paso 1: Clonar el repositorio

```bash
# Clonar el proyecto
git clone https://github.com/tucano1306/CRM.git

# Entrar a la carpeta
cd CRM

# Instalar dependencias
npm install
```

---

## 🔐 Paso 2: Configurar variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
# Database - PostgreSQL en Neon
DATABASE_URL="postgresql://usuario:password@host/database?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."

# Email - Resend
RESEND_API_KEY="re_..."

# Sentry (Opcional - para monitoreo de errores)
SENTRY_DSN="https://..."
```

### ⚠️ Importante:
Solicita estas credenciales al administrador del proyecto. No están en el repositorio por seguridad.

---

## 🗄️ Paso 3: Configurar la base de datos

```bash
# Generar el cliente de Prisma
npm run prisma:generate

# Ejecutar migraciones (crear tablas)
npm run prisma:migrate

# (Opcional) Reiniciar BD y agregar datos de prueba
npm run prisma:reset
```

---

## 🏃 Paso 4: Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3000**

---

## 🔍 Paso 5: Explorar la aplicación

### Páginas principales:
- **/** - Página de inicio
- **/sign-in** - Iniciar sesión
- **/sign-up** - Registro
- **/dashboard** - Panel principal (requiere autenticación)
- **/products** - Gestión de productos
- **/orders** - Gestión de órdenes
- **/clients** - Gestión de clientes

### Herramientas útiles:

```bash
# Ver la base de datos en el navegador
npm run prisma:studio
# Abre en: http://localhost:5555

# Ejecutar tests
npm test

# Ejecutar linter
npm run lint
```

---

## 👤 Crear Usuario de Prueba

1. Navega a **http://localhost:3000/sign-up**
2. Regístrate con cualquier email
3. Verifica tu email (si usas Clerk en modo desarrollo)
4. El primer usuario puede ser asignado como ADMIN desde Prisma Studio

### Asignar rol manualmente:

```bash
# Abrir Prisma Studio
npm run prisma:studio

# 1. Ve a la tabla "authenticated_users"
# 2. Encuentra tu usuario
# 3. Edita el campo "role" y selecciona: ADMIN, SELLER o CLIENT
```

---

## 🐛 Solución de Problemas Comunes

### Error: "DATABASE_URL is not defined"
- Verifica que `.env.local` existe y tiene `DATABASE_URL` configurada

### Error: "Prisma Client not generated"
```bash
npm run prisma:generate
```

### Error al conectar a la base de datos
- Verifica que la URL de conexión es correcta
- Asegúrate de tener conexión a internet (si usas Neon)

### El puerto 3000 ya está en uso
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

---

## 📚 Recursos Adicionales

- **Documentación del Stack**: Ver `PROJECT_STACK_TEMPLATE.md`
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **Clerk**: https://clerk.com/docs

---

## 🤝 Contribuir

### Workflow de Git:

```bash
# Crear una rama para tu feature
git checkout -b feature/nombre-feature

# Hacer cambios y commit
git add .
git commit -m "feat: descripción del cambio"

# Subir los cambios
git push origin feature/nombre-feature

# Crear Pull Request en GitHub
```

---

## 📞 Contacto

Si tienes problemas durante la instalación, contacta al administrador del proyecto.

---

**Última actualización**: 20 de noviembre de 2025
