# 🚀 Guía Rápida: Aplicar Migración de Órdenes Recurrentes

## ⚠️ IMPORTANTE: Detén la aplicación primero

Los **15 errores** que estás viendo son NORMALES. Aparecen porque los modelos `RecurringOrder`, `RecurringOrderItem` y `RecurringOrderExecution` aún no existen en tu base de datos.

---

## 🔧 Solución Rápida

### Opción 1: Script Automático (Recomendado)

1. **Detén la aplicación** (Ctrl+C en el terminal de la app)

2. **Ejecuta el script:**
   ```powershell
   .\apply-recurring-orders-migration.ps1
   ```

3. **Sigue las instrucciones** (te pedirá credenciales de PostgreSQL)

4. **Reinicia la app:**
   ```powershell
   .\start-crm.ps1
   ```

---

### Opción 2: Manual

1. **Detén la aplicación**

2. **Abre PostgreSQL:**
   ```powershell
   psql -U postgres -d food_orders_crm
   ```

3. **Copia y pega el contenido de:**
   `database/recurring-orders-migration.sql`

4. **Ejecuta en PowerShell:**
   ```powershell
   npx prisma generate
   ```

5. **Reinicia la app:**
   ```powershell
   .\start-crm.ps1
   ```

---

## ✅ Resultado Esperado

Después de aplicar la migración:

- ❌ 15 errores → ✅ 0 errores
- ✅ 3 nuevas tablas creadas en PostgreSQL:
  - `recurring_orders`
  - `recurring_order_items`
  - `recurring_order_executions`
- ✅ 7 endpoints funcionales para órdenes recurrentes
- ✅ Sistema de cron job listo

---

## 🎯 Por qué los errores

TypeScript muestra errores porque `prisma.recurringOrder` no existe en el cliente generado. 

Una vez que:
1. Crees las tablas en PostgreSQL (con el SQL)
2. Regeneres Prisma (`npx prisma generate`)

El cliente de Prisma sabrá que existen esas tablas y los errores desaparecerán.

---

## 📋 Archivos creados listos para usar

### API (7 endpoints):
- ✅ `POST /api/recurring-orders` - Crear
- ✅ `GET /api/recurring-orders` - Listar todas
- ✅ `GET /api/recurring-orders/[id]` - Ver una
- ✅ `PATCH /api/recurring-orders/[id]` - Actualizar
- ✅ `DELETE /api/recurring-orders/[id]` - Eliminar
- ✅ `PATCH /api/recurring-orders/[id]/toggle` - Activar/Pausar
- ✅ `GET /api/cron/execute-recurring-orders` - Ejecutar (Cron)

### Base de datos:
- ✅ Schema Prisma actualizado
- ✅ SQL de migración listo

### Scripts:
- ✅ `apply-recurring-orders-migration.ps1` - Aplicar migración automáticamente
- ✅ `database/recurring-orders-migration.sql` - SQL manual

---

## 🆘 Si algo sale mal

### Error: "psql no se reconoce como comando"
PostgreSQL no está en el PATH. Usa la ruta completa:
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d food_orders_crm
```

### Error: "password authentication failed"
Verifica tu contraseña de PostgreSQL.

### Los errores persisten después de aplicar
1. Asegúrate de haber detenido la app
2. Ejecuta: `npx prisma generate`
3. Reinicia VSCode
4. Reinicia la app

---

¿Listo para aplicar la migración? 🚀
