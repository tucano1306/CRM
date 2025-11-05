# 🚀 Guía de Deployment en Vercel - Food Orders CRM

## ✅ Estado Actual del Deployment

- **Proyecto creado**: `food-order-crm`
- **URL de producción**: https://food-order-1182qrpe3-tucano0109-5495s-projects.vercel.app
- **Dashboard**: https://vercel.com/tucano0109-5495s-projects/food-order-crm

---

## 📋 Pasos Completados

1. ✅ Instalación de Vercel CLI
2. ✅ Login en Vercel
3. ✅ Proyecto vinculado
4. ✅ Ajuste de cron jobs para cuenta Hobby (solo 1 job diario)
5. ✅ Configuración de `prisma generate` en build
6. ✅ Deployment inicial ejecutado

---

## ⚠️ SIGUIENTE PASO CRÍTICO: Configurar Variables de Entorno

El deployment **FALLARÁ** hasta que configures las siguientes variables de entorno en Vercel:

### 📍 Cómo agregar variables de entorno:

1. Ve a: https://vercel.com/tucano0109-5495s-projects/food-order-crm/settings/environment-variables
2. Agrega cada una de las siguientes variables:

### 🔐 Variables Requeridas:

```bash
# ============================================
# 🔐 Clerk Authentication
# ============================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=tu-clerk-publishable-key
CLERK_SECRET_KEY=tu-clerk-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ============================================
# 📊 Database (PostgreSQL)
# ============================================
# OPCIÓN 1: Vercel Postgres (Recomendado - Gratis en Hobby tier)
# Ve a: https://vercel.com/docs/storage/vercel-postgres/quickstart
# Crea una base de datos y copia el DATABASE_URL que te dan

# OPCIÓN 2: Neon (Gratis - https://neon.tech)
# OPCIÓN 3: Supabase (Gratis - https://supabase.com)
# OPCIÓN 4: Railway (Gratis - https://railway.app)

DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# ============================================
# 🔒 Cron Job Security
# ============================================
# Genera un secret aleatorio con este comando en PowerShell:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

CRON_SECRET=tu-super-secret-random-string-aqui

# ============================================
# 🌐 Next.js
# ============================================
NEXT_PUBLIC_API_URL=https://food-order-1182qrpe3-tucano0109-5495s-projects.vercel.app

# ============================================
# 🚫 Sentry (Opcional - Supresión de warnings)
# ============================================
SENTRY_SUPPRESS_INSTRUMENTATION_FILE_WARNING=1
SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING=1

# ============================================
# 🔧 Sentry DSN (Opcional - Para tracking de errores)
# ============================================
# Si quieres configurar Sentry para producción:
# 1. Ve a https://sentry.io
# 2. Crea un proyecto Next.js
# 3. Copia el DSN que te dan

# SENTRY_DSN=https://tu-sentry-dsn@sentry.io/proyecto-id
```

---

## 🗄️ Configuración de Base de Datos (IMPORTANTE)

### Opción Recomendada: Vercel Postgres

1. **En el dashboard de tu proyecto en Vercel:**
   - Ve a la pestaña "Storage"
   - Click en "Create Database"
   - Selecciona "Postgres"
   - Click en "Continue"
   - Dale un nombre (ej: `food-crm-db`)
   - Click en "Create"

2. **Copiar la conexión:**
   - Una vez creada, ve a la pestaña ".env.local"
   - Copia el valor de `POSTGRES_PRISMA_URL`
   - Agrega esta variable como `DATABASE_URL` en Environment Variables

3. **Ejecutar migraciones:**
   ```powershell
   # Desde tu terminal local, con la DATABASE_URL de producción:
   npx prisma migrate deploy
   
   # Opcional: Si quieres seed data inicial
   npx prisma db seed
   ```

---

## 🔄 Después de Configurar Variables

Una vez agregadas todas las variables de entorno:

1. **Redeploy automático**: Vercel automáticamente hará un nuevo deployment
2. **O manualmente**: Ejecuta `vercel --prod` nuevamente desde tu terminal

---

## 🎯 Verificación Post-Deployment

Una vez que el deployment sea exitoso:

1. ✅ Visita tu URL de producción
2. ✅ Prueba el login con Clerk
3. ✅ Verifica que puedas crear productos/clientes
4. ✅ Revisa los logs en: https://vercel.com/tucano0109-5495s-projects/food-order-crm/logs

---

## 📊 Monitoreo y Analytics

Tu aplicación ya tiene configurado:

- ✅ **Vercel Analytics**: Tracking automático de visitas
- ✅ **Speed Insights**: Métricas de rendimiento (Core Web Vitals)
- ✅ **Sentry**: Error tracking (una vez configurado el DSN)

---

## 🔧 Comandos Útiles de Vercel CLI

```powershell
# Ver logs en tiempo real
vercel logs

# Ver lista de deployments
vercel ls

# Ver información del proyecto
vercel inspect

# Abrir el dashboard en el navegador
vercel open

# Agregar variable de entorno desde CLI
vercel env add NOMBRE_VARIABLE

# Ver variables de entorno
vercel env ls
```

---

## 🚨 Troubleshooting

### Error: "Prisma Client could not connect to database"
- ✅ Verifica que `DATABASE_URL` esté configurada correctamente
- ✅ Asegúrate de que incluya `?sslmode=require` al final
- ✅ Ejecuta `npx prisma migrate deploy` con la URL de producción

### Error: "Clerk authentication failed"
- ✅ Verifica que las keys de Clerk sean correctas
- ✅ En Clerk dashboard, agrega tu dominio de Vercel a las URLs permitidas

### Error: "Cron job failed"
- ✅ Verifica que `CRON_SECRET` esté configurada
- ✅ Los cron jobs solo funcionan en producción, no en preview

---

## 📞 Recursos y Soporte

- **Vercel Docs**: https://vercel.com/docs
- **Prisma on Vercel**: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-vercel
- **Clerk on Vercel**: https://clerk.com/docs/deployments/deploy-to-vercel
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres

---

## 🎉 ¡Próximos Pasos!

Una vez que la aplicación esté funcionando en producción:

1. [ ] Configurar dominio personalizado (opcional)
2. [ ] Configurar Sentry DSN para error tracking
3. [ ] Revisar logs y métricas de rendimiento
4. [ ] Configurar backups de base de datos
5. [ ] Documentar procesos de deployment para el equipo

---

**Última actualización**: 5 de noviembre de 2025
