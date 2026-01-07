# 🚀 Quick Start - Vercel Edition

## Setup Rápido en 3 Pasos

### 1️⃣ Instalación Automática
```bash
node scripts/quick-setup.js
```
Este script te guiará por todo el proceso interactivamente.

### 2️⃣ Desarrollo Local
```bash
npm run dev
```
Abre http://localhost:3000

### 3️⃣ Deploy a Vercel
```bash
# Login a Vercel
vercel login

# Link proyecto
vercel link

# Deploy
vercel deploy
```

---

## 📦 Setup Manual (Alternativa)

### Paso 1: Instalar Dependencias
```bash
npm install
```

### Paso 2: Variables de Entorno
```bash
# Crea .env desde el template
cp .env.example .env

# Edita .env con tus valores
# Necesitas: CLERK_PUBLISHABLE_KEY y CLERK_SECRET_KEY
```

### Paso 3: Base de Datos Local
```bash
# Inicia PostgreSQL y Redis
docker-compose -f docker-compose.dev-simple.yml up -d

# Ejecuta migraciones
npx prisma migrate dev
npx prisma generate
```

### Paso 4: Desarrollo
```bash
npm run dev
```

---

## 🎯 Comandos Esenciales

```bash
# Desarrollo
npm run dev              # Iniciar dev server
npm run build            # Build producción
npm run start            # Iniciar producción

# Database
npm run prisma:studio    # UI para ver DB
npm run prisma:migrate   # Crear migración
npm run db:setup         # Setup completo de DB

# Testing
npm run test             # Tests unitarios
npm run test:coverage    # Tests con coverage
npm run lint             # Linter

# Vercel
vercel                   # Deploy preview
vercel --prod            # Deploy producción
vercel env pull          # Bajar env vars
```

---

## 🔧 Servicios Locales

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| App | http://localhost:3000 | - |
| Adminer (DB UI) | http://localhost:8080 | user: crmuser, pass: crmpassword |
| Prisma Studio | `npm run prisma:studio` | - |
| Grafana* | http://localhost:3001 | admin / admin |

\* Opcional: `docker-compose -f docker-compose.dev-simple.yml --profile monitoring up -d`

---

## 🚀 Deploy Automático

### GitHub Actions está configurado para:

**Pull Request** → Deploy Preview  
**Push a `develop`** → Deploy Staging  
**Push a `main`** → Deploy Producción

### Configurar Secrets en GitHub:

Ve a tu repo → Settings → Secrets and variables → Actions

Agrega estos secrets:
- `VERCEL_TOKEN` - Tu Vercel token
- `VERCEL_ORG_ID` - ID de tu organización Vercel
- `VERCEL_PROJECT_ID` - ID del proyecto Vercel
- `SONAR_TOKEN` - Token de SonarQube (opcional)
- `SONAR_HOST_URL` - URL de SonarQube (opcional)

### Obtener Vercel IDs:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project (guarda los IDs)
vercel link

# Ver project.json para los IDs
cat .vercel/project.json
```

---

## 📊 Monitoreo (Opcional)

Si quieres monitorear localmente:

```bash
# Inicia Prometheus + Grafana
docker-compose -f docker-compose.dev-simple.yml --profile monitoring up -d

# Accede a Grafana
open http://localhost:3001
# usuario: admin, password: admin
```

---

## 🔐 Variables de Entorno Importantes

### Para Desarrollo Local (.env):
```env
# Database
DATABASE_URL=postgresql://crmuser:crmpassword@localhost:5432/food_orders_crm

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Redis (opcional)
REDIS_URL=redis://localhost:6379
```

### Para Vercel (configurar en Vercel Dashboard):
- `DATABASE_URL` - Tu database URL (Supabase/Neon/etc)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `REDIS_URL` (si usas Redis en producción)

---

## 🆘 Troubleshooting

### Error de conexión a DB
```bash
# Verifica que Docker está corriendo
docker ps

# Reinicia servicios
docker-compose -f docker-compose.dev-simple.yml restart db
```

### Prisma errors
```bash
# Regenera client
npx prisma generate

# Reset DB (cuidado: borra datos!)
npx prisma migrate reset
```

### Vercel deploy falla
```bash
# Verifica que estás logueado
vercel whoami

# Re-link proyecto
vercel link --yes

# Deploy con logs
vercel deploy --debug
```

### Puerto 3000 en uso
```bash
# Cambia el puerto
PORT=3001 npm run dev
```

---

## 📚 Más Documentación

- [README Principal](../README.md)
- [Guía DevOps Completa](./DEVOPS_TOOLS_GUIDE.md)
- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Prisma](https://www.prisma.io/docs)

---

## 🎉 ¡Listo!

Tu aplicación está configurada para:
- ✅ Desarrollo local con hot-reload
- ✅ Base de datos PostgreSQL local
- ✅ Deploy automático a Vercel
- ✅ CI/CD con GitHub Actions
- ✅ Tests y linting automáticos

**¿Necesitas ayuda?** Abre un issue en GitHub o revisa la documentación completa.
