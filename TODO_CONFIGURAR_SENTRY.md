# ⏰ RECORDATORIO: Configurar Sentry

## 📌 Estado Actual
- ✅ Código de Sentry **YA ESTÁ IMPLEMENTADO**
- ✅ Archivos de configuración listos
- ⏳ **FALTA:** Agregar credenciales (DSN)

## 🚀 Cuándo Hacerlo
**Después de hacer deploy a Vercel**, cuando quieras monitorear errores en producción.

## 📝 Pasos Rápidos (5 minutos)

### 1. Crear Cuenta en Sentry
```
1. Ve a: https://sentry.io
2. Click en "Start Free"
3. Regístrate con GitHub o email
4. Es GRATIS para proyectos pequeños
```

### 2. Crear Proyecto
```
1. En Sentry dashboard, click "Create Project"
2. Platform: Next.js
3. Project name: food-orders-crm
4. Click "Create Project"
```

### 3. Obtener DSN
```
Después de crear el proyecto, verás algo como:

DSN: https://abc123@o456789.ingest.sentry.io/012345

Cópialo!
```

### 4. Agregar a Vercel
```
1. Ve a: vercel.com/dashboard
2. Tu proyecto → Settings → Environment Variables
3. Agregar estas 4 variables:

   NEXT_PUBLIC_SENTRY_DSN=https://abc123@o456789.ingest.sentry.io/012345
   SENTRY_ORG=tu-organizacion
   SENTRY_PROJECT=food-orders-crm
   SENTRY_AUTH_TOKEN=(generar en Sentry → User Settings → Auth Tokens)
```

### 5. Re-deploy
```bash
vercel --prod
```

### 6. Probar
```
1. Ve a tu app en producción
2. Genera un error intencional (o espera errores reales)
3. Ve a sentry.io → Issues
4. Verás todos los errores con detalles completos!
```

## 📚 Documentación Completa
Lee `SENTRY_SETUP.md` para instrucciones paso a paso con screenshots.

## ⚡ Beneficios Cuando lo Configures
- 🐛 Ver todos los errores que ocurren en producción
- 👤 Saber qué usuario tuvo el error
- 📍 Línea exacta del código con el problema
- 📊 Frecuencia de cada error
- 🎬 Session replay (reproducir lo que hizo el usuario)
- 📧 Alertas por email cuando hay errores críticos

## 💡 Tip
No es urgente hacerlo AHORA. Puedes:
1. Primero deployar a Vercel
2. Probar que todo funcione
3. Luego configurar Sentry cuando quieras monitoreo avanzado

---

**Archivos relacionados:**
- `sentry.client.config.ts` - Ya configurado ✅
- `sentry.server.config.ts` - Ya configurado ✅
- `sentry.edge.config.ts` - Ya configurado ✅
- `next.config.js` - Ya tiene wrapper de Sentry ✅
- `SENTRY_SETUP.md` - Guía completa detallada

**Tiempo estimado de configuración:** 5-10 minutos

---

*Recordatorio creado: Octubre 30, 2025*
