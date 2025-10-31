# Configuración de Backups de Vercel Postgres

Esta guía te ayudará a configurar backups automáticos para tu base de datos PostgreSQL en Vercel.

## 📋 Prerrequisitos

- Tener un proyecto desplegado en Vercel
- Tener Vercel Postgres configurado en tu proyecto
- Acceso al dashboard de Vercel

## 🚀 Pasos para Configurar Backups

### 1. Acceder a Vercel Dashboard

1. Ve a [vercel.com](https://vercel.com)
2. Inicia sesión con tu cuenta
3. Selecciona tu proyecto "food-orders-crm"

### 2. Ir a Storage (Postgres)

1. En el menú lateral, haz clic en **"Storage"**
2. Verás tu base de datos Postgres listada
3. Haz clic en el nombre de tu base de datos

### 3. Activar Backups Automáticos

#### Opción A: Plan Pro (Recomendado para Producción)

Si estás en el plan **Vercel Pro** ($20/mes):

1. Ve a la pestaña **"Backups"**
2. Haz clic en **"Enable Automatic Backups"**
3. Configuraciones recomendadas:
   ```
   - Frecuencia: Diaria (Daily)
   - Hora: 2:00 AM (hora del servidor)
   - Retención: 30 días
   - Point-in-Time Recovery: Habilitado
   ```

#### Opción B: Plan Hobby (Gratuito)

Si estás en el plan **Hobby** (gratis):

1. Los backups automáticos **NO están disponibles**
2. Opciones alternativas:
   - **Upgrade a Pro** para obtener backups automáticos
   - **Backups manuales** (ver sección abajo)
   - **Script de backup** con GitHub Actions (ver sección abajo)

### 4. Configurar Point-in-Time Recovery (PITR)

**Solo disponible en Plan Pro**

1. En la pestaña "Backups", activa **"Point-in-Time Recovery"**
2. Esto permite restaurar tu base de datos a cualquier momento específico
3. Retención de logs: 7-30 días (según configuración)

### 5. Verificar Backups

1. En la pestaña "Backups", verás una lista de backups recientes
2. Cada backup muestra:
   - Fecha y hora
   - Tamaño
   - Estado (Completed/Failed)
   - Opción de restaurar

## 🔧 Backups Manuales (Plan Hobby)

### Opción 1: Backup Manual desde Vercel

1. Ve a tu base de datos en Vercel Storage
2. Pestaña **"Data"**
3. Haz clic en **"Export Data"**
4. Descarga el archivo SQL

### Opción 2: Script de Backup Automatizado

Crea un script para hacer backups con GitHub Actions:

**Archivo: `.github/workflows/database-backup.yml`**

```yaml
name: Database Backup

on:
  schedule:
    # Ejecutar todos los días a las 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Permite ejecutar manualmente

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup PostgreSQL Client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client

      - name: Create Backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          # Crear directorio de backups
          mkdir -p backups
          
          # Generar nombre con fecha
          BACKUP_FILE="backups/backup-$(date +%Y%m%d-%H%M%S).sql"
          
          # Hacer backup
          pg_dump $DATABASE_URL > $BACKUP_FILE
          
          # Comprimir
          gzip $BACKUP_FILE
          
          echo "Backup creado: $BACKUP_FILE.gz"

      - name: Upload to GitHub Artifacts
        uses: actions/upload-artifact@v3
        with:
          name: database-backup
          path: backups/*.gz
          retention-days: 30

      - name: Upload to S3 (Opcional)
        # Si quieres guardar en AWS S3
        # uses: aws-actions/configure-aws-credentials@v2
        # ...
```

**Agregar SECRET en GitHub:**

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Clic en **"New repository secret"**
4. Nombre: `DATABASE_URL`
5. Valor: Tu connection string de Vercel Postgres

## 📦 Restaurar un Backup

### Desde Vercel Dashboard (Plan Pro)

1. Ve a Storage → Tu base de datos → Backups
2. Encuentra el backup que quieres restaurar
3. Haz clic en **"Restore"**
4. Confirma la acción
5. **ADVERTENCIA**: Esto sobrescribirá todos los datos actuales

### Desde Archivo SQL Manual

```bash
# 1. Descargar el backup
# 2. Restaurar localmente primero (RECOMENDADO)
psql $DATABASE_URL_LOCAL < backup.sql

# 3. Si todo está bien, restaurar en producción
psql $DATABASE_URL_PRODUCTION < backup.sql
```

## 🔐 Mejores Prácticas

### 1. Múltiples Destinos de Backup

No dependas solo de Vercel. Guarda backups en:
- ✅ Vercel (automático con Plan Pro)
- ✅ GitHub Artifacts (con GitHub Actions)
- ✅ AWS S3 o Google Cloud Storage
- ✅ Backup local mensual

### 2. Probar Restauraciones

```bash
# Al menos una vez al mes, prueba restaurar un backup
# en un ambiente de staging o local
```

### 3. Retención Recomendada

- **Diarios**: 7 días
- **Semanales**: 4 semanas
- **Mensuales**: 12 meses
- **Anuales**: 7 años (si aplica por regulaciones)

### 4. Monitoreo

Configura alertas si:
- Un backup falla
- El tamaño del backup cambia drásticamente (>50%)
- No se ha creado un backup en 24 horas

## 🚨 Plan de Recuperación ante Desastres

### Escenario 1: Corrupción de Datos

1. Identificar cuándo ocurrió la corrupción
2. Restaurar backup más reciente **antes** de la corrupción
3. Si tienes PITR, restaurar al momento exacto

### Escenario 2: Borrado Accidental

1. **NO HAGAS NADA MÁS** en la base de datos
2. Restaurar backup inmediatamente
3. Implementar protecciones adicionales (ej: soft deletes)

### Escenario 3: Migración Fallida

1. Tener backup **antes** de empezar la migración
2. Si falla, revertir a backup anterior
3. Corregir migración
4. Reintentar en staging primero

## 📊 Monitoreo de Espacio

```sql
-- Ver tamaño de la base de datos
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as size;

-- Ver tamaño por tabla
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

## 🔗 Enlaces Útiles

- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [Vercel Pro Pricing](https://vercel.com/pricing)

## ⚡ Resumen Rápido

| Acción | Plan Hobby | Plan Pro |
|--------|------------|----------|
| Backups Automáticos | ❌ No | ✅ Sí |
| Point-in-Time Recovery | ❌ No | ✅ Sí |
| Retención Configurable | ❌ No | ✅ Sí (7-30 días) |
| Backups Manuales | ✅ Sí | ✅ Sí |
| GitHub Actions Backup | ✅ Sí | ✅ Sí |
| Costo | Gratis | $20/mes |

## 🎯 Recomendación

**Para producción**: Upgrade a Vercel Pro para obtener:
- Backups automáticos diarios
- Point-in-Time Recovery
- Mayor performance y límites
- Soporte prioritario

**Para desarrollo**: Plan Hobby con GitHub Actions para backups automáticos es suficiente.

## ✅ Checklist de Configuración

- [ ] Verificar que Vercel Postgres está configurado
- [ ] Decidir plan (Hobby vs Pro)
- [ ] Si Pro: Activar backups automáticos en dashboard
- [ ] Si Hobby: Configurar GitHub Actions para backups
- [ ] Agregar `DATABASE_URL` a GitHub Secrets
- [ ] Probar backup manual
- [ ] Probar restauración en ambiente local/staging
- [ ] Documentar procedimiento de recuperación
- [ ] Configurar alertas de monitoreo
- [ ] Calendario de revisión mensual de backups

---

**Última actualización**: Octubre 2025
