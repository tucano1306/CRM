# 🚨 Solución a Errores en Producción

## 📋 Errores Detectados

```
❌ The table `public.sellers` does not exist in the current database
❌ Error obteniendo analytics del dashboard
❌ 500 (Internal Server Error) en /api/notifications
❌ 500 (Internal Server Error) en /api/chat-messages/unread-count
```

## 🎯 Causa Raíz

**La base de datos PostgreSQL no está configurada en Vercel**

La aplicación está desplegada pero no tiene acceso a una base de datos, por lo que todas las consultas de Prisma fallan.

---

## ✅ SOLUCIÓN - Paso a Paso

### Opción 1: Vercel Postgres (Recomendado - GRATIS)

#### 1️⃣ Crear Base de Datos en Vercel

1. Ve al dashboard de tu proyecto:
   ```
   https://vercel.com/tucano0109-5495s-projects/food-order-crm
   ```

2. Ve a la pestaña **"Storage"** (en el menú superior)

3. Haz clic en **"Create Database"**

4. Selecciona **"Postgres"**

5. Elige el plan **"Hobby - Free"**
   - 256 MB storage
   - 60 horas de compute time/mes
   - 1 database

6. Haz clic en **"Create"**

7. Espera unos segundos mientras Vercel crea tu base de datos

#### 2️⃣ Conectar la Base de Datos al Proyecto

1. Una vez creada, Vercel te preguntará: **"Connect to Project?"**

2. Selecciona tu proyecto: **`food-order-crm`**

3. Haz clic en **"Connect"**

4. Vercel automáticamente agregará estas variables de entorno:
   ```
   POSTGRES_URL
   POSTGRES_PRISMA_URL  ← Esta es la que usarás
   POSTGRES_URL_NON_POOLING
   POSTGRES_USER
   POSTGRES_HOST
   POSTGRES_PASSWORD
   POSTGRES_DATABASE
   ```

#### 3️⃣ Agregar Variable DATABASE_URL

1. Ve a: **Settings → Environment Variables**
   ```
   https://vercel.com/tucano0109-5495s-projects/food-order-crm/settings/environment-variables
   ```

2. Agrega nueva variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Copia el valor de `POSTGRES_PRISMA_URL` (debe verse como)
     ```
     postgres://default:xxxxx@ep-xxxxx.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require&pgbouncer=true&connect_timeout=15
     ```
   - **Environments**: Marca ✅ Production, ✅ Preview, ✅ Development

3. Haz clic en **"Save"**

#### 4️⃣ Ejecutar Migraciones de Prisma

Abre terminal en tu proyecto local y ejecuta:

```powershell
# Opción A: Usar Vercel CLI para ejecutar comando remoto
vercel env pull .env.production
npx prisma migrate deploy --schema=./prisma/schema.prisma

# O si prefieres hacerlo manualmente:
# 1. Copia el DATABASE_URL de Vercel
# 2. Ejecútalo en tu terminal local
$env:DATABASE_URL="postgres://default:xxxxx@ep-xxxxx.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require"
npx prisma migrate deploy
```

**Nota**: `migrate deploy` aplicará todas las migraciones pendientes en producción sin crear nuevas.

#### 5️⃣ (Opcional) Poblar Base de Datos con Datos de Prueba

```powershell
# Usando el DATABASE_URL de producción
$env:DATABASE_URL="postgres://default:xxxxx@ep-xxxxx..."
npx prisma db seed
```

⚠️ **ADVERTENCIA**: Esto creará usuarios de prueba. Solo hazlo si quieres datos demo.

#### 6️⃣ Redeployar

```powershell
vercel --prod
```

---

### Opción 2: Base de Datos Externa (Neon, Supabase, Railway)

Si prefieres usar otro proveedor de PostgreSQL:

#### Proveedores Gratuitos Recomendados:

1. **Neon** (https://neon.tech)
   - ✅ 512 MB storage gratis
   - ✅ Serverless PostgreSQL
   - ✅ Sin dormir (always-on)

2. **Supabase** (https://supabase.com)
   - ✅ 500 MB storage
   - ✅ PostgreSQL + extras (auth, storage)

3. **Railway** (https://railway.app)
   - ✅ $5 crédito mensual gratis
   - ✅ PostgreSQL + otros servicios

#### Pasos Generales:

1. Crea cuenta en el proveedor elegido
2. Crea una base de datos PostgreSQL
3. Copia el **Connection String** (debe verse como):
   ```
   postgresql://user:password@host:5432/database?sslmode=require
   ```
4. En Vercel, agrega variable de entorno:
   - Name: `DATABASE_URL`
   - Value: (pega el connection string)
   - Environments: Production, Preview, Development

5. Ejecuta migraciones:
   ```powershell
   $env:DATABASE_URL="postgresql://user:password@..."
   npx prisma migrate deploy
   ```

6. Redeploy:
   ```powershell
   vercel --prod
   ```

---

## 🔐 Variables de Entorno Adicionales Requeridas

Además de `DATABASE_URL`, asegúrate de tener estas variables en Vercel:

### Clerk (Autenticación)

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

**¿Dónde obtenerlas?**
1. Ve a: https://dashboard.clerk.com
2. Selecciona tu aplicación
3. Ve a **API Keys**
4. Copia las keys

### CRON Secret

```bash
CRON_SECRET=cf5f0be677797e06783ca4c68f93b98003b89cbdc9b45e9c27740a0e40709675
```

Ya generado - cópialo tal cual.

### URL de la API

```bash
NEXT_PUBLIC_API_URL=https://food-order-ij0lim8d0-tucano0109-5495s-projects.vercel.app
```

### Sentry (Opcional - para monitoreo de errores)

```bash
SENTRY_SUPPRESS_TURBOPACK_WARNING=1
NEXT_PUBLIC_SENTRY_DSN=  # Dejar vacío por ahora
```

---

## 📝 Checklist de Configuración

- [ ] **1. Crear base de datos en Vercel Storage**
- [ ] **2. Conectar base de datos al proyecto**
- [ ] **3. Verificar que `POSTGRES_PRISMA_URL` existe en env vars**
- [ ] **4. Agregar variable `DATABASE_URL` apuntando a `POSTGRES_PRISMA_URL`**
- [ ] **5. Ejecutar `npx prisma migrate deploy` localmente con DATABASE_URL de producción**
- [ ] **6. Agregar variables de Clerk (PUBLISHABLE_KEY, SECRET_KEY, WEBHOOK_SECRET)**
- [ ] **7. Agregar `CRON_SECRET`**
- [ ] **8. Agregar `NEXT_PUBLIC_API_URL`**
- [ ] **9. Redeploy con `vercel --prod`**
- [ ] **10. Verificar que las tablas existen en Vercel Postgres (usar Vercel UI o psql)**

---

## 🧪 Verificar que Funciona

Después de completar los pasos:

1. Abre tu aplicación en producción:
   ```
   https://food-order-ij0lim8d0-tucano0109-5495s-projects.vercel.app
   ```

2. Deberías poder:
   - ✅ Ver la página de selección sin errores 500
   - ✅ Login funcional con Clerk
   - ✅ Dashboard sin errores de base de datos
   - ✅ API endpoints respondiendo correctamente

3. Verifica en la consola del navegador (F12):
   - ✅ Sin errores "table does not exist"
   - ✅ Sin errores 500 en /api/notifications
   - ✅ Sin errores en /api/chat-messages/unread-count

---

## 🆘 Solución Rápida de Problemas

### Error: "table does not exist"
→ Las migraciones no se ejecutaron. Vuelve al paso 4️⃣

### Error: "connect ETIMEDOUT"
→ El DATABASE_URL es incorrecto o la base de datos no está accesible

### Error: "password authentication failed"
→ Credenciales incorrectas en DATABASE_URL

### Error: "too many connections"
→ Usa `POSTGRES_PRISMA_URL` en lugar de `POSTGRES_URL` (incluye pgbouncer)

### Errores 401 en Clerk
→ Verifica que las keys de Clerk estén correctas

---

## 📚 Referencias

- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **Prisma Migrations**: https://www.prisma.io/docs/concepts/components/prisma-migrate
- **Clerk Setup**: https://clerk.com/docs/quickstarts/nextjs
- **Archivo con env vars**: `COPIAR_A_VERCEL.txt` (en raíz del proyecto)

---

## 🎯 Siguiente Paso INMEDIATO

**IR AHORA A:**
```
https://vercel.com/tucano0109-5495s-projects/food-order-crm
```

1. Click en **"Storage"** (menú superior)
2. Click en **"Create Database"**
3. Selecciona **"Postgres"**
4. Plan **"Hobby - Free"**
5. **"Create"**
6. **"Connect to Project"** → Selecciona `food-order-crm`

Después de esto, la aplicación funcionará correctamente. 🚀
