# Configuración de Cron Job para Órdenes Recurrentes

## 📋 Archivo creado

**Ruta:** `app/api/cron/execute-recurring-orders/route.ts`

Este endpoint ejecuta todas las órdenes recurrentes que tengan fecha de ejecución vencida.

---

## 🔐 Configuración de Seguridad

### 1. Variable de entorno requerida

Agrega a tu archivo `.env`:

```env
CRON_SECRET=tu_clave_secreta_aqui_genera_una_aleatoria
```

**Genera una clave segura:**
```bash
# En PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

---

## ⚙️ Configuración en Vercel

### Opción 1: Vercel Cron Jobs (Recomendado)

1. **Crea el archivo `vercel.json` en la raíz del proyecto:**

```json
{
  "crons": [
    {
      "path": "/api/cron/execute-recurring-orders",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

**Programación:** Cada 6 horas

2. **Agrega `CRON_SECRET` en Vercel:**
   - Ve a tu proyecto en Vercel
   - Settings → Environment Variables
   - Agrega `CRON_SECRET` con el valor generado

3. **Despliega tu app:**
```bash
git add .
git commit -m "Add recurring orders cron job"
git push origin main
```

### Opción 2: Servicio Externo (cron-job.org)

1. **Regístrate en:** https://cron-job.org
2. **Crea un nuevo cron job:**
   - URL: `https://tu-app.vercel.app/api/cron/execute-recurring-orders`
   - Schedule: `0 */6 * * *` (cada 6 horas)
   - Headers:
     - `Authorization: Bearer tu_CRON_SECRET_aqui`

---

## 🧪 Prueba Local

```bash
# En PowerShell
$headers = @{
    "Authorization" = "Bearer tu_CRON_SECRET_aqui"
}

Invoke-RestMethod -Uri "http://localhost:3000/api/cron/execute-recurring-orders" -Headers $headers -Method GET
```

---

## 📊 Respuesta del Endpoint

### Éxito:
```json
{
  "success": true,
  "timestamp": "2025-10-23T10:30:00.000Z",
  "executed": 5,
  "successful": 4,
  "failed": 1,
  "results": [
    {
      "id": "uuid",
      "name": "Orden Semanal - Verduras",
      "orderId": "uuid",
      "orderNumber": "REC-1729684200ABC",
      "success": true,
      "nextExecution": "2025-10-30T10:30:00.000Z"
    },
    {
      "id": "uuid",
      "name": "Orden Mensual - Frutas",
      "success": false,
      "error": "El cliente no tiene vendedor asignado"
    }
  ]
}
```

---

## 🎯 Qué hace el Cron Job

1. **Busca órdenes recurrentes** que:
   - Están activas (`isActive: true`)
   - Su `nextExecutionDate` ya pasó
   - No han expirado (si tienen `endDate`)

2. **Por cada orden encontrada:**
   - ✅ Crea una orden normal con prefijo `REC-`
   - ✅ Copia todos los items de la orden recurrente
   - ✅ Registra la ejecución en `RecurringOrderExecution`
   - ✅ Calcula la próxima fecha según la frecuencia
   - ✅ Actualiza `nextExecutionDate` y contador

3. **Si hay errores:**
   - ❌ Crea orden con estado `CANCELED`
   - ❌ Registra el error en la ejecución
   - ❌ Continúa con las siguientes órdenes

---

## 📅 Frecuencias Soportadas

| Frecuencia | Descripción | Campo requerido |
|-----------|-------------|-----------------|
| `DAILY` | Diaria | - |
| `WEEKLY` | Semanal | `dayOfWeek` (0-6) |
| `BIWEEKLY` | Quincenal | - |
| `MONTHLY` | Mensual | `dayOfMonth` (1-31) |
| `CUSTOM` | Personalizada | `customDays` (número) |

---

## 🔍 Logs

El cron job genera logs útiles:

```
[CRON] Ejecutando cron job de órdenes recurrentes: 2025-10-23T10:30:00.000Z
[CRON] Encontradas 3 órdenes para ejecutar
[CRON] ✅ Orden creada: REC-1729684200ABC para Cliente XYZ
[CRON] ❌ Error al procesar Orden Semanal: El cliente no tiene vendedor asignado
[CRON] Finalizado. 2/3 exitosas
```

---

## 🚀 Próximos Pasos

1. **Detén la app**
2. **Ejecuta:** `npx prisma generate`
3. **Aplica migración SQL:** Copia el contenido de `database/recurring-orders-migration.sql`
4. **Reinicia la app**
5. **Configura el cron job en Vercel**
6. **Prueba creando una orden recurrente**

---

## 📋 Sistema Completo de Órdenes Recurrentes

### API Endpoints:
- ✅ POST `/api/recurring-orders` - Crear
- ✅ GET `/api/recurring-orders` - Listar
- ✅ GET `/api/recurring-orders/[id]` - Obtener
- ✅ PATCH `/api/recurring-orders/[id]` - Actualizar
- ✅ DELETE `/api/recurring-orders/[id]` - Eliminar
- ✅ PATCH `/api/recurring-orders/[id]/toggle` - Activar/Pausar
- ✅ GET `/api/cron/execute-recurring-orders` - Ejecutar (Cron)

### Base de Datos:
- ✅ Schema actualizado
- ✅ Migración SQL lista
- ✅ Relaciones configuradas

---

¡Todo listo para órdenes recurrentes automáticas! 🎉
