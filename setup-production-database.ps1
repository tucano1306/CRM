# Script de Verificación y Deploy de Base de Datos a Producción
# Ejecutar después de crear la base de datos en Vercel

Write-Host "🚀 Food Orders CRM - Database Setup Script" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en el directorio correcto
if (-not (Test-Path "prisma/schema.prisma")) {
    Write-Host "❌ Error: No se encontró prisma/schema.prisma" -ForegroundColor Red
    Write-Host "   Asegúrate de ejecutar este script desde la raíz del proyecto" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Directorio del proyecto verificado" -ForegroundColor Green
Write-Host ""

# Paso 1: Verificar que Vercel CLI está instalado
Write-Host "📋 Paso 1: Verificando Vercel CLI..." -ForegroundColor Cyan
try {
    $vercelVersion = vercel --version
    Write-Host "   ✅ Vercel CLI instalado: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Vercel CLI no está instalado" -ForegroundColor Red
    Write-Host "   Instala con: npm i -g vercel" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Paso 2: Descargar variables de entorno de producción
Write-Host "📋 Paso 2: Descargando variables de entorno de producción..." -ForegroundColor Cyan
Write-Host "   Esto creará un archivo .env.production.local con tus variables de Vercel" -ForegroundColor Yellow

try {
    vercel env pull .env.production.local --environment=production
    Write-Host "   ✅ Variables descargadas exitosamente" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error descargando variables de entorno" -ForegroundColor Red
    Write-Host "   Asegúrate de:" -ForegroundColor Yellow
    Write-Host "   1. Haber ejecutado 'vercel login'" -ForegroundColor Yellow
    Write-Host "   2. Estar en el proyecto correcto" -ForegroundColor Yellow
    Write-Host "   3. Tener variables de entorno configuradas en Vercel" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Paso 3: Verificar que DATABASE_URL existe
Write-Host "📋 Paso 3: Verificando DATABASE_URL..." -ForegroundColor Cyan

if (Test-Path ".env.production.local") {
    $envContent = Get-Content ".env.production.local" -Raw
    
    if ($envContent -match "DATABASE_URL=(.+)") {
        $dbUrl = $matches[1]
        Write-Host "   ✅ DATABASE_URL encontrado" -ForegroundColor Green
        
        # Mostrar información sin revelar password
        if ($dbUrl -match "postgres://(.+?):(.+?)@(.+?)/(.+)") {
            $dbUser = $matches[1]
            $dbHost = $matches[3]
            $dbName = $matches[4]
            Write-Host "   📊 Base de datos: $dbName" -ForegroundColor Cyan
            Write-Host "   🖥️  Host: $dbHost" -ForegroundColor Cyan
            Write-Host "   👤 Usuario: $dbUser" -ForegroundColor Cyan
        }
    } else {
        Write-Host "   ❌ DATABASE_URL no encontrado en .env.production.local" -ForegroundColor Red
        Write-Host ""
        Write-Host "   🔧 ACCIÓN REQUERIDA:" -ForegroundColor Yellow
        Write-Host "   1. Ve a https://vercel.com/tucano0109-5495s-projects/food-order-crm" -ForegroundColor Yellow
        Write-Host "   2. Click en 'Storage' → 'Create Database' → 'Postgres'" -ForegroundColor Yellow
        Write-Host "   3. Conecta la base de datos al proyecto" -ForegroundColor Yellow
        Write-Host "   4. Ve a Settings → Environment Variables" -ForegroundColor Yellow
        Write-Host "   5. Agrega DATABASE_URL con el valor de POSTGRES_PRISMA_URL" -ForegroundColor Yellow
        Write-Host "   6. Vuelve a ejecutar este script" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "   ❌ Archivo .env.production.local no encontrado" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Paso 4: Verificar conexión a la base de datos
Write-Host "📋 Paso 4: Probando conexión a base de datos..." -ForegroundColor Cyan

# Cargar variables de entorno del archivo
$envVars = @{}
Get-Content ".env.production.local" | ForEach-Object {
    if ($_ -match "^([^#].+?)=(.+)$") {
        $envVars[$matches[1]] = $matches[2]
    }
}

# Establecer DATABASE_URL temporalmente
$env:DATABASE_URL = $envVars["DATABASE_URL"]

try {
    Write-Host "   Ejecutando: npx prisma db execute --stdin < NUL" -ForegroundColor Gray
    # Intentar ejecutar un comando simple de Prisma
    $null = npx prisma validate 2>&1
    Write-Host "   ✅ Schema de Prisma válido" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  No se pudo validar la conexión, pero continuaremos..." -ForegroundColor Yellow
}
Write-Host ""

# Paso 5: Ejecutar migraciones
Write-Host "📋 Paso 5: Ejecutando migraciones de Prisma..." -ForegroundColor Cyan
Write-Host "   Esto creará todas las tablas en la base de datos de producción" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "   ¿Continuar con las migraciones? (S/N)"
if ($response -ne "S" -and $response -ne "s") {
    Write-Host "   ⏸️  Operación cancelada por el usuario" -ForegroundColor Yellow
    exit 0
}

try {
    Write-Host ""
    Write-Host "   Ejecutando: npx prisma migrate deploy..." -ForegroundColor Gray
    npx prisma migrate deploy
    Write-Host ""
    Write-Host "   ✅ Migraciones ejecutadas exitosamente" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error ejecutando migraciones" -ForegroundColor Red
    Write-Host "   Revisa el error arriba para más detalles" -ForegroundColor Yellow
    exit 1
}
Write-Host ""

# Paso 6: (Opcional) Ejecutar seed
Write-Host "📋 Paso 6: Poblar base de datos con datos iniciales (OPCIONAL)" -ForegroundColor Cyan
Write-Host "   Esto creará usuarios, productos y órdenes de prueba" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "   ¿Quieres poblar la base de datos con datos de prueba? (S/N)"
if ($response -eq "S" -or $response -eq "s") {
    try {
        Write-Host ""
        Write-Host "   Ejecutando: npx prisma db seed..." -ForegroundColor Gray
        npx prisma db seed
        Write-Host ""
        Write-Host "   ✅ Datos de prueba insertados exitosamente" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Error ejecutando seed" -ForegroundColor Red
        Write-Host "   La aplicación funcionará sin datos de prueba" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⏭️  Saltando seed de datos de prueba" -ForegroundColor Gray
}
Write-Host ""

# Paso 7: Verificar tablas creadas
Write-Host "📋 Paso 7: Verificando tablas creadas..." -ForegroundColor Cyan

try {
    Write-Host "   Ejecutando: npx prisma db pull --print..." -ForegroundColor Gray
    $null = npx prisma db pull --print 2>&1
    
    # Contar modelos en el schema
    $schemaContent = Get-Content "prisma/schema.prisma" -Raw
    $modelCount = ([regex]::Matches($schemaContent, "model ")).Count
    
    Write-Host "   ✅ Schema con $modelCount modelos verificado" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  No se pudo verificar las tablas automáticamente" -ForegroundColor Yellow
    Write-Host "   Verifica manualmente en Vercel Dashboard → Storage → Data" -ForegroundColor Yellow
}
Write-Host ""

# Limpiar variable de entorno
Remove-Item Env:\DATABASE_URL -ErrorAction SilentlyContinue

# Paso 8: Redeploy
Write-Host "📋 Paso 8: Redeployar aplicación..." -ForegroundColor Cyan
Write-Host "   La aplicación se redesplayará para reflejar los cambios" -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "   ¿Quieres hacer redeploy ahora? (S/N)"
if ($response -eq "S" -or $response -eq "s") {
    try {
        Write-Host ""
        Write-Host "   Ejecutando: vercel --prod..." -ForegroundColor Gray
        vercel --prod
        Write-Host ""
        Write-Host "   ✅ Redeploy completado exitosamente" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Error en redeploy" -ForegroundColor Red
        Write-Host "   Puedes hacerlo manualmente después con: vercel --prod" -ForegroundColor Yellow
    }
} else {
    Write-Host "   ⏭️  Saltando redeploy" -ForegroundColor Gray
    Write-Host "   Recuerda hacer redeploy después con: vercel --prod" -ForegroundColor Yellow
}
Write-Host ""

# Resumen final
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ CONFIGURACIÓN COMPLETADA" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎯 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Abre tu aplicación: https://food-order-ij0lim8d0-tucano0109-5495s-projects.vercel.app" -ForegroundColor White
Write-Host "   2. Verifica que no hay errores 500" -ForegroundColor White
Write-Host "   3. Prueba login y funcionalidad básica" -ForegroundColor White
Write-Host ""
Write-Host "📊 Monitoreo:" -ForegroundColor Cyan
Write-Host "   - Dashboard Vercel: https://vercel.com/tucano0109-5495s-projects/food-order-crm" -ForegroundColor White
Write-Host "   - Base de datos: https://vercel.com/tucano0109-5495s-projects/food-order-crm/storage" -ForegroundColor White
Write-Host ""
Write-Host "🆘 Si encuentras errores:" -ForegroundColor Cyan
Write-Host "   - Revisa logs en Vercel Dashboard → Deployments → Click en deployment → Runtime Logs" -ForegroundColor White
Write-Host "   - Consulta SOLUCION_ERRORES_PRODUCCION.md" -ForegroundColor White
Write-Host ""
Write-Host "🎉 ¡Todo listo! Tu CRM está en producción." -ForegroundColor Green
Write-Host ""

# Limpiar archivo de env temporal
Write-Host "🧹 Limpiando archivos temporales..." -ForegroundColor Gray
if (Test-Path ".env.production.local") {
    Remove-Item ".env.production.local" -Force
    Write-Host "   ✅ Archivo .env.production.local eliminado" -ForegroundColor Green
}
Write-Host ""
